import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Module, Controller, Get } from '@nestjs/common';

@Controller('test-redis')
class TestRedisController {
  constructor(@InjectQueue('scans') private scansQueue: Queue) {}

  @Get()
  async test() {
    console.log('Testing Redis connection...');
    try {
      const job = await this.scansQueue.add('test-job', { foo: 'bar' });
      console.log('✅ Job added successfully:', job.id);
      return 'OK';
    } catch (error) {
      console.error('❌ Failed to add job:', error);
      throw error;
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const queue = app.get<Queue>('BullQueue_scans'); // Internal token name usually

  console.log('🚀 Testing Redis Queue...');
  try {
    const client = queue.client;
    await client.ping();
    console.log('✅ Redis PING successful');

    const job = await queue.add('test-job', { test: true });
    console.log('✅ Job added to queue:', job.id);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  }

  await app.close();
}

bootstrap();
