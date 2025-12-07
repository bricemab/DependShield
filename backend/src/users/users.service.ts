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

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
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
      .leftJoinAndSelect('user.organizations', 'organization')
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

      if (orgs && orgs.length > 0) {
        const firstOrg = orgs[0];
        // SAFETY CHECK: Only rename if this user is the ONLY member (implies personal org)
        if (firstOrg.users && firstOrg.users.length === 1) {
          await this.organizationsService.update(firstOrg.id, { name: data.organizationName });
        } else {
          // If user joined a shared org (via invite), DO NOT rename it.
          // Instead, create a new personal organization for them.
          await this.organizationsService.create({ name: data.organizationName, users: [user] });
        }
      } else {
        // Should not happen if createDefault is called, but safety:
        await this.organizationsService.create({ name: data.organizationName, users: [user] });
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

  async updateProfile(userId: number, updates: Partial<User>): Promise<User> {
    await this.usersRepository.update(userId, updates);
    return this.findOne(userId);
  }
}
