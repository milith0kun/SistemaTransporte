import {
  Controller, Get, Post, Put, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { Roles }         from '../auth/decorators/roles.decorator';
import { CurrentUser }   from '../auth/decorators/current-user.decorator';
import { UserRole, User } from '../../entities';

import { SpeedService }         from './speed.service';
import { CreateSpeedConfigDto } from './dto/create-speed-config.dto';
import { UpdateSpeedConfigDto } from './dto/update-speed-config.dto';

@ApiTags('Speed Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/speed-config')
export class SpeedController {

  constructor(private readonly speedService: SpeedService) {}

  // ── ADMIN: crear configuración ─────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN_MUNICIPAL)
  @ApiOperation({ summary: 'Crear configuración de velocidad para una ruta o municipalidad' })
  create(@Body() dto: CreateSpeedConfigDto, @CurrentUser() user: User) {
    return this.speedService.create(dto, user);
  }

  // ── ADMIN/FISCAL: listar configuraciones ──────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL)
  @ApiOperation({ summary: 'Listar configuraciones de mi municipalidad' })
  findAll(@CurrentUser() user: User) {
    return this.speedService.findAll(user.municipality_id);
  }

  // ── ADMIN/FISCAL: detalle de configuración ────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL)
  @ApiOperation({ summary: 'Obtener configuración específica' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.speedService.findOne(id, user.municipality_id);
  }

  // ── ADMIN: actualizar configuración ───────────────────────────────────────

  @Put(':id')
  @Roles(UserRole.ADMIN_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar configuración de velocidad' })
  update(@Param('id') id: string, @Body() dto: UpdateSpeedConfigDto, @CurrentUser() user: User) {
    return this.speedService.update(id, dto, user);
  }

  // ── ADMIN: desactivar configuración ──────────────────────────────────────

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN_MUNICIPAL)
  @ApiOperation({ summary: 'Desactivar configuración de velocidad' })
  deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.speedService.deactivate(id, user);
  }

  // ── Todos los roles: obtener límite para una ruta ─────────────────────────

  @Get('route/:routeId')
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL, UserRole.OPERADOR_EMPRESA, UserRole.CIUDADANO, UserRole.INSPECTOR)
  @ApiOperation({ summary: 'Obtener límite de velocidad aplicable a una ruta' })
  getForRoute(@Param('routeId') routeId: string, @CurrentUser() user: User) {
    return this.speedService.getForRoute(routeId, user.municipality_id);
  }

  // ── Público (ciudadano autenticado): límite para un viaje activo ──────────

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Obtener límite de velocidad para un viaje activo' })
  getForTrip(@Param('tripId') tripId: string) {
    return this.speedService.getForTrip(tripId);
  }
}
