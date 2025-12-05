import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const port = configService.get<number>('email.port');
                const isSecure = port === 465; // Force secure=true for 465, false for others (like 587)

                return {
                    transport: {
                        host: configService.get('email.host'),
                        port: port,
                        secure: isSecure,
                        auth: {
                            user: configService.get('email.user'),
                            pass: configService.get('email.password'),
                        },
                        // Gmail specific settings for STARTTLS (port 587)
                        tls: {
                            ciphers: 'SSLv3',
                            rejectUnauthorized: false,
                        },
                    },
                    defaults: {
                        from: configService.get('email.from'),
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
