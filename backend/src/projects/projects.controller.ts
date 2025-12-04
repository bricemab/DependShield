import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

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

    @Get('github/detect-lockfile')
    detectLockfile(
        @Req() req,
        @Query('owner') owner: string,
        @Query('repo') repo: string,
        @Query('branch') branch: string,
    ) {
        return this.projectsService.detectLockfile(req.user.userId, owner, repo, branch);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req) {
        return this.projectsService.findOne(+id, req.user.userId);
    }

    @Post()
    create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
        return this.projectsService.create(createProjectDto, req.user.userId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Req() req) {
        return this.projectsService.update(+id, updateProjectDto, req.user.userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req) {
        return this.projectsService.remove(+id, req.user.userId);
    }
}
