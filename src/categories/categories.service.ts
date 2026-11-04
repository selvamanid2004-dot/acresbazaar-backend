import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(onlyActive: boolean = false) {
    const where = onlyActive ? { isActive: true } : {};
    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { displayOrder: 'asc' }
    });

    // Fetch approved properties to compute accurate dynamic category count
    const approvedProperties = await this.prisma.property.findMany({
      where: { status: 'APPROVED' },
      select: { category: true }
    });

    const categoriesWithCount = categories.map(cat => {
      const catLower = cat.name.toLowerCase();
      const slugLower = cat.slug.toLowerCase();

      const count = approvedProperties.filter(p => {
        const pCat = (p.category || '').toLowerCase().trim();
        if (!pCat) return false;
        if (pCat === catLower || pCat === slugLower) return true;

        if (slugLower.includes('plot') || catLower.includes('plot')) {
          return (pCat.includes('plot') || pCat.includes('land')) && !pCat.includes('farm');
        }
        if (slugLower.includes('villa') || catLower.includes('villa')) {
          return pCat.includes('villa');
        }
        if (slugLower.includes('apartment') || slugLower.includes('flat') || catLower.includes('apartment') || catLower.includes('flat')) {
          return pCat.includes('apartment') || pCat.includes('flat');
        }
        if (slugLower.includes('house') || catLower.includes('house') || slugLower.includes('independent') || catLower.includes('independent')) {
          return pCat.includes('house') || pCat.includes('independent');
        }
        if (slugLower.includes('commercial') || catLower.includes('commercial')) {
          return pCat.includes('commercial') || pCat.includes('office') || pCat.includes('shop');
        }
        if (slugLower.includes('farm') || catLower.includes('farm')) {
          return pCat.includes('farm') || pCat.includes('agriculture');
        }
        if (slugLower.includes('layout') || catLower.includes('layout')) {
          return pCat.includes('layout');
        }
        if (slugLower.includes('residential') || catLower.includes('residential')) {
          return pCat.includes('residential') || pCat.includes('apartment') || pCat.includes('villa') || pCat.includes('house');
        }

        return pCat.includes(slugLower) || pCat.includes(catLower) || slugLower.includes(pCat) || catLower.includes(pCat);
      }).length;

      return {
        ...cat,
        propertiesCount: count
      };
    });

    return { success: true, count: categoriesWithCount.length, categories: categoriesWithCount };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return { success: true, category };
  }

  async create(data: { name: string; slug?: string; description?: string; imageUrl?: string; displayOrder?: number }) {
    if (!data.name) {
      throw new BadRequestException('Category name is required');
    }
    const slug = data.slug
      ? data.slug.trim().toLowerCase()
      : data.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('A category with this slug already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        displayOrder: data.displayOrder || 0,
        isActive: true
      }
    });

    return { success: true, message: 'Category created successfully', category };
  }

  async update(id: string, data: { name?: string; slug?: string; description?: string; imageUrl?: string; isActive?: boolean; displayOrder?: number }) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.slug ? { slug: data.slug.trim().toLowerCase() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: Number(data.displayOrder) } : {})
      }
    });

    return { success: true, message: 'Category updated successfully', category: updated };
  }

  async toggleStatus(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive }
    });
    return {
      success: true,
      message: `Category ${updated.isActive ? 'enabled' : 'disabled'} successfully`,
      category: updated
    };
  }

  async delete(id: string) {
    await this.prisma.category.delete({ where: { id } });
    return { success: true, message: 'Category deleted successfully' };
  }
}
