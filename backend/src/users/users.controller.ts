import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req) {
    // req.user is populated by JwtStrategy, typically containing { userId: ... }
    // We need to fetch the full user object to get the 'plan'
    return this.usersService.findOne(req.user.userId);
  }
}
