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
        const user = await this.usersService.findOne(userId);
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

    async detectLockfile(userId: number, owner: string, repo: string, branch: string): Promise<string | null> {
        const user = await this.usersService.findOne(userId);
        if (!user || !user.accessToken) {
            throw new ForbiddenException('GitHub access token not found');
        }

        const octokit = new Octokit({ auth: user.accessToken });
        const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];

        for (const lockfile of lockfiles) {
            try {
                await octokit.repos.getContent({
                    owner,
                    repo,
                    path: lockfile,
                    ref: branch,
                });
                // If we get here, the file exists
                if (lockfile === 'package-lock.json') return 'npm';
                if (lockfile === 'yarn.lock') return 'yarn';
                if (lockfile === 'pnpm-lock.yaml') return 'pnpm';
                if (lockfile === 'bun.lockb') return 'bun';
            } catch (error) {
                // File not found, continue
            }
        }

        return null; // No lockfile found
    }
}
