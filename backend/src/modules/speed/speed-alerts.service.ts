import {
  Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';

import { SpeedAlert, SpeedAlertSeverity, SpeedAlertStatus } from '../../entities/speed-alert.entity';
import { Trip, TripStatus }   from '../../entities/trip.entity';
import { TripDriver, TripDriverRole } from '../../entities/trip-driver.entity';
import { Vehicle }             from '../../entities/vehicle.entity';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

import { SpeedService }        from './speed.service';
import { ReportSpeedDto, PingPositionDto } from './dto/report-speed.dto';
import { ResolveAlertDto }     from './dto/resolve-alert.dto';

import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType }     from '../notifications/dto/create-notification.dto';
import { NotificationChannel }  from '../../entities/notification.entity';

export type SpeedStatus = 'NORMAL' | 'ADVERTENCIA' | 'EXCESO' | 'CRITICO';

@Injectable()
export class SpeedAlertsService {
  private readonly logger = new Logger(SpeedAlertsService.name);

  constructor(
    @InjectRepository(SpeedAlert)  private readonly alertRepo:      Repository<SpeedAlert>,
    @InjectRepository(Trip)        private readonly tripRepo:        Repository<Trip>,
    @InjectRepository(TripDriver)  private readonly tripDriverRepo:  Repository<TripDriver>,
    @InjectRepository(Vehicle)     private readonly vehicleRepo:     Repository<Vehicle>,
    @InjectRepository(User)        private readonly userRepo:        Repository<User>,
    private readonly speedService:  SpeedService,
    private readonly notifications: NotificationsService,
    private readonly gateway:       NotificationsGateway,
  ) {}

  // ── RECIBIR REPORTE DEL CIUDADANO ────────────────────────────────────────────

