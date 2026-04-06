import {
  IsUUID, IsNumber, Min, Max, IsInt, IsOptional, IsString, IsArray, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GpsPointDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
  @IsNumber() speed_kmh: number;
  @IsString() timestamp: string;
}

export class ReportSpeedDto {
  @ApiProperty({ description: 'UUID del viaje activo' })
  @IsUUID()
  trip_id: string;

  @ApiProperty({ description: 'Velocidad actual del GPS (km/h)', minimum: 0, maximum: 300 })
  @IsNumber()
  @Min(0)
  @Max(300)
  velocidad_kmh: number;

  @ApiProperty({ description: 'Latitud GPS' })
  @IsNumber()
  latitud: number;

  @ApiProperty({ description: 'Longitud GPS' })
  @IsNumber()
  longitud: number;

  @ApiProperty({ description: 'Duración del exceso continuo (segundos)', minimum: 0 })
  @IsInt()
  @Min(0)
  duracion_exceso_segundos: number;

  @ApiPropertyOptional({ description: 'Pico máximo de velocidad durante el exceso (km/h)' })
  @IsOptional()
  @IsNumber()
  velocidad_maxima_kmh?: number;

  @ApiPropertyOptional({ description: 'Descripción textual de la ubicación' })
  @IsOptional()
  @IsString()
  ubicacion_descripcion?: string;

  @ApiPropertyOptional({ description: 'Trail GPS durante el exceso (últimos 20 puntos)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  gps_trail?: GpsPointDto[];
}

export class PingPositionDto {
  @ApiProperty()
  @IsUUID()
  trip_id: string;

  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(300)
  speed_kmh: number;
}
