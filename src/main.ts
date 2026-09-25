import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Increase payload limit for image uploads
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ extended: true, limit: '30mb' }));

  // Serve uploaded images statically
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // Enable CORS for frontend clients (Public website on 4200, Admin panel on 5173 / any)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });

  // Global Prefix for all REST API endpoints
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 5001;
  await app.listen(port);
  console.log(`=======================================================`);
  console.log(`🚀 AcresBazaar NestJS REST API is listening on port ${port}`);
  console.log(`🔗 API Base URL: http://localhost:${port}/api`);
  console.log(`=======================================================`);
}

bootstrap();
