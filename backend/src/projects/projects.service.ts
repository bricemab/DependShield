import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';
import { PlanType } from '../organizations/organization.entity';
import { GithubProvider } from '../providers/github/github.provider';
import { GitProvider } from '../providers/interfaces/git-provider.interface';
import { AuditService } from '../audit/audit.service';
import { ScansService } from '../scans/scans.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private usersService: UsersService,
    @Inject(GithubProvider)
    private gitProvider: GitProvider,
    private auditService: AuditService,
    @Inject(forwardRef(() => ScansService))
    private scansService: ScansService,
  ) { }

  // ... existing findAll ...

  async findAll(userId: number): Promise<any[]> {
    // 1. Get user's organizations
    const user = await this.usersService.findOne(userId);
    if (!user || !user.organizations || user.organizations.length === 0) {
      return [];
    }

    // 2. Fetch projects for these organizations
    const organizationIds = user.organizations.map(org => org.id);

    const projects = await this.projectsRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.user', 'creator') // Keep track of who created it
      .where('project.organizationId IN (:...organizationIds)', { organizationIds })
      .getMany();

    // Enrich with last scan info
    const projectsWithScans = await Promise.all(projects.map(async (project) => {
      try {
        const lastScan = await this.scansService.findLastScan(project.id);
        return { ...project, lastScan };
      } catch (e) {
        return { ...project, lastScan: null };
      }
    }));
    return projectsWithScans;
  }

  async findOne(id: number, userId: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, userId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async findOneById(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['user', 'user.organizations'],
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async getUserByProjectId(id: number) {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!project || !project.user) return null;
    // Ensure we get the fresh user from UsersService to avoid any stale relation issues
    return this.usersService.findOne(project.user.id);
  }

  async findAllWithSchedule(): Promise<Project[]> {
    return this.projectsRepository
      .createQueryBuilder('project')
      .where('project.cronSchedule IS NOT NULL')
      .getMany();
  }

  async create(
    createProjectDto: CreateProjectDto,
    userId: number,
  ): Promise<Project> {
    const user = await this.usersService.findOne(userId);
    // Fetch orgs to get plan
    const plan = await this.usersService.getUserPlan(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Default to first organization for now
    const organizationId = user.organizations?.[0]?.id;
    if (!organizationId) {
      throw new BadRequestException('User must belong to an organization to create a Project.');
    }

    // 1. Quota Check (Scoped to Organization?) 
    // Ideally quota should be per Org, but keeping logic SIMPLE for now (user's plan limit on org projects)
    const projectCount = await this.projectsRepository.count({
      where: { organizationId },
    });

    let maxProjects = 3; // Starter
    if (plan === PlanType.PRO) maxProjects = 20;
    if (plan === PlanType.ENTERPRISE) maxProjects = 9999;

    if (projectCount >= maxProjects) {
      throw new BadRequestException(
        `Organization plan limit reached. Your plan (${plan}) allows a maximum of ${maxProjects} projects.`,
      );
    }

    // ... (Existing Private/Monorepo checks remain same) ...
    // 2. Private Repo Check
    // Verify visibility with Git Provider to prevent bypass
    if (
      createProjectDto.repositoryName &&
      createProjectDto.repositoryName.includes('/')
    ) {
      try {
        // Split "owner/repo"
        const [owner, repoName] = createProjectDto.repositoryName.split('/');
        const repoMetadata = await this.gitProvider.getRepositoryMetadata(
          user.accessToken,
          owner,
          repoName,
        );

        // Enforce truth: if Git says private, we treat it as private regardless of DTO
        if (repoMetadata.private) {
          if (plan === PlanType.STARTER) {
            throw new BadRequestException(
              'Private repositories are only supported on PRO and ENTERPRISE plans.',
            );
          }
          // Force DTO to match reality
          createProjectDto.isPrivate = true;
        }
      } catch (error) {
        console.warn(
          `Could not verify repo metadata for ${createProjectDto.repositoryName}:`,
          error,
        );
      }
    }

    // Fallback check on DTO (in case fetch failed or wasn't run)
    if (createProjectDto.isPrivate) {
      if (plan === PlanType.STARTER) {
        throw new BadRequestException(
          'Private repositories are only supported on PRO and ENTERPRISE plans.',
        );
      }
    }

    // 3. Monorepo (Lockfile) Check
    if (createProjectDto.lockfilePath) {
      const isRoot =
        createProjectDto.lockfilePath === './' ||
        createProjectDto.lockfilePath === './package-lock.json' ||
        createProjectDto.lockfilePath === './yarn.lock' ||
        createProjectDto.lockfilePath === './pnpm-lock.yaml' ||
        createProjectDto.lockfilePath === './bun.lockb';

      // Check if path contains more than one segment (e.g. backend/package.json)
      // Simple heuristic: if it has a slash that isn't just start './'
      const normalizedPath = createProjectDto.lockfilePath.replace(/^\.\//, '');
      const isNested = normalizedPath.includes('/');

      if (isNested && plan === PlanType.STARTER) {
        throw new BadRequestException(
          'Monorepo support (nested lockfiles) is only available on PRO and ENTERPRISE plans.',
        );
      }
    }

    const project = this.projectsRepository.create({
      ...createProjectDto,
      userId,
      organizationId
    });
    return this.projectsRepository.save(project);
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
    userId: number,
  ): Promise<Project> {
    const user = await this.usersService.findOne(userId);
    const project = await this.findOne(id, userId);

    // 4. Email Features Check
    if (updateProjectDto.emailEnabled === true) {
      // Re-fetch plan
      const plan = await this.usersService.getUserPlan(userId);

      if (plan === PlanType.STARTER) {
        throw new BadRequestException(
          'Email notifications are only supported on PRO and ENTERPRISE plans.',
        );
      }
    }

    this.projectsRepository.merge(project, updateProjectDto);
    const updated = await this.projectsRepository.save(project);
    await this.auditService.log(
      updated.id,
      userId,
      'PROJECT_UPDATED',
      updateProjectDto,
    );
    return updated;
  }

  async remove(id: number, userId: number): Promise<void> {
    const project = await this.findOne(id, userId);
    await this.projectsRepository.remove(project); // this removes the ID from project object if typeorm does that? Usually yes.
    // If we want to log it, we should log BEFORE or keep the ID.
    // AuditLog has nullable Project relation, so we can log with just projectId even if row is gone.
    await this.auditService.log(null, userId, 'PROJECT_DELETED', {
      name: project.name,
    });
  }

  async getAuditLogs(projectId: number, userId: number) {
    // Verify ownership
    await this.findOne(projectId, userId);
    return this.auditService.findByProject(projectId);
  }

  async getGithubRepositories(userId: number): Promise<any[]> {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    return this.gitProvider.getRepositories(user.accessToken);
  }

  async getGithubBranches(
    userId: number,
    owner: string,
    repo: string,
  ): Promise<any[]> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    return this.gitProvider.getBranches(user.accessToken, owner, repo);
  }

  async detectLockfiles(
    userId: number,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<{ path: string; packageManager: string }[]> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    return this.gitProvider.detectLockfiles(
      user.accessToken,
      owner,
      repo,
      branch,
    );
  }
}
