import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../users/user.entity';

@Injectable()
export class OrganizationsService {
    constructor(
        @InjectRepository(Organization)
        private organizationsRepository: Repository<Organization>,
    ) { }

    async createDefault(user: User): Promise<Organization> {
        const orgName = user.username ? `${user.username}'s Organization` : 'My Organization';
        const org = this.organizationsRepository.create({
            name: orgName,
            users: [user],
            ownerId: user.id
        });
        return this.organizationsRepository.save(org);
    }

    async create(data: Partial<Organization>): Promise<Organization> {
        const org = this.organizationsRepository.create(data);
        return this.organizationsRepository.save(org);
    }

    async findOne(id: number): Promise<Organization | null> {
        return this.organizationsRepository.findOne({
            where: { id },
            relations: ['users'],
        });
    }

    async findByUser(userId: number): Promise<Organization[]> {
        return this.organizationsRepository
            .createQueryBuilder('org')
            .leftJoinAndSelect('org.users', 'user')
            .where('user.id = :userId', { userId })
            .getMany();
    }

    async update(id: number, updateData: Partial<Organization>): Promise<Organization> {
        await this.organizationsRepository.update(id, updateData);
        return this.organizationsRepository.findOne({ where: { id } });
    }

    async addMember(orgId: number, user: User): Promise<Organization> {
        const org = await this.findOne(orgId);
        if (!org) {
            throw new Error('Organization not found');
        }
        // Check if user is already member
        const isMember = org.users.some(u => u.id === user.id);
        if (!isMember) {
            org.users.push(user);
            return this.organizationsRepository.save(org);
        }
        return org;
    }

    async removeMember(orgId: number, userIdToRemove: number): Promise<Organization> {
        const org = await this.findOne(orgId);
        if (!org) {
            throw new Error('Organization not found');
        }
        org.users = org.users.filter(u => u.id !== userIdToRemove);
        return this.organizationsRepository.save(org);
    }
}
