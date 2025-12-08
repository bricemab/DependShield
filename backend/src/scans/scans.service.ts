import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Scan, ScanStatus } from './scan.entity';
import { ProjectsService } from '../projects/projects.service';
import { PlanType } from '../organizations/organization.entity';
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
    this.logger.log(
      `Triggering scan for project ${projectId} (User: ${userId})`,
    );

    let project;
    if (userId) {
      await this.projectsService.findOne(projectId, userId);
      project = await this.projectsService.findOneById(projectId);
    } else {
      project = await this.projectsService.findOneById(projectId);
    }

    this.logger.log(`Project verified`);

    // Rate Limiting Check
    const projectEntity = await this.projectsService.findOneById(projectId);
    const plan = projectEntity.organization?.plan || PlanType.STARTER;
    this.logger.log(`Project Organization: ${projectEntity.organization?.name}, Plan: ${plan}`);

    if (plan !== PlanType.ENTERPRISE) {
      let cooldownMinutes = 60; // STARTER default
      if (plan === PlanType.PRO) {
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
          throw new BadRequestException(
            `Rate limit exceeded for ${plan} plan. Please wait ${remaining} minutes before scanning again.`,
          );
        }
      }
    }


    // Calculate sequential scan number
    const lastScanNumber = await this.scansRepository.findOne({
      where: { projectId },
      order: { number: 'DESC' },
    });
    const nextNumber = (lastScanNumber?.number || 0) + 1;

    // Create scan record
    const scan = this.scansRepository.create({
      projectId,
      status: ScanStatus.PENDING,
      number: nextNumber,
    });
    await this.scansRepository.save(scan);
    this.logger.log(`Scan record created: ${scan.id}`);

    // Priority Logic: ENTERPRISE (1) > PRO (5) > STARTER (10)
    let priority = 10;
    if (plan === PlanType.ENTERPRISE) priority = 1;
    else if (plan === PlanType.PRO) priority = 5;

    // Add to queue with priority
    await this.scansQueue.add(
      'scan',
      { scanId: scan.id },
      { priority },
    );
    this.logger.log(`Scan ${scan.id} added to queue with priority ${priority}`);

    await this.auditService.log(projectId, userId || null, 'SCAN_STARTED', {
      scanId: scan.id,
    });

    return scan;
  }

  async findAll(
    projectId: number,
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Scan[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.projectsService.findOne(projectId, userId);

    const [data, total] = await this.scansRepository.findAndCount({
      where: { projectId },
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    await this.populateWaitTimes(data);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Optimize: Populate wait times
  private async populateWaitTimes(scans: Scan[]) {
    const pendingScans = scans.filter(s => s.status === ScanStatus.PENDING);
    if (pendingScans.length === 0) return;

    const concurrency = Number(process.env.SCAN_CONCURRENCY || 5);
    const avgScanTime = 30; // seconds

    // Get count of pending scans BEFORE these
    // We process each individually for correctness or fetch all pending IDs
    const allPendingIds = await this.scansRepository.find({
      where: { status: ScanStatus.PENDING },
      select: ['id'],
      order: { id: 'ASC' }
    });
    const allPendingIdsList = allPendingIds.map(s => s.id);

    pendingScans.forEach(scan => {
      const position = allPendingIdsList.indexOf(scan.id);
      if (position !== -1) {
        // Formula: (Position // Concurrency) * AvgTime + AvgTime
        // Use floor to group into batches
        const batchesAhead = Math.floor(position / concurrency);
        scan.estimatedWaitTime = (batchesAhead * avgScanTime) + avgScanTime;
      }
    });
  }

  async findOne(scanId: number): Promise<Scan> {
    const scan = await this.scansRepository.findOne({
      where: { id: scanId },
      relations: ['vulnerabilities', 'project'],
    });
    if (scan) await this.populateWaitTimes([scan]);
    return scan;
  }

  async findLastScan(projectId: number): Promise<Scan | null> {
    return this.scansRepository.findOne({
      where: { projectId },
      order: { startedAt: 'DESC' },
      relations: ['vulnerabilities'],
    });
  }
}
