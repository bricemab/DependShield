import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('github.clientId'),
            clientSecret: configService.get<string>('github.clientSecret'),
            callbackURL: configService.get<string>('github.callbackUrl'),
            scope: ['user:email', 'repo'], // Request repo scope to access private repos
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
        const user = await this.authService.validateGithubUser(profile, accessToken);
        done(null, user);
    }
}
