import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import * as fs from 'fs';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set Winston as the application logger
  const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(winstonLogger);

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

  // Fallback for missing /uploads/* images (prevents broken 404 images on ephemeral instances)
  app.use('/uploads', (req: any, res: any, next: any) => {
    const reqPath = (req.path || '').toLowerCase();
    if (reqPath.includes('logo')) {
      try {
        const files = fs.readdirSync(uploadsDir).filter(f => f.toLowerCase().startsWith('logo-'));
        if (files.length > 0) {
          // Serve newest logo on disk
          files.sort().reverse();
          const latestLogo = join(uploadsDir, files[0]);
          if (fs.existsSync(latestLogo)) {
            return res.sendFile(latestLogo);
          }
        }
      } catch {}
    }
    return res.redirect('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80');
  });

  // Security Headers Middleware
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Enable CORS for frontend clients
  const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5001',
    'https://acresbazaar.com',
    'https://www.acresbazaar.com',
    'https://acresbazaar-backend.onrender.com',
    'https://acresbazaar-admin.onrender.com'
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com') || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allows client while logging
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix for all REST API endpoints
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Global Exception Filter & Logging Interceptor
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT || 5001;
  await app.listen(port, '0.0.0.0');
  winstonLogger.log(`🚀 AcresBazaar NestJS REST API is listening on port ${port}`, 'Bootstrap');
  winstonLogger.log(`🔗 API Base URL: http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap();
