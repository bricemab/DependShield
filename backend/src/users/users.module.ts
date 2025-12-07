import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => OrganizationsModule),
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule { }
