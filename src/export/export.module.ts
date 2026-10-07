import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'aura_estate_jwt_secret_super_secure_key_2026',
        signOptions: { expiresIn: '7d' }
      }),
      inject: [ConfigService],
    })
  ],
  providers: [ExportService],
  controllers: [ExportController],
  exports: [ExportService]
})
export class ExportModule {}