  async reportSpeed(
    dto: ReportSpeedDto,
    citizenId: string,
  ): Promise<{ alert_created: boolean; alert?: SpeedAlert; current_status: SpeedStatus }> {
    // 1. Validar viaje activo
    const trip = await this.tripRepo.findOne({
      where: { id: dto.trip_id, status: TripStatus.EN_CURSO },
      relations: ['vehicle', 'vehicle.company', 'route'],
    });
    if (!trip) {
      throw new BadRequestException('Viaje no encontrado o no está en curso');
    }

    // 2. Obtener configuración de velocidad
    const config = await this.speedService.getForTrip(dto.trip_id);

    const vel       = Number(dto.velocidad_kmh);
    const limiteEfectivo = config.velocidad_maxima_kmh + config.tolerancia_kmh;

    // 3. Determinar estado
    let status: SpeedStatus = 'NORMAL';
    if (vel >= config.velocidad_critica_kmh) {
      status = 'CRITICO';
    } else if (vel > limiteEfectivo) {
      status = 'EXCESO';
    } else if (vel > config.velocidad_alerta_kmh) {
      status = 'ADVERTENCIA';
    }

    // 4. Si no es exceso real → responder rápido (no crear alerta)
    if (status !== 'EXCESO' && status !== 'CRITICO') {
      // Broadcast de posición para tracking en vivo
      this.gateway.emitVehiclePosition(trip.municipality_id, {
        trip_id:      trip.id,
        vehicle_plate: trip.vehicle?.plate,
        lat:          dto.latitud,
        lng:          dto.longitud,
        speed_kmh:    vel,
        municipality_id: trip.municipality_id,
      });
      return { alert_created: false, current_status: status };
    }

    // 5. Verificar duración mínima del exceso
    if (dto.duracion_exceso_segundos < config.duracion_minima_segundos) {
      return { alert_created: false, current_status: status };
    }

    // 6. Calcular severidad
    const exceso = Math.max(0, Math.round(vel - config.velocidad_maxima_kmh));
    let severidad: SpeedAlertSeverity;
    if (vel >= config.velocidad_critica_kmh) {
      severidad = SpeedAlertSeverity.CRITICO;
    } else if (exceso > 20) {
      severidad = SpeedAlertSeverity.GRAVE;
    } else if (exceso > 10) {
      severidad = SpeedAlertSeverity.MODERADO;
    } else {
      severidad = SpeedAlertSeverity.ADVERTENCIA;
    }

    // 7. Obtener conductor principal del viaje
    const tripDriver = await this.tripDriverRepo.findOne({
      where: { trip_id: trip.id, role: TripDriverRole.PRINCIPAL },
    });

    // 8. Crear alerta en BD
    const alert = await this.alertRepo.save(
      this.alertRepo.create({
        trip_id:                       trip.id,
        vehicle_id:                    trip.vehicle_id,
        driver_id:                     tripDriver?.driver_id ?? null,
        reported_by:                   citizenId,
        municipality_id:               trip.municipality_id,
        velocidad_detectada_kmh:       vel,
        velocidad_limite_kmh:          config.velocidad_maxima_kmh,
        exceso_kmh:                    exceso,
        duracion_exceso_segundos:      dto.duracion_exceso_segundos,
        velocidad_maxima_registrada_kmh: dto.velocidad_maxima_kmh ?? vel,
        latitud:                       dto.latitud,
        longitud:                      dto.longitud,
        ubicacion_descripcion:         dto.ubicacion_descripcion ?? null,
        severidad,
        gps_trail:                     dto.gps_trail ?? null,
        estado:                        SpeedAlertStatus.ACTIVA,
      }),
    );

    // 9. Emitir por WebSocket a todos en la municipalidad
    const wsPayload = {
      alert_id:       alert.id,
      vehicle_plate:  trip.vehicle?.plate,
      speed_kmh:      vel,
      limit_kmh:      config.velocidad_maxima_kmh,
      excess_kmh:     exceso,
      severidad,
      lat:            dto.latitud,
      lng:            dto.longitud,
      municipality_id: trip.municipality_id,
      company_id:     trip.vehicle?.company_id,
      timestamp:      new Date().toISOString(),
    };
    this.gateway.emitSpeedAlert(trip.municipality_id, trip.vehicle?.company_id, wsPayload);

    // 10. Notificaciones WEB + WhatsApp a fiscales y admins
    this.notifyRoles(
      [UserRole.FISCAL, UserRole.ADMIN_MUNICIPAL],
      trip.municipality_id,
      null,
      {
        title:   `Exceso de velocidad — ${trip.vehicle?.plate ?? 'Vehículo'}`,
        content: `Vehículo ${trip.vehicle?.plate} registró ${vel.toFixed(0)} km/h (límite: ${config.velocidad_maxima_kmh} km/h) en ruta ${trip.route?.origin}→${trip.route?.destination}. Exceso: +${exceso} km/h. Severidad: ${severidad}.`,
        priority: severidad === SpeedAlertSeverity.CRITICO ? 'ALTA' : 'MEDIA',
        metadata: wsPayload,
      },
    ).catch(e => this.logger.error('Error notificando fiscales:', e));

    // 11. Notificaciones a operadores de la empresa
    if (trip.vehicle?.company_id) {
      this.notifyRoles(
        [UserRole.OPERADOR_EMPRESA],
        trip.municipality_id,
        trip.vehicle.company_id,
        {
          title:   `Exceso de velocidad — ${trip.vehicle.plate}`,
          content: `Tu vehículo ${trip.vehicle.plate} fue detectado a ${vel.toFixed(0)} km/h (máx: ${config.velocidad_maxima_kmh} km/h). Toma acción inmediata.`,
          priority: 'ALTA',
          metadata: { alert_id: alert.id },
        },
      ).catch(e => this.logger.error('Error notificando operadores:', e));
    }

    return { alert_created: true, alert, current_status: status };
  }

  // ── PING DE POSICIÓN (sin exceso, solo tracking) ──────────────────────────────

