import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Octokit } from '@octokit/rest';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private projectsRepository: Repository<Project>,
        private usersService: UsersService,
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
        if (user) {
            console.log('🔑 Access token exists:', user.accessToken ? 'YES' : 'NO');
            if (user.accessToken) {
                console.log('🔑 Token length:', user.accessToken.length);
            }
        }

        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        const octokit = new Octokit({ auth: user.accessToken });
        const { data } = await octokit.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100,
        });

        return data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            private: repo.private,
        }));
    }

    async getGithubBranches(userId: number, owner: string, repo: string): Promise<any[]> {
        const user = await this.usersService.findOne(userId);
        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        const octokit = new Octokit({ auth: user.accessToken });
        const { data } = await octokit.repos.listBranches({ owner, repo });

        return data.map((branch) => ({
            name: branch.name,
            protected: branch.protected,
        }));
    }

    async detectLockfiles(userId: number, owner: string, repo: string, branch: string): Promise<{ path: string; packageManager: string }[]> {
        const user = await this.usersService.findOne(userId);
        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        const octokit = new Octokit({ auth: user.accessToken });
        const lockfiles: { path: string; packageManager: string }[] = [];

        try {
            // Get the recursive tree
            const { data } = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: 'true',
            });

            const lockfileNames = {
                'package-lock.json': 'npm',
                'yarn.lock': 'yarn',
                'pnpm-lock.yaml': 'pnpm',
                'bun.lockb': 'bun',
            };

            for (const item of data.tree) {
                if (item.type === 'blob' && item.path) {
                    const fileName = item.path.split('/').pop();
                    if (fileName && fileName in lockfileNames) {
                        lockfiles.push({
                            path: item.path,
                            packageManager: lockfileNames[fileName as keyof typeof lockfileNames],
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error detecting lockfiles:', error);
        }

        return lockfiles;
    }
}
