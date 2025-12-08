import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizations/:orgId/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Get()
    findAll(@Param('orgId') orgId: string) {
        return this.apiKeysService.findAll(+orgId);
    }

    @Post()
    create(@Param('orgId') orgId: string, @Body('label') label: string) {
        return this.apiKeysService.create(+orgId, label || 'My API Key');
    }

    @Delete(':id')
    remove(@Param('orgId') orgId: string, @Param('id') id: string) {
        return this.apiKeysService.delete(id, +orgId);
    }
}
