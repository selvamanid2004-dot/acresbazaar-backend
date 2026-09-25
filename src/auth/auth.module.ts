import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AdminGuard, JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aura_estate_jwt_secret_super_secure_key_2026',
      signOptions: { expiresIn: '7d' }
    })
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AdminGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, AdminGuard]
})
export class AuthModule {}
