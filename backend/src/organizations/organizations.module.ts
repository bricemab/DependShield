import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Organization]),
        forwardRef(() => UsersModule),
    ],
    controllers: [OrganizationsController],
    providers: [OrganizationsService],
    exports: [OrganizationsService],
})
export class OrganizationsModule { }
