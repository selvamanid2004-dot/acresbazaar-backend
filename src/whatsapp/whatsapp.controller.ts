import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  async getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('restart')
  async restart() {
    return this.whatsappService.restartSocket();
  }

  @Post('reset')
  async reset() {
    return this.whatsappService.logoutAndReset();
  }

  @Post('send-test')
  async sendTest(@Body() body: { phone: string; message?: string }) {
    if (!body.phone) {
      throw new BadRequestException('Phone number is required');
    }
    const testMessage =
      body.message ||
      `👋 *AcresBazaar WhatsApp Bot Test*\n\nThis is a verified test message sent from the AcresBazaar automated notification system.\n\n🕒 Timestamp: ${new Date().toLocaleString('en-IN')}`;

    const result = await this.whatsappService.sendTextMessage(body.phone, testMessage);
    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to send test message');
    }
    return { success: true, message: `Test message sent successfully to ${body.phone}!`, messageId: result.messageId };
  }

  @Post('admin-phone')
  async updateAdminPhone(@Body() body: { phone: string }) {
    if (!body.phone) {
      throw new BadRequestException('Admin phone number is required');
    }
    const clean = body.phone.trim();
    const existing = await this.prisma.websiteSetting.findUnique({
      where: { key: 'admin_whatsapp_number' },
    });

    if (existing) {
      await this.prisma.websiteSetting.update({
        where: { key: 'admin_whatsapp_number' },
        data: { value: clean },
      });
    } else {
      await this.prisma.websiteSetting.create({
        data: {
          key: 'admin_whatsapp_number',
          value: clean,
          group: 'whatsapp',
        },
      });
    }

    return { success: true, message: 'Admin WhatsApp alert number saved successfully', adminPhone: clean };
  }
}
