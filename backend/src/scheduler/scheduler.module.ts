import { Module, forwardRef } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ProjectsModule } from '../projects/projects.module';
import { ScansModule } from '../scans/scans.module';

@Module({
  imports: [forwardRef(() => ProjectsModule), ScansModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
