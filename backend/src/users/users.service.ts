import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
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
        return this.usersRepository.findOne({ where: { id } });
    }
}
