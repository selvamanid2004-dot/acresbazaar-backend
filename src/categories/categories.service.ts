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
    return { success: true, count: categories.length, categories };
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
