import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async validateGithubUser(profile: any, accessToken: string): Promise<any> {
    const { id, username, photos, emails } = profile;
    const email = emails && emails.length > 0 ? emails[0].value : null;
    const avatarUrl = photos && photos.length > 0 ? photos[0].value : null;

    // Check if user exists BEFORE creating/updating to know if we should send a welcome email
    const existingUser = await this.usersService.findByGithubId(id);

    const user = await this.usersService.createOrUpdate({
      githubId: id,
      username,
      email,
      avatarUrl,
      accessToken,
    });

    if (!existingUser && email) {
      // New user! Send welcome email
      this.notificationsService.sendWelcomeEmail(email, username || 'User');
    }

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
