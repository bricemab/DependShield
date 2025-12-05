import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, Inject, forwardRef } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { SchedulerService } from '../scheduler/scheduler.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
    constructor(
        private readonly projectsService: ProjectsService,
        @Inject(forwardRef(() => SchedulerService))
        private readonly schedulerService: SchedulerService,
    ) { }

    @Get()
    findAll(@Req() req) {
        return this.projectsService.findAll(req.user.userId);
    }

    @Get('github/repositories')
    getGithubRepositories(@Req() req) {
        return this.projectsService.getGithubRepositories(req.user.userId);
    }

    @Get('github/repositories/:owner/:repo/branches')
    getGithubBranches(@Req() req, @Param('owner') owner: string, @Param('repo') repo: string) {
        return this.projectsService.getGithubBranches(req.user.userId, owner, repo);
    }

    @Get('github/detect-lockfiles')
    detectLockfiles(
        @Req() req,
        @Query('owner') owner: string,
        @Query('repo') repo: string,
        @Query('branch') branch: string,
    ) {
        return this.projectsService.detectLockfiles(req.user.userId, owner, repo, branch);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req) {
        return this.projectsService.findOne(+id, req.user.userId);
    }

    @Post()
    async create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
        const project = await this.projectsService.create(createProjectDto, req.user.userId);
        if (project.cronSchedule) {
            this.schedulerService.addCronJob(project.id, project.cronSchedule);
        }
        return project;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Req() req) {
        const project = await this.projectsService.update(+id, updateProjectDto, req.user.userId);
        if (project.cronSchedule) {
            this.schedulerService.addCronJob(project.id, project.cronSchedule);
        } else {
            this.schedulerService.removeCronJob(project.id);
        }
        return project;
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Req() req) {
        await this.projectsService.remove(+id, req.user.userId);
        this.schedulerService.removeCronJob(+id);
    }
}
