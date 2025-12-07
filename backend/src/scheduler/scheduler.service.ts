import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ProjectsService } from '../projects/projects.service';
import { ScansService } from '../scans/scans.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private projectsService: ProjectsService,
    private scansService: ScansService,
  ) {}

  async onModuleInit() {
    await this.loadScheduledScans();
  }

  async loadScheduledScans() {
    const projects = await this.projectsService.findAllWithSchedule();
    this.logger.log(`Found ${projects.length} projects with schedules.`);

    for (const project of projects) {
      if (project.cronSchedule) {
        this.addCronJob(project.id, project.cronSchedule);
      }
    }
  }

  addCronJob(projectId: number, cronExpression: string) {
    const jobName = `scan-project-${projectId}`;

    // Remove existing job if it exists
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    const job = new CronJob(cronExpression, () => {
      this.logger.log(`Triggering scheduled scan for project ${projectId}`);
      this.scansService.triggerScan(projectId, null); // null userId for system triggered scans
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Added cron job for project ${projectId} with schedule: ${cronExpression}`,
    );
  }

  removeCronJob(projectId: number) {
    const jobName = `scan-project-${projectId}`;
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Removed cron job for project ${projectId}`);
    }
  }
}
