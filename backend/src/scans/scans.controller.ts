import { Controller, Get, Post, Param, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScansService } from './scans.service';

@Controller('scans')
@UseGuards(AuthGuard('jwt'))
export class ScansController {
    constructor(private readonly scansService: ScansService) { }

    @Post('trigger/:projectId')
    triggerScan(@Param('projectId') projectId: string, @Req() req) {
        return this.scansService.triggerScan(+projectId, req.user.userId);
    }

    @Get('project/:projectId')
    findAll(
        @Param('projectId') projectId: string,
        @Req() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.scansService.findAll(+projectId, req.user.userId, +page, +limit);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.scansService.findOne(+id);
    }
}
