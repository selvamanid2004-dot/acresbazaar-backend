import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // 1. REWARD CONVERSION CONFIGURATION
  // =========================================================================

  async getRewardConfig() {
    let setting = await this.prisma.rewardSetting.findFirst();
    if (!setting) {
      setting = await this.prisma.rewardSetting.create({
        data: {
          pointsPerReward: 500,
          rewardAmountInInr: 500,
          pointsPerProperty: 20
        }
      });
    }
    return {
      success: true,
      config: {
        id: setting.id,
        pointsPerReward: setting.pointsPerReward,
        rewardAmountInInr: setting.rewardAmountInInr,
        pointsPerProperty: setting.pointsPerProperty,
        conversionRateText: `${setting.pointsPerReward} Points = ₹${setting.rewardAmountInInr.toLocaleString('en-IN')}`,
        ratePerPoint: setting.rewardAmountInInr / setting.pointsPerReward
      }
    };
  }

  async updateRewardConfig(data: {
    pointsPerReward?: number;
    rewardAmountInInr?: number;
    pointsPerProperty?: number;
  }, adminUser?: any) {
    let setting = await this.prisma.rewardSetting.findFirst();
    const updateData = {
      ...(data.pointsPerReward ? { pointsPerReward: Number(data.pointsPerReward) } : {}),
      ...(data.rewardAmountInInr ? { rewardAmountInInr: Number(data.rewardAmountInInr) } : {}),
      ...(data.pointsPerProperty ? { pointsPerProperty: Number(data.pointsPerProperty) } : {}),
      updatedBy: adminUser?.name || adminUser?.email || 'Admin'
    };

    if (!setting) {
      setting = await this.prisma.rewardSetting.create({
        data: {
          pointsPerReward: data.pointsPerReward ? Number(data.pointsPerReward) : 500,
          rewardAmountInInr: data.rewardAmountInInr ? Number(data.rewardAmountInInr) : 500,
          pointsPerProperty: data.pointsPerProperty ? Number(data.pointsPerProperty) : 20,
          updatedBy: adminUser?.name || 'Admin'
        }
      });
    } else {
      setting = await this.prisma.rewardSetting.update({
        where: { id: setting.id },
        data: updateData
      });
    }

    return {
      success: true,
      message: 'Reward conversion settings updated successfully',
      config: {
        id: setting.id,
        pointsPerReward: setting.pointsPerReward,
        rewardAmountInInr: setting.rewardAmountInInr,
        pointsPerProperty: setting.pointsPerProperty,
        conversionRateText: `${setting.pointsPerReward} Points = ₹${setting.rewardAmountInInr.toLocaleString('en-IN')}`,
        ratePerPoint: setting.rewardAmountInInr / setting.pointsPerReward
      }
    };
  }

  // =========================================================================
  // 2. PROPERTY APPROVAL POINTS AWARDING (STRICT IDEMPOTENCY)
  // =========================================================================

  async awardPropertyPoints(propertyId: string, adminUser?: any) {
    return this.prisma.$transaction(async (tx) => {
      const property = await tx.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        throw new NotFoundException('Property not found');
      }

      // If already awarded or not approved, do not award duplicate points
      if (property.pointsAwarded) {
        return {
          success: true,
          message: 'Points have already been awarded for this property',
          alreadyAwarded: true
        };
      }

      let setting = await tx.rewardSetting.findFirst();
      const pointsToAward = setting?.pointsPerProperty || 20;

      const partnerEmail = (property.sellerEmail || '').trim().toLowerCase() || 'partner@acresbazaar.com';
      const partnerName = property.sellerName || 'Partner';
      const partnerRole = property.sellerRole || 'PARTNER';

      // Find or create Partner Wallet
      let wallet = await tx.partnerWallet.findUnique({
        where: { partnerEmail }
      });

      if (!wallet) {
        wallet = await tx.partnerWallet.create({
          data: {
            partnerEmail,
            partnerName,
            partnerPhone: property.sellerPhone,
            partnerRole,
            availablePoints: pointsToAward,
            reservedPoints: 0,
            totalEarnedPoints: pointsToAward,
            totalRedeemedPoints: 0
          }
        });
      } else {
        wallet = await tx.partnerWallet.update({
          where: { partnerEmail },
          data: {
            availablePoints: { increment: pointsToAward },
            totalEarnedPoints: { increment: pointsToAward },
            ...(property.sellerName ? { partnerName: property.sellerName } : {}),
            ...(property.sellerPhone ? { partnerPhone: property.sellerPhone } : {})
          }
        });
      }

      // Record transaction in Points Ledger
      const ledgerEntry = await tx.pointsLedger.create({
        data: {
          partnerEmail,
          partnerName,
          partnerRole,
          propertyId: property.id,
          propertyTitle: property.title,
          transactionType: 'PROPERTY_APPROVED',
          points: pointsToAward,
          balanceBefore: wallet.availablePoints - pointsToAward,
          balanceAfter: wallet.availablePoints,
          description: `Property #${property.id.slice(0, 8)} Approved: "${property.title}" (+${pointsToAward} Points)`,
          adminId: adminUser?.id || adminUser?.sub || null,
          adminName: adminUser?.name || 'Admin'
        }
      });

      // Mark property as points awarded
      await tx.property.update({
        where: { id: propertyId },
        data: { pointsAwarded: true }
      });

      // Also create a record in the legacy Reward model for backward compatibility
      try {
        await tx.reward.create({
          data: {
            userName: partnerName,
            userEmail: partnerEmail,
            userRole: partnerRole,
            propertyTitle: property.title,
            rewardTitle: 'Property Approval Points',
            points: pointsToAward,
            amount: pointsToAward,
            reason: `Admin approved property "${property.title}". +${pointsToAward} points added to wallet.`,
            status: 'APPROVED'
          }
        });
      } catch (err) {
        // ignore legacy reward duplicate log
      }

      return {
        success: true,
        message: `Awarded ${pointsToAward} points to ${partnerName} for property approval`,
        pointsAwarded: pointsToAward,
        availablePoints: wallet.availablePoints,
        ledger: ledgerEntry
      };
    });
  }

  // =========================================================================
  // 3. PARTNER POINTS WALLET & HISTORY
  // =========================================================================

  async getPartnerWallet(email: string, userRole?: string) {
    if (!email) {
      return {
        success: true,
        wallet: {
          availablePoints: 0,
          reservedPoints: 0,
          totalEarnedPoints: 0,
          totalRedeemedPoints: 0
        },
        bankDetail: null,
        activeClaim: null,
        history: [],
        claims: [],
        config: { pointsPerReward: 500, rewardAmountInInr: 500, ratePerPoint: 1 }
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Load conversion config
    const configRes = await this.getRewardConfig();
    const config = configRes.config;

    // Get or initialize wallet
    let wallet = await this.prisma.partnerWallet.findUnique({
      where: { partnerEmail: cleanEmail },
      include: {
        bankDetail: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        claims: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      // Find if user exists
      const user = await this.prisma.user.findUnique({
        where: { email: cleanEmail }
      });

      wallet = await this.prisma.partnerWallet.create({
        data: {
          partnerEmail: cleanEmail,
          partnerName: user?.name || null,
          partnerPhone: user?.mobile || null,
          partnerRole: userRole ? userRole.toUpperCase() : (user?.role || 'PARTNER'),
          availablePoints: 0,
          reservedPoints: 0,
          totalEarnedPoints: 0,
          totalRedeemedPoints: 0
        },
        include: {
          bankDetail: true,
          transactions: true,
          claims: true
        }
      });
    }

    const activeClaim = wallet.claims.find(c => c.status === 'PENDING' || c.status === 'PROCESSING' || c.status === 'APPROVED');

    return {
      success: true,
      wallet: {
        id: wallet.id,
        partnerEmail: wallet.partnerEmail,
        partnerName: wallet.partnerName,
        partnerPhone: wallet.partnerPhone,
        partnerRole: wallet.partnerRole,
        availablePoints: wallet.availablePoints,
        reservedPoints: wallet.reservedPoints,
        totalEarnedPoints: wallet.totalEarnedPoints,
        totalRedeemedPoints: wallet.totalRedeemedPoints
      },
      bankDetail: wallet.bankDetail || null,
      activeClaim: activeClaim || null,
      history: wallet.transactions,
      claims: wallet.claims,
      config
    };
  }

  // =========================================================================
  // 4. BANK DETAILS MANAGEMENT
  // =========================================================================

  async saveBankDetail(data: {
    email: string;
    name?: string;
    holderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
    mobileNumber?: string;
  }) {
    if (!data.email || !data.holderName || !data.accountNumber || !data.ifscCode || !data.bankName) {
      throw new BadRequestException('Account Holder Name, Account Number, IFSC Code, and Bank Name are required');
    }

    const cleanEmail = data.email.trim().toLowerCase();

    // Ensure wallet exists
    await this.prisma.partnerWallet.upsert({
      where: { partnerEmail: cleanEmail },
      create: {
        partnerEmail: cleanEmail,
        partnerName: data.name || data.holderName,
        partnerPhone: data.mobileNumber,
        availablePoints: 0,
        reservedPoints: 0,
        totalEarnedPoints: 0,
        totalRedeemedPoints: 0
      },
      update: {
        ...(data.name ? { partnerName: data.name } : {}),
        ...(data.mobileNumber ? { partnerPhone: data.mobileNumber } : {})
      }
    });

    const bankDetail = await this.prisma.partnerBankDetail.upsert({
      where: { partnerEmail: cleanEmail },
      create: {
        partnerEmail: cleanEmail,
        partnerName: data.name || data.holderName,
        accountHolderName: data.holderName.trim(),
        accountNumber: data.accountNumber.trim(),
        ifscCode: data.ifscCode.trim().toUpperCase(),
        bankName: data.bankName.trim(),
        upiId: data.upiId ? data.upiId.trim() : null,
        mobileNumber: data.mobileNumber ? data.mobileNumber.trim() : null
      },
      update: {
        partnerName: data.name || data.holderName,
        accountHolderName: data.holderName.trim(),
        accountNumber: data.accountNumber.trim(),
        ifscCode: data.ifscCode.trim().toUpperCase(),
        bankName: data.bankName.trim(),
        upiId: data.upiId ? data.upiId.trim() : null,
        mobileNumber: data.mobileNumber ? data.mobileNumber.trim() : null
      }
    });

    return {
      success: true,
      message: 'Bank details saved securely',
      bankDetail
    };
  }

  // =========================================================================
  // 5. REWARD CLAIM SUBMISSION (TRANSACTIONAL POINT RESERVATION)
  // =========================================================================

  async claimReward(data: {
    email: string;
    name?: string;
    phone?: string;
    role?: string;
    redeemOption: '500' | 'ALL';
    bankDetails?: {
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      upiId?: string;
      mobileNumber?: string;
    };
  }) {
    if (!data.email) {
      throw new BadRequestException('Partner email is required');
    }

    const cleanEmail = data.email.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      // 1. Get wallet
      const wallet = await tx.partnerWallet.findUnique({
        where: { partnerEmail: cleanEmail },
        include: { bankDetail: true }
      });

      if (!wallet) {
        throw new BadRequestException('Partner wallet not found.');
      }

      if (wallet.availablePoints < 500) {
        throw new BadRequestException(
          `You need at least 500 points to claim a reward. Your available balance is ${wallet.availablePoints} points.`
        );
      }

      // 2. Determine points to redeem
      let pointsToRedeem = 500;
      if (data.redeemOption === 'ALL') {
        pointsToRedeem = wallet.availablePoints;
      } else {
        pointsToRedeem = 500;
      }

      if (pointsToRedeem > wallet.availablePoints) {
        throw new BadRequestException('Selected redeem points exceed available points in your wallet.');
      }

      // 3. Resolve bank details
      let bankInfo = data.bankDetails;
      if (!bankInfo || !bankInfo.accountNumber) {
        bankInfo = wallet.bankDetail ? {
          accountHolderName: wallet.bankDetail.accountHolderName,
          accountNumber: wallet.bankDetail.accountNumber,
          ifscCode: wallet.bankDetail.ifscCode,
          bankName: wallet.bankDetail.bankName,
          upiId: wallet.bankDetail.upiId || undefined,
          mobileNumber: wallet.bankDetail.mobileNumber || undefined
        } : undefined;
      }

      if (!bankInfo || !bankInfo.accountNumber || !bankInfo.accountHolderName || !bankInfo.ifscCode || !bankInfo.bankName) {
        throw new BadRequestException('Complete bank details (Holder Name, Account No, IFSC, Bank Name) are required to claim reward.');
      }

      // Upsert bank details
      await tx.partnerBankDetail.upsert({
        where: { partnerEmail: cleanEmail },
        create: {
          partnerEmail: cleanEmail,
          partnerName: data.name || wallet.partnerName || bankInfo.accountHolderName,
          accountHolderName: bankInfo.accountHolderName.trim(),
          accountNumber: bankInfo.accountNumber.trim(),
          ifscCode: bankInfo.ifscCode.trim().toUpperCase(),
          bankName: bankInfo.bankName.trim(),
          upiId: bankInfo.upiId ? bankInfo.upiId.trim() : null,
          mobileNumber: bankInfo.mobileNumber ? bankInfo.mobileNumber.trim() : null
        },
        update: {
          accountHolderName: bankInfo.accountHolderName.trim(),
          accountNumber: bankInfo.accountNumber.trim(),
          ifscCode: bankInfo.ifscCode.trim().toUpperCase(),
          bankName: bankInfo.bankName.trim(),
          upiId: bankInfo.upiId ? bankInfo.upiId.trim() : null,
          mobileNumber: bankInfo.mobileNumber ? bankInfo.mobileNumber.trim() : null
        }
      });

      // 4. Calculate reward amount based on configurable rate
      let setting = await tx.rewardSetting.findFirst();
      const pointsPerReward = setting?.pointsPerReward || 500;
      const rewardAmountInInr = setting?.rewardAmountInInr || 500;
      const rewardAmount = Math.round((pointsToRedeem / pointsPerReward) * rewardAmountInInr);

      // 5. Deduct from available and add to reserved
      const updatedWallet = await tx.partnerWallet.update({
        where: { partnerEmail: cleanEmail },
        data: {
          availablePoints: wallet.availablePoints - pointsToRedeem,
          reservedPoints: wallet.reservedPoints + pointsToRedeem,
          ...(data.name ? { partnerName: data.name } : {}),
          ...(data.phone ? { partnerPhone: data.phone } : {})
        }
      });

      // 6. Generate Claim Number
      const claimNumber = `CLM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // 7. Create RewardClaim
      const claim = await tx.rewardClaim.create({
        data: {
          claimNumber,
          partnerEmail: cleanEmail,
          partnerName: data.name || wallet.partnerName || bankInfo.accountHolderName,
          partnerPhone: data.phone || wallet.partnerPhone || bankInfo.mobileNumber || null,
          partnerRole: data.role || wallet.partnerRole || 'PARTNER',
          redeemedPoints: pointsToRedeem,
          rewardAmount,
          conversionRate: `${pointsPerReward} Points = ₹${rewardAmountInInr}`,
          bankAccountHolder: bankInfo.accountHolderName.trim(),
          bankAccountNumber: bankInfo.accountNumber.trim(),
          ifscCode: bankInfo.ifscCode.trim().toUpperCase(),
          bankName: bankInfo.bankName.trim(),
          upiId: bankInfo.upiId ? bankInfo.upiId.trim() : null,
          mobileNumber: bankInfo.mobileNumber ? bankInfo.mobileNumber.trim() : null,
          status: 'PENDING'
        }
      });

      // 8. Create Ledger entry
      await tx.pointsLedger.create({
        data: {
          partnerEmail: cleanEmail,
          partnerName: data.name || wallet.partnerName || bankInfo.accountHolderName,
          partnerRole: data.role || wallet.partnerRole || 'PARTNER',
          claimId: claim.id,
          transactionType: 'REWARD_RESERVED',
          points: -pointsToRedeem,
          balanceBefore: wallet.availablePoints,
          balanceAfter: updatedWallet.availablePoints,
          description: `Reward Claim #${claimNumber} Submitted: ${pointsToRedeem} Points Reserved for ₹${rewardAmount.toLocaleString('en-IN')} Cash Payout`
        }
      });

      // 9. Legacy Reward entry for backward compatibility
      try {
        const reason = `Bank: ${bankInfo.bankName} | A/C: ${bankInfo.accountNumber} | IFSC: ${bankInfo.ifscCode} | Holder: ${bankInfo.accountHolderName}${bankInfo.upiId ? ' | UPI: ' + bankInfo.upiId : ''}`;
        await tx.reward.create({
          data: {
            userName: bankInfo.accountHolderName || data.name || 'Partner',
            userEmail: cleanEmail,
            userRole: data.role || wallet.partnerRole || 'PARTNER',
            propertyTitle: `Claim #${claimNumber} (${pointsToRedeem} Points)`,
            rewardTitle: `₹${rewardAmount.toLocaleString('en-IN')} Cash Reward Claim`,
            points: pointsToRedeem,
            amount: rewardAmount,
            reason,
            status: 'PENDING'
          }
        });
      } catch (err) {
        // ignore legacy log collision
      }

      return {
        success: true,
        message: `Reward claim of ₹${rewardAmount.toLocaleString('en-IN')} (${pointsToRedeem} points) submitted successfully! Admin will review and process payout.`,
        claim,
        wallet: {
          availablePoints: updatedWallet.availablePoints,
          reservedPoints: updatedWallet.reservedPoints,
          totalEarnedPoints: updatedWallet.totalEarnedPoints,
          totalRedeemedPoints: updatedWallet.totalRedeemedPoints
        }
      };
    });
  }

  // =========================================================================
  // 6. ADMIN CLAIMS MODULE & SUMMARY STATISTICS
  // =========================================================================

  async getAllClaimsAdmin(query: {
    status?: string;
    partner?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { status, partner, search, startDate, endDate } = query;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (partner) {
      where.OR = [
        { partnerEmail: { contains: partner } },
        { partnerName: { contains: partner } }
      ];
    }

    if (search) {
      const s = search.trim();
      where.OR = [
        { claimNumber: { contains: s } },
        { partnerEmail: { contains: s } },
        { partnerName: { contains: s } },
        { bankAccountNumber: { contains: s } },
        { ifscCode: { contains: s } },
        { bankName: { contains: s } },
        { upiId: { contains: s } },
        { paymentReference: { contains: s } }
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Fetch claims with order
    const claims = await this.prisma.rewardClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Compute Summary Statistics
    const allWallets = await this.prisma.partnerWallet.findMany();
    const totalPartnerPointsIssued = allWallets.reduce((acc, w) => acc + w.totalEarnedPoints, 0);
    const totalPointsRedeemed = allWallets.reduce((acc, w) => acc + w.totalRedeemedPoints, 0);

    const allClaims = await this.prisma.rewardClaim.findMany();
    const pendingClaimsCount = allClaims.filter(c => c.status === 'PENDING' || c.status === 'PROCESSING').length;
    const paidClaims = allClaims.filter(c => c.status === 'PAID');
    const totalRewardsPaid = paidClaims.length;
    const totalRewardAmountPaid = paidClaims.reduce((acc, c) => acc + c.rewardAmount, 0);

    const configRes = await this.getRewardConfig();

    return {
      success: true,
      summary: {
        totalPartnerPointsIssued,
        totalPointsRedeemed,
        pendingClaimsCount,
        totalRewardsPaid,
        totalRewardAmountPaid
      },
      count: claims.length,
      claims,
      config: configRes.config
    };
  }

  // =========================================================================
  // 7. ADMIN PARTNER PROFILE VIEW
  // =========================================================================

  async getPartnerProfileAdmin(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const cleanEmail = email.trim().toLowerCase();

    const [wallet, user] = await Promise.all([
      this.prisma.partnerWallet.findUnique({
        where: { partnerEmail: cleanEmail },
        include: { bankDetail: true }
      }),
      this.prisma.user.findUnique({
        where: { email: cleanEmail }
      })
    ]);

    const [properties, ledger, claims] = await Promise.all([
      this.prisma.property.findMany({
        where: {
          OR: [
            { sellerEmail: cleanEmail },
            ...(user?.id ? [{ sellerId: user.id }] : [])
          ]
        },
        include: { images: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.pointsLedger.findMany({
        where: { partnerEmail: cleanEmail },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.rewardClaim.findMany({
        where: { partnerEmail: cleanEmail },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      success: true,
      partner: {
        name: wallet?.partnerName || user?.name || 'Partner',
        email: cleanEmail,
        mobile: wallet?.partnerPhone || user?.mobile || '',
        role: wallet?.partnerRole || user?.role || 'PARTNER',
        createdAt: user?.createdAt || wallet?.createdAt
      },
      wallet: {
        availablePoints: wallet?.availablePoints || 0,
        reservedPoints: wallet?.reservedPoints || 0,
        totalEarnedPoints: wallet?.totalEarnedPoints || 0,
        totalRedeemedPoints: wallet?.totalRedeemedPoints || 0
      },
      bankDetail: wallet?.bankDetail || null,
      properties: properties.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        location: p.location,
        price: p.price,
        status: p.status,
        planType: p.planType,
        pointsAwarded: p.pointsAwarded,
        createdAt: p.createdAt
      })),
      ledger,
      claims
    };
  }

  // =========================================================================
  // 8. ADMIN PAYMENT WORKFLOW (MARK PAID / REJECT / PROCESS)
  // =========================================================================

  async processClaimAdmin(
    claimId: string,
    data: {
      status: 'PROCESSING' | 'APPROVED' | 'PAID' | 'REJECTED';
      paymentReference?: string;
      paymentDate?: string;
      adminNotes?: string;
      rejectionReason?: string;
    },
    adminUser?: any
  ) {
    const validStatuses = ['PROCESSING', 'APPROVED', 'PAID', 'REJECTED'];
    const newStatus = data.status?.toUpperCase() as 'PROCESSING' | 'APPROVED' | 'PAID' | 'REJECTED';

    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.rewardClaim.findUnique({
        where: { id: claimId }
      });

      if (!claim) {
        throw new NotFoundException('Reward claim not found');
      }

      if (claim.status === 'PAID') {
        throw new BadRequestException('This claim has already been marked as Paid and finalized.');
      }

      if (claim.status === 'REJECTED' && newStatus !== 'REJECTED') {
        throw new BadRequestException('This claim has already been rejected and points have been refunded.');
      }

      const wallet = await tx.partnerWallet.findUnique({
        where: { partnerEmail: claim.partnerEmail }
      });

      if (!wallet) {
        throw new NotFoundException('Partner wallet not found for this claim.');
      }

      const adminName = adminUser?.name || 'Admin';
      const adminId = adminUser?.id || adminUser?.sub || null;

      if (newStatus === 'PAID') {
        // MARK AS PAID: Convert reserved points to permanently redeemed
        const paymentReference = data.paymentReference?.trim() || `UTR-${Date.now().toString().slice(-8)}`;
        const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

        const updatedClaim = await tx.rewardClaim.update({
          where: { id: claimId },
          data: {
            status: 'PAID',
            paymentReference,
            paymentDate,
            adminNotes: data.adminNotes || null,
            processedByAdminId: adminId,
            processedByAdminName: adminName
          }
        });

        // Deduct from reserved points, add to totalRedeemedPoints
        const updatedWallet = await tx.partnerWallet.update({
          where: { partnerEmail: claim.partnerEmail },
          data: {
            reservedPoints: Math.max(0, wallet.reservedPoints - claim.redeemedPoints),
            totalRedeemedPoints: wallet.totalRedeemedPoints + claim.redeemedPoints
          }
        });

        // Create transaction in Points Ledger
        await tx.pointsLedger.create({
          data: {
            partnerEmail: claim.partnerEmail,
            partnerName: claim.partnerName,
            partnerRole: claim.partnerRole,
            claimId: claim.id,
            transactionType: 'REWARD_PAID',
            points: -claim.redeemedPoints,
            balanceBefore: wallet.availablePoints,
            balanceAfter: wallet.availablePoints,
            description: `Reward Claim #${claim.claimNumber} Paid: ₹${claim.rewardAmount.toLocaleString('en-IN')} disbursed via Reference #${paymentReference} by ${adminName}`,
            adminId,
            adminName
          }
        });

        // Sync legacy Reward table
        try {
          const legacyReward = await tx.reward.findFirst({
            where: {
              userEmail: claim.partnerEmail,
              status: { in: ['PENDING', 'APPROVED'] }
            }
          });
          if (legacyReward) {
            await tx.reward.update({
              where: { id: legacyReward.id },
              data: { status: 'PAID' }
            });
          }
        } catch (e) {
          // ignore
        }

        return {
          success: true,
          message: `Claim #${claim.claimNumber} marked as Paid. ₹${claim.rewardAmount.toLocaleString('en-IN')} disbursed (Ref: ${paymentReference}).`,
          claim: updatedClaim,
          wallet: updatedWallet
        };
      } else if (newStatus === 'REJECTED') {
        // REJECT CLAIM: Release reserved points back to available wallet balance!
        const rejectionReason = data.rejectionReason?.trim() || data.adminNotes?.trim() || 'Claim rejected during admin verification.';

        const updatedClaim = await tx.rewardClaim.update({
          where: { id: claimId },
          data: {
            status: 'REJECTED',
            rejectionReason,
            adminNotes: data.adminNotes || null,
            processedByAdminId: adminId,
            processedByAdminName: adminName
          }
        });

        // Release reserved points back to available
        const updatedWallet = await tx.partnerWallet.update({
          where: { partnerEmail: claim.partnerEmail },
          data: {
            reservedPoints: Math.max(0, wallet.reservedPoints - claim.redeemedPoints),
            availablePoints: wallet.availablePoints + claim.redeemedPoints
          }
        });

        // Create ledger entry
        await tx.pointsLedger.create({
          data: {
            partnerEmail: claim.partnerEmail,
            partnerName: claim.partnerName,
            partnerRole: claim.partnerRole,
            claimId: claim.id,
            transactionType: 'REWARD_CLAIM_REJECTED',
            points: claim.redeemedPoints,
            balanceBefore: wallet.availablePoints,
            balanceAfter: wallet.availablePoints + claim.redeemedPoints,
            description: `Reward Claim #${claim.claimNumber} Rejected: ${claim.redeemedPoints} Points Released Back to Available Wallet (Reason: ${rejectionReason})`,
            adminId,
            adminName
          }
        });

        // Sync legacy Reward table
        try {
          const legacyReward = await tx.reward.findFirst({
            where: {
              userEmail: claim.partnerEmail,
              status: { in: ['PENDING', 'APPROVED'] }
            }
          });
          if (legacyReward) {
            await tx.reward.update({
              where: { id: legacyReward.id },
              data: { status: 'REJECTED' }
            });
          }
        } catch (e) {
          // ignore
        }

        return {
          success: true,
          message: `Claim #${claim.claimNumber} rejected. ${claim.redeemedPoints} points released back to Partner available wallet.`,
          claim: updatedClaim,
          wallet: updatedWallet
        };
      } else {
        // PROCESSING or APPROVED
        const updatedClaim = await tx.rewardClaim.update({
          where: { id: claimId },
          data: {
            status: newStatus,
            adminNotes: data.adminNotes || null,
            processedByAdminId: adminId,
            processedByAdminName: adminName
          }
        });

        return {
          success: true,
          message: `Claim #${claim.claimNumber} status updated to ${newStatus}.`,
          claim: updatedClaim
        };
      }
    });
  }

  // =========================================================================
  // 9. LEGACY ENDPOINTS (Preserved for full backward compatibility)
  // =========================================================================

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
    return this.claimReward({
      email: data.userEmail,
      name: data.userName,
      phone: data.mobile,
      role: data.userRole,
      redeemOption: data.points > 500 ? 'ALL' : '500',
      bankDetails: {
        accountHolderName: data.holderName,
        accountNumber: data.accountNo,
        ifscCode: data.ifsc,
        bankName: data.bankName,
        upiId: data.upiId,
        mobileNumber: data.mobile
      }
    });
  }

  async getClaimByUser(email: string) {
    if (!email) return { success: true, claim: null };
    const claim = await this.prisma.rewardClaim.findFirst({
      where: { partnerEmail: email.trim().toLowerCase() },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, claim };
  }

  async getDealerRewardsSummary(email: string) {
    return this.getPartnerWallet(email, 'DEALER');
  }

  async getSpotterRewardsSummary(email: string) {
    return this.getPartnerWallet(email, 'PARTNER');
  }

  async delete(id: string) {
    try {
      await this.prisma.reward.delete({ where: { id } });
    } catch (e) {
      try {
        await this.prisma.rewardClaim.delete({ where: { id } });
      } catch (err) {
        // ignore
      }
    }
    return { success: true, message: 'Reward record deleted successfully' };
  }
}
