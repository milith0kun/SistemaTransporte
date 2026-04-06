import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpeedAlertStatus } from '../../../entities/speed-alert.entity';

export class ResolveAlertDto {
  @ApiProperty({ enum: [SpeedAlertStatus.RESUELTA, SpeedAlertStatus.FALSO_POSITIVO] })
  @IsEnum([SpeedAlertStatus.RESUELTA, SpeedAlertStatus.FALSO_POSITIVO])
  estado: SpeedAlertStatus.RESUELTA | SpeedAlertStatus.FALSO_POSITIVO;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas_resolucion?: string;

  @ApiPropertyOptional({ description: 'Marcar la alerta como que derivó en sanción' })
  @IsOptional()
  @IsBoolean()
  derivo_sancion?: boolean;
}
