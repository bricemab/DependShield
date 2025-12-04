import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { Scan } from './scan.entity';
import { Vulnerability } from './vulnerability.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ScanProcessor } from './scan.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Scan, Vulnerability]),
        BullModule.registerQueue({
            name: 'scans',
        }),
        forwardRef(() => ProjectsModule),
        NotificationsModule,
    ],
    controllers: [ScansController],
    providers: [ScansService, ScanProcessor],
    exports: [ScansService],
})
export class ScansModule { }
