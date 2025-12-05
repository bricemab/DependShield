import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';
import { GithubProvider } from '../providers/github/github.provider';
import { GitProvider } from '../providers/interfaces/git-provider.interface';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private projectsRepository: Repository<Project>,
        private usersService: UsersService,
        @Inject(GithubProvider)
        private gitProvider: GitProvider,
    ) { }

    async findAll(userId: number): Promise<Project[]> {
        return this.projectsRepository.find({ where: { userId } });
    }

    async findOne(id: number, userId: number): Promise<Project> {
        const project = await this.projectsRepository.findOne({ where: { id, userId } });
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async findOneById(id: number): Promise<Project> {
        const project = await this.projectsRepository.findOne({ where: { id }, relations: ['user'] });
        if (!project) {
            throw new NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }

    async findAllWithSchedule(): Promise<Project[]> {
        return this.projectsRepository.createQueryBuilder('project')
            .where('project.cronSchedule IS NOT NULL')
            .getMany();
    }

    async create(createProjectDto: CreateProjectDto, userId: number): Promise<Project> {
        const project = this.projectsRepository.create({
            ...createProjectDto,
            userId,
        });
        return this.projectsRepository.save(project);
    }

    async update(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<Project> {
        const project = await this.findOne(id, userId);
        this.projectsRepository.merge(project, updateProjectDto);
        return this.projectsRepository.save(project);
    }

    async remove(id: number, userId: number): Promise<void> {
        const project = await this.findOne(id, userId);
        await this.projectsRepository.remove(project);
    }

    async getGithubRepositories(userId: number): Promise<any[]> {
        console.log('🔍 Fetching GitHub repos for userId:', userId);
        const user = await this.usersService.findOne(userId);
        console.log('👤 User found:', user ? 'YES' : 'NO');

        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        return this.gitProvider.getRepositories(user.accessToken);
    }

    async getGithubBranches(userId: number, owner: string, repo: string): Promise<any[]> {
        const user = await this.usersService.findOne(userId);
        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        return this.gitProvider.getBranches(user.accessToken, owner, repo);
    }

    async detectLockfiles(userId: number, owner: string, repo: string, branch: string): Promise<{ path: string; packageManager: string }[]> {
        const user = await this.usersService.findOne(userId);
        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        return this.gitProvider.detectLockfiles(user.accessToken, owner, repo, branch);
    }
}