  async pingPosition(dto: PingPositionDto, citizenId: string): Promise<{ ok: boolean }> {
    const trip = await this.tripRepo.findOne({
      where: { id: dto.trip_id, status: TripStatus.EN_CURSO },
      select: ['id', 'municipality_id', 'vehicle_id'],
    });
    if (!trip) return { ok: false };

    const vehicle = await this.vehicleRepo.findOne({
      where: { id: trip.vehicle_id },
      select: ['plate'],
    });

    this.gateway.emitVehiclePosition(trip.municipality_id, {
      trip_id:       trip.id,
      vehicle_plate: vehicle?.plate,
      lat:           dto.lat,
      lng:           dto.lng,
      speed_kmh:     dto.speed_kmh,
      municipality_id: trip.municipality_id,
    });

    return { ok: true };
  }

  // ── LISTAR ALERTAS ──────────────────────────────────────────────────────────

  async findAll(filters: {
    municipality_id: string;
    company_id?: string;
    severidad?: string;
    estado?: string;
    vehicle_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SpeedAlert[]; total: number; page: number; lastPage: number }> {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);

    const qb = this.alertRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.vehicle', 'v')
      .leftJoinAndSelect('a.driver',  'd')
      .leftJoinAndSelect('a.reporter', 'r')
      .leftJoinAndSelect('a.trip', 't')
      .leftJoinAndSelect('t.route', 'ro')
      .where('a.municipality_id = :mid', { mid: filters.municipality_id });

    if (filters.company_id) {
      qb.andWhere('v.company_id = :cid', { cid: filters.company_id });
    }
    if (filters.severidad) {
      qb.andWhere('a.severidad = :sev', { sev: filters.severidad });
    }
    if (filters.estado) {
      qb.andWhere('a.estado = :est', { est: filters.estado });
    }
    if (filters.vehicle_id) {
      qb.andWhere('a.vehicle_id = :vid', { vid: filters.vehicle_id });
    }
    if (filters.fecha_desde) {
      qb.andWhere('a.created_at >= :fd', { fd: new Date(filters.fecha_desde) });
    }
    if (filters.fecha_hasta) {
      qb.andWhere('a.created_at <= :fh', { fh: new Date(filters.fecha_hasta) });
    }

    const [data, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, lastPage: Math.ceil(total / limit) || 1 };
  }

  async findOne(id: string, municipalityId: string): Promise<SpeedAlert> {
    const alert = await this.alertRepo.findOne({
      where: { id },
      relations: ['vehicle', 'vehicle.company', 'driver', 'reporter', 'trip', 'trip.route'],
    });
    if (!alert) throw new NotFoundException(`Alerta ${id} no encontrada`);
    if (alert.municipality_id !== municipalityId) throw new ForbiddenException();
    return alert;
  }

  // ── RESOLVER ALERTA ──────────────────────────────────────────────────────────

  async resolve(id: string, dto: ResolveAlertDto, user: User): Promise<SpeedAlert> {
    const alert = await this.findOne(id, user.municipality_id);

    alert.estado            = dto.estado;
    alert.resuelto_por      = user.id;
    alert.notas_resolucion  = dto.notas_resolucion ?? null;
    if (dto.derivo_sancion) {
      alert.derivo_sancion = true;
    }

    return this.alertRepo.save(alert);
  }

  // ── MARCAR COMO VISTA ─────────────────────────────────────────────────────────

  async markSeen(id: string, user: User): Promise<SpeedAlert> {
    const alert = await this.findOne(id, user.municipality_id);

    if (alert.estado === SpeedAlertStatus.ACTIVA) {
      alert.estado = user.role === UserRole.FISCAL || user.role === UserRole.ADMIN_MUNICIPAL
        ? SpeedAlertStatus.VISTA_FISCAL
        : SpeedAlertStatus.VISTA_OPERADOR;
      return this.alertRepo.save(alert);
    }
    return alert;
  }

  // ── ESTADÍSTICAS ──────────────────────────────────────────────────────────────

