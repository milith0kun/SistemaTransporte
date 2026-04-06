import { PartialType } from '@nestjs/swagger';
import { CreateSpeedConfigDto } from './create-speed-config.dto';

export class UpdateSpeedConfigDto extends PartialType(CreateSpeedConfigDto) {}
