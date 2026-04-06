import {
  Controller, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { Roles }         from '../auth/decorators/roles.decorator';
import { CurrentUser }   from '../auth/decorators/current-user.decorator';
import { UserRole, User } from '../../entities';

import { SpeedAlertsService } from './speed-alerts.service';
import { ResolveAlertDto }    from './dto/resolve-alert.dto';

@ApiTags('Speed Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/speed-alerts')
export class SpeedAlertsController {

  constructor(private readonly alertsService: SpeedAlertsService) {}

  // ── Listar alertas ────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL, UserRole.OPERADOR_EMPRESA)
  @ApiOperation({ summary: 'Listar alertas de velocidad (FISCAL: todas; OPERADOR: solo su empresa)' })
  findAll(
    @Query('severidad') severidad?: string,
    @Query('estado')    estado?: string,
    @Query('vehicle_id') vehicle_id?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
    @Query('page')      page?: string,
    @Query('limit')     limit?: string,
    @CurrentUser()      user?: User,
  ) {
    return this.alertsService.findAll({
      municipality_id: user.municipality_id,
      company_id: user.role === UserRole.OPERADOR_EMPRESA ? user.company_id : undefined,
      severidad,
      estado,
      vehicle_id,
      fecha_desde,
      fecha_hasta,
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // ── Alertas activas ───────────────────────────────────────────────────────

  @Get('active/list')
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL, UserRole.OPERADOR_EMPRESA)
  @ApiOperation({ summary: 'Listar alertas activas (sin resolver)' })
  getActive(@CurrentUser() user: User) {
    return this.alertsService.getActive(
      user.municipality_id,
      user.role === UserRole.OPERADOR_EMPRESA ? user.company_id : undefined,
    );
  }

  // ── Estadísticas ──────────────────────────────────────────────────────────

  @Get('stats/overview')
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL)
  @ApiOperation({ summary: 'Estadísticas de alertas de velocidad' })
  getStats(@CurrentUser() user: User) {
    return this.alertsService.getStats(user.municipality_id);
  }

  // ── Detalle ───────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN_MUNICIPAL, UserRole.FISCAL, UserRole.OPERADOR_EMPRESA)
  @ApiOperation({ summary: 'Detalle de una alerta' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.alertsService.findOne(id, user.municipality_id);
  }

  // ── Resolver ──────────────────────────────────────────────────────────────

  @Patch(':id/resolve')
  @Roles(UserRole.FISCAL, UserRole.ADMIN_MUNICIPAL)
  @ApiOperation({ summary: 'Resolver alerta (RESUELTA o FALSO_POSITIVO)' })
  resolve(@Param('id') id: string, @Body() dto: ResolveAlertDto, @CurrentUser() user: User) {
    return this.alertsService.resolve(id, dto, user);
  }

  // ── Marcar como vista ─────────────────────────────────────────────────────

  @Patch(':id/seen')
  @Roles(UserRole.FISCAL, UserRole.ADMIN_MUNICIPAL, UserRole.OPERADOR_EMPRESA)
  @ApiOperation({ summary: 'Marcar alerta como vista' })
  markSeen(@Param('id') id: string, @CurrentUser() user: User) {
    return this.alertsService.markSeen(id, user);
  }
}
