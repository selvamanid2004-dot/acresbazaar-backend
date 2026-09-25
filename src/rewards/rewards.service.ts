import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, role?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }
    if (role && role !== 'ALL') {
      where.userRole = role.toUpperCase();
    }
    const rewards = await this.prisma.reward.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, count: rewards.length, rewards };
  }

  async create(data: {
    userName: string;
    userEmail?: string;
    userRole?: string;
    propertyTitle?: string;
    rewardTitle: string;
    points?: number;
    amount?: number;
    reason?: string;
  }) {
    if (!data.userName || !data.rewardTitle) {
      throw new BadRequestException('User name and reward title are required');
    }

    const reward = await this.prisma.reward.create({
      data: {
        userName: data.userName.trim(),
        userEmail: data.userEmail ? data.userEmail.trim().toLowerCase() : '',
        userRole: data.userRole ? data.userRole.toUpperCase() : 'COMMON_PEOPLE',
        propertyTitle: data.propertyTitle || '',
        rewardTitle: data.rewardTitle.trim(),
        points: data.points ? Number(data.points) : 0,
        amount: data.amount ? Number(data.amount) : 0,
        reason: data.reason || '',
        status: 'PENDING'
      }
    });

    return { success: true, message: 'Reward created successfully', reward };
  }

  async updateStatus(id: string, status: string) {
    const valid = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];
    const clean = status.toUpperCase();
    if (!valid.includes(clean)) {
      throw new BadRequestException(`Status must be one of: ${valid.join(', ')}`);
    }

    const updated = await this.prisma.reward.update({
      where: { id },
      data: { status: clean }
    });

    return { success: true, message: `Reward status updated to ${clean}`, reward: updated };
  }

  async submitClaim(data: {
    userName: string;
    userEmail: string;
    userRole?: string;
    mobile?: string;
    points: number;
    bankName: string;
    accountNo: string;
    ifsc: string;
    holderName: string;
    upiId?: string;
  }) {
    if (!data.bankName || !data.accountNo || !data.ifsc || !data.holderName) {
      throw new BadRequestException('All bank details (Bank Name, Account Number, IFSC Code, Account Holder Name) are required');
    }

    const cleanEmail = (data.userEmail || '').trim().toLowerCase();
    const userRole = (data.userRole || 'COMMON_PEOPLE').toUpperCase();

    // Check if user already has an active claim
    const existingClaim = await this.prisma.reward.findFirst({
      where: {
        userEmail: cleanEmail,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingClaim) {
      return {
        success: true,
        message: 'You already have an active reward payout request under review',
        claim: existingClaim
      };
    }

    const reason = `Bank: ${data.bankName.trim()} | A/C: ${data.accountNo.trim()} | IFSC: ${data.ifsc.trim().toUpperCase()} | Holder: ${data.holderName.trim()}${data.upiId ? ' | UPI: ' + data.upiId.trim() : ''}${data.mobile ? ' | Mobile: ' + data.mobile.trim() : ''}`;

    const reward = await this.prisma.reward.create({
      data: {
        userName: data.holderName.trim() || data.userName.trim(),
        userEmail: cleanEmail,
        userRole,
        propertyTitle: userRole === 'DEALER' ? 'Dealer 1,000 Points Milestone' : '1,000 Points Spotter Milestone',
        rewardTitle: userRole === 'DEALER' ? '₹1,000 Dealer Commission Bonus Claim' : '₹1,000 Cash Reward Claim',
        points: data.points || 1000,
        amount: 1000,
        reason,
        status: 'PENDING'
      }
    });

    return {
      success: true,
      message: 'Bank details submitted successfully! Admin will disburse your reward.',
      claim: reward
    };
  }

  async getClaimByUser(email: string) {
    if (!email) return { success: true, claim: null };
    const claim = await this.prisma.reward.findFirst({
      where: { userEmail: email.trim().toLowerCase() },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, claim };
  }

  async getDealerRewardsSummary(email: string) {
    if (!email) {
      return { success: true, totalEarned: 0, availablePoints: 0, activeClaim: null, history: [] };
    }
    const cleanEmail = email.trim().toLowerCase();
    const rewards = await this.prisma.reward.findMany({
      where: {
        userEmail: cleanEmail,
        userRole: 'DEALER'
      },
      orderBy: { createdAt: 'desc' }
    });

    const earnedPoints = rewards
      .filter(r => r.points > 0 && !r.rewardTitle.includes('Claim'))
      .reduce((sum, r) => sum + r.points, 0);

    const redeemedPoints = rewards
      .filter(r => r.rewardTitle.includes('Claim') && (r.status === 'APPROVED' || r.status === 'PAID'))
      .reduce((sum, r) => sum + r.points, 0);

    const availablePoints = Math.max(0, earnedPoints - redeemedPoints);
    const activeClaim = rewards.find(r => r.rewardTitle.includes('Claim') && (r.status === 'PENDING' || r.status === 'APPROVED'));

    return {
      success: true,
      totalEarned: earnedPoints,
      availablePoints,
      activeClaim: activeClaim || null,
      history: rewards
    };
  }

  async delete(id: string) {
    await this.prisma.reward.delete({ where: { id } });
    return { success: true, message: 'Reward deleted successfully' };
  }
}
