import {
  Controller, Get, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { Roles }         from '../auth/decorators/roles.decorator';
import { CurrentUser }   from '../auth/decorators/current-user.decorator';
import { UserRole, User } from '../../entities';

import { SpeedService }      from './speed.service';
import { SpeedAlertsService } from './speed-alerts.service';
import { ReportSpeedDto, PingPositionDto } from './dto/report-speed.dto';

@ApiTags('Speed Monitor - Ciudadano')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/speed-monitor')
export class SpeedCitizenController {

  constructor(
    private readonly speedService:  SpeedService,
    private readonly alertsService: SpeedAlertsService,
  ) {}

  // ── Obtener configuración para el viaje (el ciudadano la necesita al activar el tacómetro) ──

  @Get('config/:tripId')
  @Roles(UserRole.CIUDADANO)
  @ApiOperation({ summary: 'Obtener límites de velocidad para el viaje activo' })
  getTripSpeedConfig(@Param('tripId') tripId: string) {
    return this.speedService.getForTrip(tripId);
  }

  // ── Reportar lectura de velocidad ─────────────────────────────────────────

  @Post('report')
  @Roles(UserRole.CIUDADANO)
  @ApiOperation({ summary: 'Enviar lectura de velocidad del GPS (puede generar alerta)' })
  reportSpeed(@Body() dto: ReportSpeedDto, @CurrentUser() user: User) {
    return this.alertsService.reportSpeed(dto, user.id);
  }

  // ── Ping de posición (tracking sin exceso) ────────────────────────────────

  @Post('ping')
  @Roles(UserRole.CIUDADANO)
  @ApiOperation({ summary: 'Enviar posición actual sin reporte de exceso (tracking en vivo)' })
  pingPosition(@Body() dto: PingPositionDto, @CurrentUser() user: User) {
    return this.alertsService.pingPosition(dto, user.id);
  }
}
