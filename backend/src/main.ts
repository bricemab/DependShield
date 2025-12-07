import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  // Check Redis Connection
  try {
    const queue = app.get<Queue>('BullQueue_scans');
    await queue.client.ping();
    logger.log('✅ Redis connection successful');
  } catch (error) {
    logger.error(
      '❌ Failed to connect to Redis. Please ensure Redis is running.',
    );
    logger.error(error);
    process.exit(1);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
