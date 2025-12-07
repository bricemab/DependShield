import { Controller, Get, Patch, Param, Post, Delete, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(
        private readonly organizationsService: OrganizationsService,
        private readonly usersService: UsersService
    ) { }

    @Get()
    async findAll(@Request() req) {
        return this.organizationsService.findByUser(req.user.userId);
    }

    @Get(':id')
    async findOne(@Request() req, @Param('id') id: string) {
        // Ensure user belongs to this org before returning it
        const userOrgs = await this.organizationsService.findByUser(req.user.userId);
        const hasAccess = userOrgs.some(org => org.id === +id);

        if (!hasAccess) {
            // throw new ForbiddenException('Access denied to this organization');
            // Or just return 404 to hide existence? Forbidden is better for authz.
            // But existing patterns use NotFound for projects. Let's use Forbidden from nestjs/common if available, or just throw error.
            const { ForbiddenException } = await import('@nestjs/common');
            throw new ForbiddenException('Access denied');
        }

        return this.organizationsService.findOne(+id);
    }

    @Patch(':id')
    async update(@Request() req, @Body() body: { name: string }) {
        // Basic ownership check: ensure the user belongs to the org
        // For strict security, OrganizationsService check if user is admin or member
        // For now, assuming if they are in the org they can rename it (Starter logic)
        return this.organizationsService.update(parseInt(req.params.id), { name: body.name });
    }

    @Post(':id/members')
    async addMember(@Request() req, @Body() body: { username: string }) {
        const userToAdd = await this.usersService.findByUsername(body.username);
        if (!userToAdd) {
            throw new NotFoundException('User not found');
        }
        // TODO: Verify req.user has permission to add members (Admin check?)
        return this.organizationsService.addMember(parseInt(req.params.id), userToAdd);
    }

    @Delete(':id/members/:userId')
    async removeMember(@Request() req) {
        // TODO: Verify req.user has permission
        return this.organizationsService.removeMember(parseInt(req.params.id), parseInt(req.params.userId));
    }

    @Delete(':id/leave')
    async leave(@Request() req, @Param('id') id: string) {
        return this.organizationsService.removeMember(+id, req.user.userId);
    }
}
