import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Scan, ScanStatus } from './scan.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ScansService {
    private readonly logger = new Logger(ScansService.name);

    constructor(
        @InjectRepository(Scan)
        private scansRepository: Repository<Scan>,
        @InjectQueue('scans') private scansQueue: Queue,
        @Inject(forwardRef(() => ProjectsService))
        private projectsService: ProjectsService,
    ) { }

    async triggerScan(projectId: number, userId?: number): Promise<Scan> {
        // Verify project ownership if userId is provided
        if (userId) {
            await this.projectsService.findOne(projectId, userId);
        } else {
            // System triggered scan, just verify project exists
            await this.projectsService.findOneById(projectId);
        }

        // Create scan record
        const scan = this.scansRepository.create({
            projectId,
            status: ScanStatus.PENDING,
        });
        await this.scansRepository.save(scan);

        // Add to queue
        await this.scansQueue.add('scan', {
            scanId: scan.id,
        });

        this.logger.log(`Scan ${scan.id} added to queue`);

        return scan;
    }

    async findAll(projectId: number, userId: number): Promise<Scan[]> {
        await this.projectsService.findOne(projectId, userId);
        return this.scansRepository.find({
            where: { projectId },
            order: { startedAt: 'DESC' },
        });
    }

    async findOne(scanId: number): Promise<Scan> {
        return this.scansRepository.findOne({
            where: { id: scanId },
            relations: ['vulnerabilities'],
        });
    }
}
