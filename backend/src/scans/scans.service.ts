import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Scan, ScanStatus } from './scan.entity';
import { ProjectsService } from '../projects/projects.service';
import { UserPlan } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';

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
        private auditService: AuditService,
    ) { }

    async triggerScan(projectId: number, userId?: number): Promise<Scan> {
        this.logger.log(`Triggering scan for project ${projectId} (User: ${userId})`);

        let project;
        if (userId) {
            await this.projectsService.findOne(projectId, userId);
            project = await this.projectsService.findOneById(projectId);
        } else {
            project = await this.projectsService.findOneById(projectId);
        }

        this.logger.log(`Project verified`);

        // Rate Limiting Check
        const user = await this.projectsService.getUserByProjectId(projectId);
        const userPlan = user?.plan || UserPlan.STARTER;
        this.logger.log(`Project Owner: ${user?.id}, Plan: ${userPlan}`);

        if (userPlan !== UserPlan.ENTERPRISE) {
            let cooldownMinutes = 60; // STARTER default
            if (userPlan === UserPlan.PRO) {
                cooldownMinutes = 1; // Reduced for testing convenience
            }

            const lastScan = await this.scansRepository.findOne({
                where: { projectId },
                order: { startedAt: 'DESC' },
            });

            if (lastScan) {
                const now = new Date();
                const lastScanTime = new Date(lastScan.startedAt);
                const diffMinutes = (now.getTime() - lastScanTime.getTime()) / 60000;

                if (diffMinutes < cooldownMinutes) {
                    const remaining = Math.ceil(cooldownMinutes - diffMinutes);
                    throw new BadRequestException(`Rate limit exceeded for ${userPlan} plan. Please wait ${remaining} minutes before scanning again.`);
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

        await this.auditService.log(projectId, userId || null, 'SCAN_STARTED', { scanId: scan.id });

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

    async findLastScan(projectId: number): Promise<Scan | null> {
        return this.scansRepository.findOne({
            where: { projectId },
            order: { startedAt: 'DESC' },
            relations: ['vulnerabilities'],
        });
    }
}
