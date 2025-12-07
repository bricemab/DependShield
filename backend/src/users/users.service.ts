import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

import { OrganizationsService } from '../organizations/organizations.service';

import { PlanType } from '../organizations/organization.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private organizationsService: OrganizationsService,
  ) { }

  async findByGithubId(githubId: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { githubId } });
  }

  async createOrUpdate(userData: Partial<User>): Promise<User> {
    let user = await this.findByGithubId(userData.githubId);
    if (!user) {
      user = this.usersRepository.create(userData);
    } else {
      this.usersRepository.merge(user, userData);
    }
    return this.usersRepository.save(user);
  }

  async findOne(id: number): Promise<User | undefined> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .addSelect('user.accessToken')
      .getOne();
  }

  async completeOnboarding(
    userId: number,
    data: { role: any; companySize: any; discoverySource: any; organizationName?: string },
  ): Promise<User> {
    const user = await this.findOne(userId);
    if (!user) throw new Error('User not found');

    // Update user fields
    user.role = data.role;
    user.companySize = data.companySize;
    user.discoverySource = data.discoverySource;
    user.isOnboarded = true;
    await this.usersRepository.save(user);

    // Update Organization Name if provided
    if (data.organizationName) {
      const orgs = await this.organizationsService.findByUser(userId);
      // Logic: Update the first organization found (Assuming it's the personal/default one for now)
      if (orgs && orgs.length > 0) {
        await this.organizationsService.update(orgs[0].id, { name: data.organizationName });
      }
    }

    return user;
  }

  async getUserPlan(userId: number): Promise<PlanType> {
    const orgs = await this.organizationsService.findByUser(userId);
    if (orgs.length > 0) {
      return orgs[0].plan; // Return effective plan from org
    }
    return PlanType.STARTER; // Fallback
  }
}
