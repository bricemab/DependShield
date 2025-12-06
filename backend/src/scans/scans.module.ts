import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { Scan } from './scan.entity';
import { Vulnerability } from './vulnerability.entity';
import { WhitelistRule } from './whitelist-rule.entity';
import { WhitelistService } from './whitelist.service';
import { WhitelistController } from './whitelist.controller';
import { ProjectsModule } from '../projects/projects.module';
import { ScanProcessor } from './scan.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { GithubService } from './github.service';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Scan, Vulnerability, WhitelistRule]),
        BullModule.registerQueue({
            name: 'scans',
        }),
        forwardRef(() => ProjectsModule),
        NotificationsModule,
        ConfigModule,
        AuditModule,
        UsersModule,
    ],
    controllers: [ScansController, WhitelistController],
    providers: [ScansService, ScanProcessor, WhitelistService, GithubService],
    exports: [ScansService, WhitelistService, GithubService],
})
export class ScansModule { }
