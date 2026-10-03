import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateBannerDto {
  title: string;
  subtitle?: string;
  image: string;
  buttonText?: string;
  buttonUrl?: string;
  status?: string;
  sortOrder?: number;
  badge?: string;
  category?: string;
}

export interface UpdateBannerDto {
  title?: string;
  subtitle?: string;
  image?: string;
  buttonText?: string;
  buttonUrl?: string;
  status?: string;
  sortOrder?: number;
  badge?: string;
  category?: string;
}

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  // Helper to save base64 image if uploaded
  private processImage(dataUrlOrPath: string, prefix = 'banner'): string {
    if (!dataUrlOrPath) return '';
    if (dataUrlOrPath.startsWith('data:image/')) {
      try {
        const matches = dataUrlOrPath.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt.includes('svg') ? 'svg' : rawExt.includes('webp') ? 'webp' : rawExt.includes('png') ? 'png' : 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const savedName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const filePath = path.join(uploadsDir, savedName);
          fs.writeFileSync(filePath, buffer);
          return `/uploads/${savedName}`;
        }
      } catch (err) {
        console.warn('Could not save image buffer to disk:', err);
      }
    }
    return dataUrlOrPath;
  }

  // Seed default banners if table is empty
  private async ensureDefaultBanners() {
    const count = await this.prisma.banner.count();
    if (count === 0) {
      const defaultBanners = [
        {
          title: "Find a Property You'll Love",
          subtitle: 'Discover residential properties, premium plots, villas and apartments in the locations you prefer.',
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
          buttonText: 'Explore Now',
          buttonUrl: '/properties',
          status: 'ACTIVE',
          sortOrder: 1,
          badge: 'Exclusive Pre-Launch',
          category: 'ALL'
        },
        {
          title: 'Prime Plotted Lands & Estates',
          subtitle: 'Clear-title gated township plots with wide road access, water infrastructure and high appreciation.',
          image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
          buttonText: 'Explore Plots',
          buttonUrl: '/category/plot',
          status: 'ACTIVE',
          sortOrder: 2,
          badge: 'Clear Title & RERA',
          category: 'PLOTS'
        },
        {
          title: 'Bespoke Luxury Villas',
          subtitle: 'Independent 4 & 5 BHK designer villas with private pools, landscaped gardens, and 24/7 guarded security.',
          image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80',
          buttonText: 'View Villas',
          buttonUrl: '/category/villa',
          status: 'ACTIVE',
          sortOrder: 3,
          badge: 'Private Residences',
          category: 'VILLAS'
        },
        {
          title: 'Modern Skyline Residences',
          subtitle: 'Spacious 2, 3 & 4 BHK apartments with panoramic balconies, rooftop amenities and transit connectivity.',
          image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80',
          buttonText: 'Browse Apartments',
          buttonUrl: '/category/apartment',
          status: 'ACTIVE',
          sortOrder: 4,
          badge: 'Urban High-Rise',
          category: 'APARTMENTS'
        }
      ];

      for (const b of defaultBanners) {
        await this.prisma.banner.create({ data: b });
      }
    }
  }

  // Public: Get all ACTIVE banners in configured sort order
  async getPublicBanners() {
    await this.ensureDefaultBanners();
    const banners = await this.prisma.banner.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    return { success: true, count: banners.length, banners };
  }

  // Admin: Get all banners (Active and Inactive)
  async getAllBanners() {
    await this.ensureDefaultBanners();
    const banners = await this.prisma.banner.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    return { success: true, count: banners.length, banners };
  }

  // Get banner by ID
  async getBannerById(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner with ID ${id} not found`);
    return { success: true, banner };
  }

  // Create new banner
  async createBanner(dto: CreateBannerDto) {
    const processedImage = this.processImage(dto.image, 'banner');
    const sortOrder = dto.sortOrder !== undefined ? Number(dto.sortOrder) : 0;

    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle || '',
        image: processedImage || '',
        buttonText: dto.buttonText || 'Explore Now',
        buttonUrl: dto.buttonUrl || '/properties',
        status: (dto.status || 'ACTIVE').toUpperCase(),
        sortOrder,
        badge: dto.badge || 'Featured',
        category: dto.category || 'ALL'
      }
    });

    return {
      success: true,
      message: 'Banner created successfully',
      banner
    };
  }

  // Update existing banner
  async updateBanner(id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Banner with ID ${id} not found`);

    let processedImage = existing.image;
    if (dto.image && dto.image !== existing.image) {
      processedImage = this.processImage(dto.image, 'banner');
    }

    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.image !== undefined ? { image: processedImage } : {}),
        ...(dto.buttonText !== undefined ? { buttonText: dto.buttonText } : {}),
        ...(dto.buttonUrl !== undefined ? { buttonUrl: dto.buttonUrl } : {}),
        ...(dto.status !== undefined ? { status: dto.status.toUpperCase() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: Number(dto.sortOrder) } : {}),
        ...(dto.badge !== undefined ? { badge: dto.badge } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {})
      }
    });

    return {
      success: true,
      message: 'Banner updated successfully',
      banner
    };
  }

  // Delete banner
  async deleteBanner(id: string) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Banner with ID ${id} not found`);

    await this.prisma.banner.delete({ where: { id } });
    return {
      success: true,
      message: 'Banner deleted successfully',
      id
    };
  }

  // Toggle status (ACTIVE <-> INACTIVE)
  async toggleStatus(id: string, status?: string) {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Banner with ID ${id} not found`);

    const newStatus = status ? status.toUpperCase() : (existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    const banner = await this.prisma.banner.update({
      where: { id },
      data: { status: newStatus }
    });

    return {
      success: true,
      message: `Banner marked as ${newStatus}`,
      banner
    };
  }

  // Bulk reorder
  async reorderBanners(orderList: { id: string; sortOrder: number }[]) {
    const updates = [];
    for (const item of orderList) {
      if (item.id) {
        const u = await this.prisma.banner.update({
          where: { id: item.id },
          data: { sortOrder: Number(item.sortOrder) || 0 }
        });
        updates.push(u);
      }
    }

    return {
      success: true,
      message: 'Banners reordered successfully',
      count: updates.length
    };
  }
}
