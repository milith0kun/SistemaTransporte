import {
  IsOptional, IsUUID, IsInt, Min, Max, IsEnum, IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoZona } from '../../../entities/speed-config.entity';

export class CreateSpeedConfigDto {
  @ApiPropertyOptional({ description: 'UUID de la ruta. Null = aplica a toda la municipalidad' })
  @IsOptional()
  @IsUUID()
  route_id?: string;

  @ApiProperty({ description: 'Velocidad a la que se muestra advertencia amarilla (km/h)', minimum: 20, maximum: 120 })
  @IsInt()
  @Min(20)
  @Max(120)
  velocidad_alerta_kmh: number;

  @ApiProperty({ description: 'Límite máximo. Superarlo genera alerta al Fiscal y Operador (km/h)', minimum: 20, maximum: 120 })
  @IsInt()
  @Min(20)
  @Max(120)
  velocidad_maxima_kmh: number;

  @ApiProperty({ description: 'Velocidad crítica → alerta inmediata alta prioridad (km/h)', minimum: 50, maximum: 200 })
  @IsInt()
  @Min(50)
  @Max(200)
  velocidad_critica_kmh: number;

  @ApiPropertyOptional({ description: 'Margen de error GPS (km/h)', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  tolerancia_kmh?: number;

  @ApiPropertyOptional({ description: 'El exceso debe durar al menos estos segundos para generar alerta', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  duracion_minima_segundos?: number;

  @ApiPropertyOptional({ enum: TipoZona })
  @IsOptional()
  @IsEnum(TipoZona)
  tipo_zona?: TipoZona;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;
}
