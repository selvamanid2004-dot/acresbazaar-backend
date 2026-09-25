import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminGuard, JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.adminLogin(body.email, body.password);
  }

  @UseGuards(AdminGuard)
  @Post('admin/change-password')
  async adminChangePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.authService.adminChangePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @UseGuards(AdminGuard)
  @Get('admin/me')
  async getAdminMe(@Request() req: any) {
    return { success: true, admin: { id: req.user.sub, email: req.user.email, name: req.user.name, role: req.user.role } };
  }

  @Post('register')
  async register(
    @Body() body: { name: string; mobile: string; email: string; password: string; role?: string }
  ) {
    return this.authService.userRegister(body);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.userLogin(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return { success: true, user: req.user };
  }
}
