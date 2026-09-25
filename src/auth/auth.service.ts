import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // 1. Admin Login
  async adminLogin(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    const admin = await this.prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    if (!admin) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      type: 'admin'
    };

    const token = this.jwtService.sign(payload);
    return {
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };
  }

  // 2. Admin Change Password
  async adminChangePassword(adminId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current and new password are required');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin account not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash }
    });

    return { success: true, message: 'Password updated successfully' };
  }

  // 3. User Register (Buyer, Seller, Dealer, Common People)
  async userRegister(data: { name: string; mobile: string; email: string; password: string; role?: string }) {
    const { name, mobile, email, password, role = 'BUYER' } = data;
    if (!email || !password || !name) {
      throw new BadRequestException('Name, email, and password are required');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        mobile: mobile ? mobile.trim() : '',
        email: cleanEmail,
        passwordHash,
        role: role.toUpperCase(),
        isActive: true
      }
    });

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'user'
    };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    };
  }

  // 4. User Login (Buyer, Seller, Dealer)
  async userLogin(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated by administrator');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'user'
    };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    };
  }
}
