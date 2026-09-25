import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  private parsePlan(p: any) {
    let extra: any = {};
    try {
      if (p.content && p.content.trim().startsWith('{')) {
        extra = JSON.parse(p.content);
      }
    } catch {}

    let parsedBenefits: string[] = [];
    try {
      if (typeof p.benefits === 'string') {
        parsedBenefits = JSON.parse(p.benefits);
      } else if (Array.isArray(p.benefits)) {
        parsedBenefits = p.benefits;
      }
    } catch {
      parsedBenefits = p.benefits ? [String(p.benefits)] : [];
    }

    let parsedFeatures: string[] = [];
    try {
      if (typeof p.features === 'string') {
        parsedFeatures = JSON.parse(p.features);
      } else if (Array.isArray(p.features)) {
        parsedFeatures = p.features;
      }
    } catch {
      parsedFeatures = p.features ? [String(p.features)] : [];
    }

    const defaultBadge = p.planId === 'gold' ? 'POPULAR' : 'MOST VALUABLE';
    const defaultPeriod = 'month';

    return {
      ...p,
      code: (p.planId || 'gold').toUpperCase(),
      badge: extra.badge || (p.planId === 'gold' ? 'POPULAR' : 'MOST VALUABLE'),
      period: extra.period || 'month',
      billing_period: extra.period || 'month',
      benefits: parsedBenefits,
      features: parsedFeatures,
      content: extra.text !== undefined ? extra.text : (p.content || '')
    };
  }

  async findAll() {
    const plans = await this.prisma.plan.findMany({
      orderBy: { price: 'asc' }
    });
    return {
      success: true,
      plans: plans.map(p => this.parsePlan(p))
    };
  }

  async findByPlanId(idOrPlanId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        OR: [
          { planId: idOrPlanId.toLowerCase() },
          { id: idOrPlanId }
        ]
      }
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${idOrPlanId} not found`);
    }
    return {
      success: true,
      plan: this.parsePlan(plan)
    };
  }

  async update(idOrPlanId: string, data: {
    name?: string;
    price?: number;
    description?: string;
    benefits?: string[] | string;
    features?: string[] | string;
    period?: string;
    billing_period?: string;
    badge?: string;
    content?: string;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.plan.findFirst({
      where: {
        OR: [
          { planId: idOrPlanId.toLowerCase() },
          { id: idOrPlanId }
        ]
      }
    });

    if (!existing) {
      throw new NotFoundException(`Plan ${idOrPlanId} not found`);
    }

    let benefitsStr: string | undefined = undefined;
    if (data.benefits !== undefined) {
      if (Array.isArray(data.benefits)) {
        benefitsStr = JSON.stringify(data.benefits.filter(Boolean));
      } else if (typeof data.benefits === 'string') {
        const arr = data.benefits.split('\n').map(s => s.trim()).filter(Boolean);
        benefitsStr = JSON.stringify(arr);
      }
    }

    let featuresStr: string | undefined = undefined;
    if (data.features !== undefined) {
      if (Array.isArray(data.features)) {
        featuresStr = JSON.stringify(data.features.filter(Boolean));
      } else if (typeof data.features === 'string') {
        const arr = data.features.split('\n').map(s => s.trim()).filter(Boolean);
        featuresStr = JSON.stringify(arr);
      }
    }

    // Preserve badge and period in content JSON
    let existingExtra: any = {};
    try {
      if (existing.content && existing.content.trim().startsWith('{')) {
        existingExtra = JSON.parse(existing.content);
      }
    } catch {}

    const newExtra = {
      ...existingExtra,
      badge: data.badge !== undefined ? data.badge : (existingExtra.badge || (existing.planId === 'gold' ? 'POPULAR' : 'MOST VALUABLE')),
      period: (data.period || data.billing_period) !== undefined ? (data.period || data.billing_period) : (existingExtra.period || 'month'),
      text: data.content !== undefined ? data.content : (existingExtra.text || existing.content || '')
    };

    const updated = await this.prisma.plan.update({
      where: { id: existing.id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.price !== undefined ? { price: Number(data.price) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(benefitsStr !== undefined ? { benefits: benefitsStr } : {}),
        ...(featuresStr !== undefined ? { features: featuresStr } : {}),
        content: JSON.stringify(newExtra),
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {})
      }
    });

    return {
      success: true,
      message: `${updated.name} updated successfully`,
      plan: this.parsePlan(updated)
    };
  }
}
