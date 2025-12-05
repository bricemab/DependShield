import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ProjectsModule } from '../projects/projects.module';
import { ScansModule } from '../scans/scans.module';

@Module({
    imports: [ProjectsModule, ScansModule],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
