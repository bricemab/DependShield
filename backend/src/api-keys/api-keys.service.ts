import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './api-key.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeysRepository: Repository<ApiKey>,
    ) { }

    async create(organizationId: number, label: string): Promise<{ apiKey: ApiKey; token: string }> {
        const prefix = 'sk_live_';
        const randomBytes = crypto.randomBytes(24).toString('hex');
        const token = `${prefix}${randomBytes}`;

        // Hash the token
        const salt = await bcrypt.genSalt();
        const keyHash = await bcrypt.hash(token, salt);

        const apiKey = this.apiKeysRepository.create({
            label,
            keyHash,
            prefix: token.substring(0, 12) + '...',
            organizationId,
        });

        const savedKey = await this.apiKeysRepository.save(apiKey);

        return { apiKey: savedKey, token };
    }

    async findAll(organizationId: number): Promise<ApiKey[]> {
        return this.apiKeysRepository.find({
            where: { organizationId },
            order: { createdAt: 'DESC' },
        });
    }

    async delete(id: string, organizationId: number): Promise<void> {
        await this.apiKeysRepository.delete({ id, organizationId });
    }

    async validateKey(token: string): Promise<ApiKey | null> {
        // Expected format: sk_live_...
        // We can extract prefix but lookup needs to search by hash or we scan all keys which is bad.
        // Ideally we store keys with a lookup index (like key ID or first chars not in hash).
        // Current implementation stores 'prefix' but that's for display (masked).
        // To validate EFFICIENTLY we usually need:
        // 1. Send ID + Token ? No, usually just Token.
        // 2. Token structure: {prefix}_{publicID}_{secret}

        // For this MVP, since we didn't design split token, we might need to rely on the prefix to filter?
        // BUT we only store hashed version. We can't lookup by hash.
        // FIX: We need to store a "lookup" part of the key separately or iterate (slow).
        // Let's assume for now we iterate over keys that match the prefix? No, prefix is constant.

        // BETTER APPROACH for MVP:
        // When creating, generate a UUID as key ID and a secret.
        // Token = {uuid}.{secret}
        // Lookup by UUID, verify hash of secret.
        // But I just changed the entity to use UUID as primary key.

        // Let's assume the token IS the secret for now and we made a mistake in design for lookup.
        // To fix this without complex migration: 
        // We'll iterate all keys? NO. 
        // We should fix the generation to be `sk_live_${id}_${random}` but we don't have ID before save.

        // REVISED STRATEGY: 
        // Token = `sk_live_${random}`. 
        // We can't lookup efficiently.
        // Let's add a `tokenIndex` column which is a hash of the token (fast hash) or just the first 16 chars?

        // For now, I will implement a check that iterates (BAD) or fix the entity to support lookup.
        // I'll update the Entity to validatable design:
        // Token = `sk_live_${public_id}${secret}`
        return null; // TODO: Implement validation
    }
}
