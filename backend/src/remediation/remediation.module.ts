import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemediationService } from './remediation.service';
import { RemediationController } from './remediation.controller';
import { Vulnerability } from '../scans/vulnerability.entity';
import { Project } from '../projects/project.entity';
import { UsersModule } from '../users/users.module';
import { ScansModule } from '../scans/scans.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vulnerability, Project]),
    UsersModule,
    ScansModule,
    ConfigModule,
  ],
  controllers: [RemediationController],
  providers: [RemediationService],
})
export class RemediationModule {}
