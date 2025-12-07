import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook, WebhookType, WebhookEvent } from './webhook.entity';
import { ProjectsService } from '../projects/projects.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UsersService } from '../users/users.service';
import { Scan } from '../scans/scan.entity';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private webhooksRepository: Repository<Webhook>,
    private projectsService: ProjectsService,
    private usersService: UsersService,
  ) {}

  async findAllByProject(
    projectId: number,
    userId: number,
  ): Promise<Webhook[]> {
    const project = await this.projectsService.findOne(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    return this.webhooksRepository.find({ where: { projectId } });
  }

  async create(
    projectId: number,
    userId: number,
    createDto: CreateWebhookDto,
  ): Promise<Webhook> {
    const user = await this.usersService.findOne(userId);
    if (user.plan !== 'PRO' && user.plan !== 'ENTERPRISE') {
      throw new ForbiddenException(
        'Webhooks are available for PRO and ENTERPRISE plans only.',
      );
    }

    const project = await this.projectsService.findOne(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');

    const webhook = this.webhooksRepository.create({
      ...createDto,
      projectId,
    });

    return this.webhooksRepository.save(webhook);
  }

  async delete(id: string, userId: number): Promise<void> {
    const webhook = await this.webhooksRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!webhook) throw new NotFoundException('Webhook not found');

    // Check ownership via project
    const project = await this.projectsService.findOne(
      webhook.projectId,
      userId,
    );
    if (!project)
      throw new ForbiddenException('You do not have access to this webhook');

    await this.webhooksRepository.remove(webhook);
  }

  async triggerWebhook(project: any, scan: Scan, event: WebhookEvent) {
    const webhooks = await this.webhooksRepository.find({
      where: { projectId: project.id, isActive: true },
    });

    for (const webhook of webhooks) {
      if (webhook.events.includes(event)) {
        try {
          await this.sendPayload(webhook, scan, event, false);
        } catch (e) {
          console.error(
            `Failed to trigger webhook ${webhook.id}: ${e.message}`,
          );
        }
      }
    }
  }

  async testWebhook(id: string, userId: number): Promise<void> {
    const webhook = await this.webhooksRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const project = await this.projectsService.findOne(
      webhook.projectId,
      userId,
    );
    if (!project)
      throw new ForbiddenException('You do not have access to this webhook');

    // Mock Scan for testing
    const mockScan = {
      id: 12345,
      score: 100,
      vulnerabilitiesCount: 0,
      status: 'completed',
      project: { name: project.name },
      projectId: project.id,
    } as any;

    try {
      await this.sendPayload(
        webhook,
        mockScan,
        WebhookEvent.SCAN_COMPLETED,
        true,
      );
    } catch (e: any) {
      throw new Error(`Failed to send test payload: ${e.message}`);
    }
  }

  private async sendPayload(
    webhook: Webhook,
    scan: Scan,
    event: WebhookEvent,
    isTest: boolean = false,
  ) {
    let payload: any;
    const scanUrl = `http://localhost:5173/scans/${scan.id}`; // TODO: Env var
    const prefix = isTest ? '[TEST] ' : '';
    const mdPrefix = isTest ? '[TEST] ' : ''; // Markdown prefix

    if (webhook.type === WebhookType.SLACK) {
      payload = {
        text:
          event === WebhookEvent.SCAN_FAILED
            ? `🚨 ${prefix}Scan failed for ${scan.project.name}: ${scan.errorMessage}`
            : `🛡️ ${prefix}Scan completed for ${scan.project.name}. Score: ${scan.score}. Found ${scan.vulnerabilitiesCount} vulnerabilities.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                event === WebhookEvent.SCAN_FAILED
                  ? `*🚨 ${mdPrefix}Scan Failed for ${scan.project.name}*\nreason: ${scan.errorMessage}`
                  : `*🛡️ ${mdPrefix}Scan Completed for ${scan.project.name}*\nScore: *${scan.score}* | Vulnerabilities: *${scan.vulnerabilitiesCount}*\n<${scanUrl}|View Report>`,
            },
          },
        ],
      };
    } else if (webhook.type === WebhookType.DISCORD) {
      payload = {
        content:
          event === WebhookEvent.SCAN_FAILED
            ? `🚨 **${mdPrefix}Scan Failed** for ${scan.project.name}\nReason: ${scan.errorMessage}`
            : `🛡️ **${mdPrefix}Scan Completed** for ${scan.project.name}\nScore: **${scan.score}**\nVulnerabilities: **${scan.vulnerabilitiesCount}**\n[View Report](${scanUrl})`,
      };
    } else {
      // Generic
      payload = {
        event: isTest ? 'test.ping' : event,
        projectId: scan.projectId,
        projectName: scan.project.name,
        timestamp: new Date().toISOString(),
        message: isTest ? 'This is a test event from DependShield.' : undefined,
        scanId: !isTest ? scan.id : undefined,
        score: !isTest ? scan.score : undefined,
        vulnerabilitiesCount: !isTest ? scan.vulnerabilitiesCount : undefined,
        status: !isTest ? scan.status : undefined,
        url: !isTest ? scanUrl : undefined,
      };
    }

    await axios.post(webhook.url, payload);
  }
}
