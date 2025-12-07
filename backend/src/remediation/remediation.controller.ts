import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RemediationService } from './remediation.service';

@Controller('projects/:projectId/remediate')
@UseGuards(AuthGuard('jwt'))
export class RemediationController {
  constructor(private readonly remediationService: RemediationService) {}

  @Post(':vulnerabilityId')
  async fixVulnerability(
    @Param('projectId') projectId: string,
    @Param('vulnerabilityId') vulnerabilityId: string,
    @Req() req,
  ) {
    return this.remediationService.fixVulnerability(
      req.user.userId,
      +projectId,
      +vulnerabilityId,
    );
  }
}
