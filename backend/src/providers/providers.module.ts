import { Module } from '@nestjs/common';
import { GithubProvider } from './github/github.provider';

@Module({
  providers: [GithubProvider],
  exports: [GithubProvider],
})
export class ProvidersModule {}
