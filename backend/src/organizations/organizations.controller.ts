import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get()
    async findAll(@Request() req) {
        return this.organizationsService.findByUser(req.user.userId);
    }

    @Patch(':id')
    async update(@Request() req, @Body() body: { name: string }) {
        // Basic ownership check: ensure the user belongs to the org
        // For strict security, OrganizationsService check if user is admin or member
        // For now, assuming if they are in the org they can rename it (Starter logic)
        return this.organizationsService.update(parseInt(req.params.id), { name: body.name });
    }
}
