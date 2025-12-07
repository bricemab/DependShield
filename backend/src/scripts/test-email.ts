import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const notificationsService = app.get(NotificationsService);

  const emailConfig = {
    host: configService.get('email.host'),
    port: configService.get('email.port'),
    secure: configService.get('email.secure'),
    user: configService.get('email.user'),
    from: configService.get('email.from'),
  };

  console.log('📧 Current Email Configuration:', emailConfig);

  const testEmail = configService.get('email.user'); // Send to self
  if (!testEmail) {
    console.error('❌ EMAIL_USER is not set in .env');
    await app.close();
    return;
  }

  console.log(`🚀 Sending test email to ${testEmail}...`);

  try {
    // Create a mock scan object for the test
    const mockScan: any = {
      id: 999,
      status: 'COMPLETED',
      score: 100,
      vulnerabilitiesCount: 0,
      project: {
        name: 'Test Project',
      },
    };

    await notificationsService.sendScanResultEmail(testEmail, mockScan);
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }

  await app.close();
}

bootstrap();
