import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './project.entity';
import { UsersModule } from '../users/users.module';
import { ProvidersModule } from '../providers/providers.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project]),
        UsersModule,
        ProvidersModule,
        forwardRef(() => SchedulerModule),
    ],
    controllers: [ProjectsController],
    providers: [ProjectsService],
    exports: [ProjectsService],
})
export class ProjectsModule { }
