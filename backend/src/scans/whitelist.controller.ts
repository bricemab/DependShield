import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WhitelistService } from './whitelist.service';
import { ProjectsService } from '../projects/projects.service';

@Controller('projects/:projectId/whitelist')
@UseGuards(AuthGuard('jwt'))
export class WhitelistController {
  constructor(
    private readonly whitelistService: WhitelistService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  async findAll(@Param('projectId') projectId: string, @Req() req) {
    await this.projectsService.findOne(+projectId, req.user.userId);
    return this.whitelistService.findAllByProject(+projectId);
  }

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      packageName: string;
      cve?: string;
      title?: string;
      reason?: string;
    },
    @Req() req,
  ) {
    await this.projectsService.findOne(+projectId, req.user.userId);
    return this.whitelistService.create(+projectId, body);
  }

  @Delete(':ruleId')
  async remove(
    @Param('projectId') projectId: string,
    @Param('ruleId') ruleId: string,
    @Req() req,
  ) {
    await this.projectsService.findOne(+projectId, req.user.userId);
    return this.whitelistService.remove(+ruleId, +projectId);
  }
}