  async getStats(municipalityId: string) {
    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const semanaInicio = new Date(hoyInicio.getTime() - 7 * 86400000);
    const mesInicio    = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [alertasHoy, alertasSemana, alertasMes] = await Promise.all([
      this.alertRepo.count({ where: { municipality_id: municipalityId, created_at: MoreThanOrEqual(hoyInicio) } }),
      this.alertRepo.count({ where: { municipality_id: municipalityId, created_at: MoreThanOrEqual(semanaInicio) } }),
      this.alertRepo.count({ where: { municipality_id: municipalityId, created_at: MoreThanOrEqual(mesInicio) } }),
    ]);

    // Por severidad
    const porSeveridad = await this.alertRepo
      .createQueryBuilder('a')
      .select('a.severidad', 'severidad')
      .addSelect('COUNT(*)', 'total')
      .where('a.municipality_id = :mid', { mid: municipalityId })
      .groupBy('a.severidad')
      .getRawMany();

    // Vehículos con más alertas
    const vehiculosMasAlertas = await this.alertRepo
      .createQueryBuilder('a')
      .select('v.plate', 'plate')
      .addSelect('COUNT(*)', 'total')
      .leftJoin('a.vehicle', 'v')
      .where('a.municipality_id = :mid', { mid: municipalityId })
      .groupBy('v.plate')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany();

    // Velocidad máxima registrada
    const maxVel = await this.alertRepo
      .createQueryBuilder('a')
      .select('MAX(a.velocidad_maxima_registrada_kmh)', 'max')
      .where('a.municipality_id = :mid', { mid: municipalityId })
      .getRawOne();

    // Promedio de exceso
    const promedioExceso = await this.alertRepo
      .createQueryBuilder('a')
      .select('AVG(a.exceso_kmh)', 'avg')
      .where('a.municipality_id = :mid', { mid: municipalityId })
      .getRawOne();

    return {
      alertas_hoy:    alertasHoy,
      alertas_semana: alertasSemana,
      alertas_mes:    alertasMes,
      por_severidad:  Object.fromEntries(porSeveridad.map(r => [r.severidad, Number(r.total)])),
      vehiculos_mas_alertas: vehiculosMasAlertas.map(r => ({ plate: r.plate, total: Number(r.total) })),
      velocidad_maxima_registrada: Number(maxVel?.max ?? 0),
      promedio_exceso: Number(Number(promedioExceso?.avg ?? 0).toFixed(1)),
    };
  }

  // ── ALERTAS ACTIVAS ────────────────────────────────────────────────────────────

  async getActive(municipalityId: string, companyId?: string): Promise<SpeedAlert[]> {
    const qb = this.alertRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.vehicle', 'v')
      .leftJoinAndSelect('a.driver',  'd')
      .leftJoinAndSelect('a.trip', 't')
      .leftJoinAndSelect('t.route', 'ro')
      .where('a.municipality_id = :mid', { mid: municipalityId })
      .andWhere('a.estado IN (:...estados)', { estados: [SpeedAlertStatus.ACTIVA, SpeedAlertStatus.VISTA_FISCAL, SpeedAlertStatus.VISTA_OPERADOR] })
      .orderBy('a.created_at', 'DESC')
      .take(50);

    if (companyId) {
      qb.andWhere('v.company_id = :cid', { cid: companyId });
    }

    return qb.getMany();
  }

  // ── PRIVADOS ──────────────────────────────────────────────────────────────────

  private async notifyRoles(
    roles: UserRole[],
    municipalityId: string,
    companyId: string | null,
    payload: { title: string; content: string; priority: 'ALTA' | 'MEDIA' | 'BAJA'; metadata?: any },
  ): Promise<void> {
    const whereConditions = roles.map(role => {
      const base: any = { role, municipality_id: municipalityId, status: UserStatus.ACTIVO };
      if (companyId && role === UserRole.OPERADOR_EMPRESA) {
        base.company_id = companyId;
      }
      return base;
    });

    const users = await this.userRepo.find({ where: whereConditions });

    for (const u of users) {
      await this.notifications.send({
        userId:   u.id,
        channels: [NotificationChannel.WEB],
        type:     NotificationType.EXCESO_VELOCIDAD,
        title:    payload.title,
        content:  payload.content,
        priority: payload.priority,
        metadata: payload.metadata,
      });
    }
  }
}
