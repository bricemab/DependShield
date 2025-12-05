import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
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
        private configService: ConfigService,
    ) { }

    async triggerScan(projectId: number, userId?: number): Promise<Scan> {
        this.logger.log(`Triggering scan for project ${projectId} (User: ${userId})`);

        let project;
        // Verify project ownership if userId is provided
        if (userId) {
            project = await this.projectsService.findOne(projectId, userId);
        } else {
            // System triggered scan, just verify project exists
            project = await this.projectsService.findOneById(projectId);
        }
        this.logger.log(`Project verified`);

        // Rate Limiting Check
        if (!project.immediateScansEnabled) {
            const lastScan = await this.scansRepository.findOne({
                where: { projectId },
                order: { startedAt: 'DESC' },
            });

            if (lastScan) {
                const cooldownMinutes = this.configService.get<number>('SCAN_COOLDOWN_MINUTES', 60);
                const now = new Date();
                const lastScanTime = new Date(lastScan.startedAt);
                const diffMinutes = (now.getTime() - lastScanTime.getTime()) / 60000;

                if (diffMinutes < cooldownMinutes) {
                    const remaining = Math.ceil(cooldownMinutes - diffMinutes);
                    throw new BadRequestException(`Rate limit exceeded. Please wait ${remaining} minutes before scanning again.`);
                }
            }
        }

        // Create scan record
        const scan = this.scansRepository.create({
            projectId,
            status: ScanStatus.PENDING,
        });
        await this.scansRepository.save(scan);
        this.logger.log(`Scan record created: ${scan.id}`);

        // Add to queue
        await this.scansQueue.add('scan', {
            scanId: scan.id,
        });
        this.logger.log(`Scan ${scan.id} added to queue`);

        return scan;
    }

    async findAll(projectId: number, userId: number, page: number = 1, limit: number = 10): Promise<{ data: Scan[], total: number, page: number, limit: number, totalPages: number }> {
        await this.projectsService.findOne(projectId, userId);

        const [data, total] = await this.scansRepository.findAndCount({
            where: { projectId },
            order: { startedAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(scanId: number): Promise<Scan> {
        return this.scansRepository.findOne({
            where: { id: scanId },
            relations: ['vulnerabilities'],
        });
    }
}
