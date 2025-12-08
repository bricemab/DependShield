import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom'; // Using custom or header strategy
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(private apiKeysService: ApiKeysService) {
        super();
    }

    async validate(req: Request): Promise<any> {
        const header = (req.headers as any)['x-api-key'];
        if (!header) {
            throw new UnauthorizedException('Missing X-API-KEY header');
        }

        const apiKey = await this.apiKeysService.validateKey(header);
        if (!apiKey) {
            throw new UnauthorizedException('Invalid API Key');
        }

        // Return a user-like object or specific api context
        return {
            organizationId: apiKey.organizationId,
            type: 'api-key',
            apiKeyId: apiKey.id
        };
    }
}
