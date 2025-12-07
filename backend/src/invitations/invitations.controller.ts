import { Controller, Post, Get, Body, Param, UseGuards, Request, Delete, BadRequestException } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    // 1. Create Invitation (Protected, must be member of org)
    @Post('organization/:orgId')
    @UseGuards(AuthGuard('jwt'))
    async create(@Request() req, @Param('orgId') orgId: string, @Body() body: { email: string }) {
        // Permission check handled ideally by service or here?
        // Simple check: is user in org? (Can delegate to OrganizationGuard later)
        // For now, Service creates logic is fine but we should check authz.
        // Assuming caller verified access to Organization via frontend + guard.
        // TODO: Add proper Authorization check.
        if (!body.email) throw new BadRequestException('Email is required');
        return this.invitationsService.create(body.email, +orgId, req.user.userId);
    }

    // 2. List Pending Invitations for Org
    @Get('organization/:orgId')
    @UseGuards(AuthGuard('jwt'))
    async findAll(@Param('orgId') orgId: string) {
        return this.invitationsService.findByOrganization(+orgId);
    }

    // 3. Delete Invitation (Cancel)
    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async delete(@Param('id') id: string) {
        return this.invitationsService.delete(+id);
    }

    // 4. Validate Token (Public - used by Landing Page)
    @Get('token/:token')
    async validate(@Param('token') token: string) {
        // Return invite details to display "You are invited to join X"
        const invite = await this.invitationsService.validateToken(token);
        return {
            email: invite.email,
            organizationName: invite.organization.name,
            inviterName: invite.inviter.username
        };
    }
    // 5. Accept Invitation (Protected - User must be logged in)
    @Post('accept')
    @UseGuards(AuthGuard('jwt'))
    async accept(@Request() req, @Body() body: { token: string }) {
        return this.invitationsService.accept(body.token, req.user.userId);
    }

    @Post('decline')
    @UseGuards(AuthGuard('jwt'))
    async decline(@Body() body: { token: string }) {
        return this.invitationsService.decline(body.token);
    }
}
