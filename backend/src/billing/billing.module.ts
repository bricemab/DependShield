import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingController } from './billing.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/organization.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([Organization]),
        UsersModule
    ],
    controllers: [BillingController],
    providers: [StripeService],
    exports: [StripeService],
})
export class BillingModule { }
