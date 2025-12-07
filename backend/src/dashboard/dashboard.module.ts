import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Project } from '../projects/project.entity';
import { Scan } from '../scans/scan.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project, Scan]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
