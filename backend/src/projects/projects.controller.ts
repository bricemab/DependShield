import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, Inject, forwardRef, Header } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { SchedulerService } from '../scheduler/scheduler.service';

@Controller('projects')
export class ProjectsController {
    constructor(
        private readonly projectsService: ProjectsService,
        @Inject(forwardRef(() => SchedulerService))
        private readonly schedulerService: SchedulerService,
    ) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    findAll(@Req() req) {
        return this.projectsService.findAll(req.user.userId);
    }

    @Get('github/repositories')
    @UseGuards(AuthGuard('jwt'))
    getGithubRepositories(@Req() req) {
        return this.projectsService.getGithubRepositories(req.user.userId);
    }

    @Get('github/repositories/:owner/:repo/branches')
    @UseGuards(AuthGuard('jwt'))
    getGithubBranches(@Req() req, @Param('owner') owner: string, @Param('repo') repo: string) {
        return this.projectsService.getGithubBranches(req.user.userId, owner, repo);
    }

    @Get('github/detect-lockfiles')
    @UseGuards(AuthGuard('jwt'))
    detectLockfiles(
        @Req() req,
        @Query('owner') owner: string,
        @Query('repo') repo: string,
        @Query('branch') branch: string,
    ) {
        return this.projectsService.detectLockfiles(req.user.userId, owner, repo, branch);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    findOne(@Param('id') id: string, @Req() req) {
        return this.projectsService.findOne(+id, req.user.userId);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
        const project = await this.projectsService.create(createProjectDto, req.user.userId);
        if (project.cronSchedule) {
            this.schedulerService.addCronJob(project.id, project.cronSchedule);
        }
        return project;
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
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
    @UseGuards(AuthGuard('jwt'))
    async remove(@Param('id') id: string, @Req() req) {
        await this.projectsService.remove(+id, req.user.userId);
        this.schedulerService.removeCronJob(+id);
    }

    @Get(':id/badge')
    @Header('Content-Type', 'image/svg+xml')
    @Header('Cache-Control', 'no-cache')
    async getBadge(@Param('id') id: string) {
        // Retrieve project to get name
        const project = await this.projectsService.findOneById(+id);

        // Retrieve latest scan details (Mocked for now as per previous step, ideally fetching real score)
        // const latestScan = await this.scansService.findLastByProject(+id);
        const score = 85;

        let color = '#4c1'; // Green
        if (score < 50) color = '#e05d44'; // Red
        else if (score < 80) color = '#dfb317'; // Yellow

        // Dynamic Width Calculation
        // "DependShield" is 12 chars.
        const name = 'DependShield';
        const nameWidth = 100; // Fixed width for "DependShield" to look substantial
        const scoreWidth = 45; // Fixed width for "85/100"
        const totalWidth = nameWidth + scoreWidth;

        return `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${name}: ${score}/100">
            <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
            <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
            <g clip-path="url(#r)">
                <rect width="${nameWidth}" height="20" fill="#555"/>
                <rect x="${nameWidth}" width="${scoreWidth}" height="20" fill="${color}"/>
                <rect width="${totalWidth}" height="20" fill="url(#s)"/>
            </g>
            <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
                <text aria-hidden="true" x="${nameWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(nameWidth - 10) * 10}">${name}</text>
                <text x="${nameWidth * 5}" y="140" transform="scale(.1)" fill="#fff" textLength="${(nameWidth - 10) * 10}">${name}</text>
                <text aria-hidden="true" x="${(nameWidth + scoreWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(scoreWidth - 10) * 10}">${score}/100</text>
                <text x="${(nameWidth + scoreWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(scoreWidth - 10) * 10}">${score}/100</text>
            </g>
        </svg>
        `.trim();
    }
    @Get(':id/audit')
    @UseGuards(AuthGuard('jwt'))
    async getAuditLogs(@Param('id') id: string, @Req() req) {
        console.log(`Fetching audit logs for project ${id} by user ${req.user.userId}`);
        return this.projectsService.getAuditLogs(+id, req.user.userId);
    }

    @Get(':id/benchmark')
    @UseGuards(AuthGuard('jwt'))
    async getBenchmark(@Param('id') id: string) {
        // Mock benchmark logic
        return {
            globalAverage: 72,
            yourScore: 85,
            percentile: 80
        };
    }
}
