import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { Scan } from './scan.entity';
import { Vulnerability } from './vulnerability.entity';
import { ProjectsModule } from '../projects/projects.module';

@Module({
    imports: [TypeOrmModule.forFeature([Scan, Vulnerability]), ProjectsModule],
    controllers: [ScansController],
    providers: [ScansService],
    exports: [ScansService],
})
export class ScansModule { }
