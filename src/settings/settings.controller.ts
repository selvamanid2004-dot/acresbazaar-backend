import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // Public & Admin: Fetch all settings
  @Get()
  async getAll() {
    return this.settingsService.getAllSettings();
  }

  // Public: Get settings by group (home, about, service, logo, contact)
  @Get('group/:group')
  async getByGroup(@Param('group') group: string) {
    return this.settingsService.getSettingsByGroup(group);
  }

  // Admin: Save settings
  @UseGuards(AdminGuard)
  @Post()
  async update(@Body() body: { items: { key: string; value: string; group?: string }[] }) {
    return this.settingsService.updateSettings(body.items || []);
  }

  // Admin: Upload logo directly from computer/mobile
  @UseGuards(AdminGuard)
  @Post('upload-logo')
  async uploadLogo(@Body() body: { image: string; fileName?: string }) {
    return this.settingsService.uploadLogo(body.image, body.fileName);
  }

  // Admin: Upload banner or section graphic image directly
  @UseGuards(AdminGuard)
  @Post('upload-image')
  async uploadImage(@Body() body: { image: string; key: string; group?: string }) {
    return this.settingsService.uploadImage(body.image, body.key, body.group || 'home');
  }

  // Admin: Remove logo
  @UseGuards(AdminGuard)
  @Delete('logo')
  async removeLogo() {
    return this.settingsService.removeLogo();
  }
}
