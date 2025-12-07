import { Module } from '@nestjs/common';
import { EpssService } from './epss.service';

@Module({
  providers: [EpssService],
  exports: [EpssService],
})
export class EpssModule {}
