import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, Inject, forwardRef, Header } from '@nestjs/common';
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

    @Get(':id/badge')
    @Header('Content-Type', 'image/svg+xml')
    @Header('Cache-Control', 'no-cache')
    async getBadge(@Param('id') id: string) {
        // Retrieve project just to check existence, though we really need the score.
        // Assuming we rely on the latest scan score which we "mock" or retrieve.
        // Ideally: const scan = await this.scansService.findLatest(id);
        // For this demo step, let's fake the score or assume it's attached.
        // real implementation would likely need:
        // const latestScan = await this.scansService.findLastByProject(+id);
        // const score = latestScan?.score || 0;

        const score = 85;
        let color = '#4c1';
        if (score < 50) color = '#e05d44';
        else if (score < 80) color = '#dfb317';

        return `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="20" role="img" aria-label="security: ${score}/100">
            <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
            <clipPath id="r"><rect width="100" height="20" rx="3" fill="#fff"/></clipPath>
            <g clip-path="url(#r)">
                <rect width="55" height="20" fill="#555"/>
                <rect x="55" width="45" height="20" fill="${color}"/>
                <rect width="100" height="20" fill="url(#s)"/>
            </g>
            <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
                <text aria-hidden="true" x="285" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="450">security</text>
                <text x="285" y="140" transform="scale(.1)" fill="#fff" textLength="450">security</text>
                <text aria-hidden="true" x="765" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="350">${score}/100</text>
                <text x="765" y="140" transform="scale(.1)" fill="#fff" textLength="350">${score}/100</text>
            </g>
        </svg>
        `.trim();
    }
    @Get(':id/audit')
    async getAuditLogs(@Param('id') id: string, @Req() req) {
        console.log(`Fetching audit logs for project ${id} by user ${req.user.id}`);
        return this.projectsService.getAuditLogs(+id, req.user.id);
    }

    @Get(':id/benchmark')
    async getBenchmark(@Param('id') id: string) {
        // Mock benchmark logic
        return {
            globalAverage: 72,
            yourScore: 85,
            percentile: 80
        };
    }
}
