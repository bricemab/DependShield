import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async log(
    projectId: number,
    userId: number | null,
    action: string,
    details?: any,
  ) {
    try {
      const log = this.auditRepository.create({
        projectId,
        userId,
        action,
        details,
      });
      const savedLog = await this.auditRepository.save(log);
      console.log(
        `AUDIT LOG SAVED SUCCESSFULLY: ID=${savedLog.id} Project=${projectId} User=${userId}`,
      );
      return savedLog;
    } catch (error) {
      console.error('FAILED TO SAVE AUDIT LOG:', error);
      throw error;
    }
  }

  async findByProject(projectId: number) {
    return this.auditRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 50,
      relations: ['user'], // To show who did it
    });
  }
}
