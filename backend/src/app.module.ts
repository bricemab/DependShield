import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { ScansModule } from './scans/scans.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';

import { ReportsModule } from './reports/reports.module';
import configuration from './config/configuration';

import { AuditModule } from './audit/audit.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RedisModule } from './redis/redis.module';
import { EpssModule } from './epss/epss.module';

@Module({
  imports: [
    // ...
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    ScansModule,
    NotificationsModule,
    SchedulerModule,
    ReportsModule,
    AuditModule,
    WebhooksModule,
    EpssModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
