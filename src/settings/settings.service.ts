import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Get all settings as key-value map
  async getAllSettings() {
    const settings = await this.prisma.websiteSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return { success: true, settings: map, list: settings };
  }

  // Get settings by group (home, about, service, logo, contact)
  async getSettingsByGroup(group: string) {
    const settings = await this.prisma.websiteSetting.findMany({
      where: { group }
    });
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return { success: true, group, settings: map, list: settings };
  }

  // Update multiple settings at once (or single)
  async updateSettings(items: { key: string; value: string; group?: string }[]) {
    const updatedList = [];
    for (const item of items) {
      const updated = await this.prisma.websiteSetting.upsert({
        where: { key: item.key },
        update: {
          value: item.value,
          ...(item.group ? { group: item.group } : {})
        },
        create: {
          key: item.key,
          value: item.value,
          group: item.group || 'home'
        }
      });
      updatedList.push(updated);
    }
    return { success: true, message: 'Settings saved successfully', count: updatedList.length };
  }

  // Upload logo (from computer/mobile as base64 data URL)
  async uploadLogo(dataUrl: string, fileName?: string) {
    let logoUrl = dataUrl;

    try {
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt.includes('svg') ? 'svg' : rawExt.includes('webp') ? 'webp' : rawExt.includes('png') ? 'png' : 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const savedName = `logo-${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, savedName);
          // FIX: actually write the file to disk (was missing before — URL was stored but file never existed)
          fs.writeFileSync(filePath, buffer);
          const port = process.env.PORT || 5001;
          logoUrl = `http://localhost:${port}/uploads/${savedName}`;
        }
      }
    } catch (err) {
      console.warn('Could not save logo to disk, preserving base64 URL', err);
      // Fall back to storing base64 directly in DB (works but is large)
      logoUrl = dataUrl;
    }


    // Persist to PostgreSQL database under both 'website_logo' and 'logo_url' for full compatibility
    await this.prisma.websiteSetting.upsert({
      where: { key: 'website_logo' },
      update: { value: logoUrl, group: 'logo' },
      create: { key: 'website_logo', value: logoUrl, group: 'logo' }
    });

    await this.prisma.websiteSetting.upsert({
      where: { key: 'logo_url' },
      update: { value: logoUrl, group: 'logo' },
      create: { key: 'logo_url', value: logoUrl, group: 'logo' }
    });

    return {
      success: true,
      message: 'Logo uploaded and saved to database successfully',
      logoUrl
    };
  }

  // Remove logo
  async removeLogo() {
    await this.prisma.websiteSetting.upsert({
      where: { key: 'website_logo' },
      update: { value: '', group: 'logo' },
      create: { key: 'website_logo', value: '', group: 'logo' }
    });
    await this.prisma.websiteSetting.upsert({
      where: { key: 'logo_url' },
      update: { value: '', group: 'logo' },
      create: { key: 'logo_url', value: '', group: 'logo' }
    });

    return {
      success: true,
      message: 'Logo removed successfully',
      logoUrl: ''
    };
  }

  // Upload image (Banner, Section graphic, etc.)
  async uploadImage(dataUrl: string, key: string, group: string = 'home') {
    let imageUrl = dataUrl;

    try {
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt.includes('svg') ? 'svg' : rawExt.includes('webp') ? 'webp' : rawExt.includes('png') ? 'png' : 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
          const savedName = `banner-${cleanKey}-${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, savedName);
          fs.writeFileSync(filePath, buffer);
          const port = process.env.PORT || 5001;
          imageUrl = `http://localhost:${port}/uploads/${savedName}`;
        }
      }
    } catch (err) {
      console.warn('Could not write image to disk, falling back to data URL', err);
    }

    await this.prisma.websiteSetting.upsert({
      where: { key },
      update: { value: imageUrl, group },
      create: { key, value: imageUrl, group }
    });

    return {
      success: true,
      message: 'Image uploaded and saved successfully',
      imageUrl,
      key,
      group
    };
  }
}
