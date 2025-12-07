import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Controller('projects/:projectId/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Get()
    findAll(@Param('projectId') projectId: string, @Request() req) {
        return this.webhooksService.findAllByProject(+projectId, req.user.userId);
    }

    @Post()
    create(@Param('projectId') projectId: string, @Body() createWebhookDto: CreateWebhookDto, @Request() req) {
        return this.webhooksService.create(+projectId, req.user.userId, createWebhookDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.webhooksService.delete(id, req.user.userId);
    }

    @Post(':id/test')
    test(@Param('id') id: string, @Request() req) {
        return this.webhooksService.testWebhook(id, req.user.userId);
    }
}
