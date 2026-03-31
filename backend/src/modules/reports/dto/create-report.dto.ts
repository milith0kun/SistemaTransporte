import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { ReportType } from '../../../entities';

export class CreateReportDto {
  @IsUUID()
  trip_id: string;

  @IsString()
  @MaxLength(255)
  qr_code: string;

  @IsEnum(ReportType)
  type: ReportType;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  photo_url?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsBoolean()
  is_same_driver: boolean;
}
