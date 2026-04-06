import {
  Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SpeedConfig, TipoZona } from '../../entities/speed-config.entity';
import { Trip, TripStatus }      from '../../entities/trip.entity';
import { User, UserRole }        from '../../entities/user.entity';

import { CreateSpeedConfigDto } from './dto/create-speed-config.dto';
import { UpdateSpeedConfigDto } from './dto/update-speed-config.dto';

/** Configuración por defecto cuando no hay ninguna registrada */
export const DEFAULT_SPEED_CONFIG = {
  velocidad_alerta_kmh:     70,
  velocidad_maxima_kmh:     80,
  velocidad_critica_kmh:   100,
  tolerancia_kmh:            5,
  duracion_minima_segundos: 10,
  tipo_zona: TipoZona.GENERAL,
} as const;

@Injectable()
export class SpeedService {
  private readonly logger = new Logger(SpeedService.name);

  constructor(
    @InjectRepository(SpeedConfig) private readonly configRepo: Repository<SpeedConfig>,
    @InjectRepository(Trip)        private readonly tripRepo:   Repository<Trip>,
  ) {}

  // ── CRUD (solo ADMIN_MUNICIPAL) ──────────────────────────────────────────────

  async create(dto: CreateSpeedConfigDto, user: User): Promise<SpeedConfig> {
    if (dto.velocidad_alerta_kmh >= dto.velocidad_maxima_kmh) {
      throw new BadRequestException('velocidad_alerta_kmh debe ser menor que velocidad_maxima_kmh');
    }
    if (dto.velocidad_maxima_kmh >= dto.velocidad_critica_kmh) {
      throw new BadRequestException('velocidad_maxima_kmh debe ser menor que velocidad_critica_kmh');
    }

    const config = this.configRepo.create({
      ...dto,
      municipality_id:          user.municipality_id,
      created_by:               user.id,
      tolerancia_kmh:           dto.tolerancia_kmh          ?? 5,
      duracion_minima_segundos: dto.duracion_minima_segundos ?? 10,
      tipo_zona:                dto.tipo_zona               ?? TipoZona.GENERAL,
    });

    return this.configRepo.save(config);
  }

  async findAll(municipalityId: string): Promise<SpeedConfig[]> {
    return this.configRepo.find({
      where: { municipality_id: municipalityId },
      relations: ['route'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, municipalityId: string): Promise<SpeedConfig> {
    const config = await this.configRepo.findOne({
      where: { id },
      relations: ['route'],
    });
    if (!config) throw new NotFoundException(`Configuración ${id} no encontrada`);
    if (config.municipality_id !== municipalityId) throw new ForbiddenException();
    return config;
  }

  async update(id: string, dto: UpdateSpeedConfigDto, user: User): Promise<SpeedConfig> {
    const config = await this.findOne(id, user.municipality_id);

    const next = {
      velocidad_alerta_kmh:    dto.velocidad_alerta_kmh    ?? config.velocidad_alerta_kmh,
      velocidad_maxima_kmh:    dto.velocidad_maxima_kmh    ?? config.velocidad_maxima_kmh,
      velocidad_critica_kmh:   dto.velocidad_critica_kmh   ?? config.velocidad_critica_kmh,
    };

    if (next.velocidad_alerta_kmh >= next.velocidad_maxima_kmh) {
      throw new BadRequestException('velocidad_alerta_kmh debe ser menor que velocidad_maxima_kmh');
    }
    if (next.velocidad_maxima_kmh >= next.velocidad_critica_kmh) {
      throw new BadRequestException('velocidad_maxima_kmh debe ser menor que velocidad_critica_kmh');
    }

    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  async deactivate(id: string, user: User): Promise<SpeedConfig> {
    const config = await this.findOne(id, user.municipality_id);
    config.activo = false;
    return this.configRepo.save(config);
  }

  // ── CONSULTAS ────────────────────────────────────────────────────────────────

  /** Obtiene la configuración de velocidad activa para una ruta específica */
  async getForRoute(routeId: string, municipalityId: string): Promise<SpeedConfig | null> {
    const specific = await this.configRepo.findOne({
      where: { route_id: routeId, municipality_id: municipalityId, activo: true },
    });
    if (specific) return specific;

    const general = await this.configRepo.findOne({
      where: { route_id: null as any, municipality_id: municipalityId, activo: true },
    });
    return general;
  }

  /** Obtiene la configuración aplicable para un viaje activo */
  async getForTrip(tripId: string): Promise<SpeedConfig | typeof DEFAULT_SPEED_CONFIG> {
    const trip = await this.tripRepo.findOne({
      where: { id: tripId },
    });
    if (!trip) {
      this.logger.warn(`getForTrip: viaje ${tripId} no encontrado, usando defaults`);
      return DEFAULT_SPEED_CONFIG;
    }

    const config = await this.getForRoute(trip.route_id, trip.municipality_id);
    if (!config) {
      this.logger.log(`getForTrip: sin config para ruta ${trip.route_id}, usando defaults`);
      return DEFAULT_SPEED_CONFIG;
    }

    return config;
  }
}
