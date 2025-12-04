import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                transport: {
                    host: configService.get('email.host'),
                    port: configService.get('email.port'),
                    secure: configService.get('email.secure'),
                    auth: {
                        user: configService.get('email.user'),
                        pass: configService.get('email.password'),
                    },
                },
                defaults: {
                    from: configService.get('email.from'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
