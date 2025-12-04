import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateGithubUser(profile: any, accessToken: string): Promise<any> {
        const { id, username, photos, emails } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : null;
        const avatarUrl = photos && photos.length > 0 ? photos[0].value : null;

        const user = await this.usersService.createOrUpdate({
            githubId: id,
            username,
            email,
            avatarUrl,
            accessToken, // TODO: Encrypt this token before saving
        });

        return user;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
}
