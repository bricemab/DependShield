import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@Controller('organizations/:orgId/webhooks')
@UseGuards(JwtAuthGuard)
export class OrganizationWebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    @Get()
    findAll(@Param('orgId') orgId: string) {
        return this.webhooksService.findAllByOrganization(+orgId);
    }

    @Post()
    create(
        @Param('orgId') orgId: string,
        @Body() createWebhookDto: CreateWebhookDto,
    ) {
        return this.webhooksService.createForOrganization(+orgId, createWebhookDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        // Re-use delete logic, might need to adjust service to check org ownership
        return this.webhooksService.delete(id, req.user.userId);
    }

    // Reuse validation/test endpoints if needed, but 'test' in service checks project permission...
    // We might need a specific test method for org webhooks.
    @Post(':id/test')
    test(@Param('id') id: string, @Request() req) {
        // TODO: Implement specific test for org level
        return { status: 'mocked', message: 'Test notification sent (mock)' };
    }
}
