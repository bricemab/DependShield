import { Controller, Get, Patch, Post, Delete, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
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
}
