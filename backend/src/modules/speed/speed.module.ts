import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SpeedConfig } from '../../entities/speed-config.entity';
import { SpeedAlert }  from '../../entities/speed-alert.entity';
import { Trip }        from '../../entities/trip.entity';
import { TripDriver }  from '../../entities/trip-driver.entity';
import { Vehicle }     from '../../entities/vehicle.entity';
import { User }        from '../../entities/user.entity';

import { NotificationsModule } from '../notifications/notifications.module';

import { SpeedService }          from './speed.service';
import { SpeedAlertsService }    from './speed-alerts.service';
import { SpeedController }       from './speed.controller';
import { SpeedAlertsController } from './speed-alerts.controller';
import { SpeedCitizenController } from './speed-citizen.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeedConfig, SpeedAlert, Trip, TripDriver, Vehicle, User]),
    NotificationsModule,
  ],
  controllers: [SpeedController, SpeedAlertsController, SpeedCitizenController],
  providers:   [SpeedService, SpeedAlertsService],
  exports:     [SpeedService, SpeedAlertsService],
})
export class SpeedModule {}
