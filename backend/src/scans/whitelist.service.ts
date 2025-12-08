import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhitelistRule } from './whitelist-rule.entity';
import { ProjectsService } from '../projects/projects.service';
import { PlanType } from '../organizations/organization.entity';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectRepository(WhitelistRule)
    private whitelistRepository: Repository<WhitelistRule>,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
  ) { }

  async findAllByProject(projectId: number): Promise<WhitelistRule[]> {
    return this.whitelistRepository.find({ where: { projectId } });
  }

  async create(
    projectId: number,
    data: Partial<WhitelistRule>,
  ): Promise<WhitelistRule> {
    // SaaS Check
    const project = await this.projectsService.findOneById(projectId);
    const plan = project.organization?.plan || PlanType.STARTER;

    if (plan === PlanType.STARTER) {
      throw new BadRequestException(
        'Whitelist management is only available on PRO and ENTERPRISE plans.',
      );
    }

    const rule = this.whitelistRepository.create({
      ...data,
      projectId,
    });
    return this.whitelistRepository.save(rule);
  }

  async remove(id: number, projectId: number): Promise<void> {
    // SaaS Check
    const project = await this.projectsService.findOneById(projectId);
    const plan = project.organization?.plan || PlanType.STARTER;

    if (plan === PlanType.STARTER) {
      throw new BadRequestException(
        'Whitelist management is only available on PRO and ENTERPRISE plans.',
      );
    }

    const rule = await this.whitelistRepository.findOne({
      where: { id, projectId },
    });
    if (!rule) {
      throw new NotFoundException(`Whitelist rule ${id} not found`);
    }
    await this.whitelistRepository.remove(rule);
  }

  async isWhitelisted(
    projectId: number,
    packageName: string,
    cve?: string,
  ): Promise<boolean> {
    const query = this.whitelistRepository
      .createQueryBuilder('rule')
      .where('rule.projectId = :projectId', { projectId })
      .andWhere('rule.packageName = :packageName', { packageName });

    if (cve) {
      query.andWhere('(rule.cve = :cve OR rule.cve IS NULL)', { cve });
    }

    const count = await query.getCount();
    return count > 0;
  }
}
