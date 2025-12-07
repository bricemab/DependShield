import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { Invitation } from './invitation.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Invitation]),
        NotificationsModule,
        OrganizationsModule,
        UsersModule
    ],
    controllers: [InvitationsController],
    providers: [InvitationsService],
})
export class InvitationsModule { }
