import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from './invitation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvitationsService {
    constructor(
        @InjectRepository(Invitation)
        private invitationsRepository: Repository<Invitation>,
        private notificationsService: NotificationsService,
        private organizationsService: OrganizationsService,
        private usersService: UsersService,
    ) { }

    async create(email: string, orgId: number, inviterId: number): Promise<Invitation> {
        // Check if already member
        const org = await this.organizationsService.findOne(orgId);
        if (!org) throw new NotFoundException('Organization not found');

        const existingUser = await this.usersService.findByUsername(email); // Assuming username can be email, or findByEmail if exists
        // Actually UserService.findByUsername finds by username which is different from email potentially.
        // We really should look up by email if possible or just proceed. 
        // If the user exists, check if they are already in the org.
        if (existingUser) {
            const isMember = org.users.some(u => u.id === existingUser.id);
            if (isMember) {
                throw new BadRequestException('User is already a member of this organization.');
            }
        }

        // Check if pending invitation exists
        const existingInvite = await this.invitationsRepository.findOne({
            where: { email, organizationId: orgId, status: 'pending' }
        });

        if (existingInvite) {
            // Check if expired, if not, maybe resend? Or throw?
            if (new Date() < existingInvite.expiresAt) {
                throw new BadRequestException('An active invitation already exists for this email.');
            } else {
                // Expired, delete or mark expired to create new one
                existingInvite.status = 'expired';
                await this.invitationsRepository.save(existingInvite);
            }
        }

        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h expiry

        const invitation = this.invitationsRepository.create({
            email,
            organizationId: orgId,
            inviterId,
            token,
            expiresAt,
            status: 'pending'
        });

        await this.invitationsRepository.save(invitation);

        const inviter = await this.usersService.findOne(inviterId);
        await this.notificationsService.sendInvitationEmail(email, inviter.username || 'Admin', org.name, token);

        return invitation;
    }

    async validateToken(token: string): Promise<Invitation> {
        const invite = await this.invitationsRepository.findOne({
            where: { token },
            relations: ['organization', 'inviter']
        });

        if (!invite) throw new NotFoundException('Invitation not found');
        if (invite.status !== 'pending') throw new BadRequestException('Invitation is no longer valid');
        if (new Date() > invite.expiresAt) throw new BadRequestException('Invitation has expired');

        return invite;
    }

    async accept(token: string, userId: number): Promise<void> {
        const invite = await this.validateToken(token);
        const user = await this.usersService.findOne(userId);

        await this.organizationsService.addMember(invite.organizationId, user);

        invite.status = 'accepted';
        await this.invitationsRepository.save(invite);
    }

    async findByOrganization(orgId: number): Promise<Invitation[]> {
        return this.invitationsRepository.find({
            where: { organizationId: orgId, status: 'pending' },
            order: { createdAt: 'DESC' }
        });
    }

    async decline(token: string): Promise<void> {
        const invite = await this.validateToken(token);

        // Just mark rejected
        invite.status = 'rejected';
        await this.invitationsRepository.save(invite);
    }

    async delete(id: number): Promise<void> {
        await this.invitationsRepository.delete(id);
    }
}
