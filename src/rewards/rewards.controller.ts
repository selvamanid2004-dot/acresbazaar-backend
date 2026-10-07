import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  // =========================================================================
  // PUBLIC / PARTNER ACCESSIBLE ENDPOINTS
  // =========================================================================

  // 1. Get Reward Conversion Config (Points required vs ₹ Amount)
  @Get('config')
  async getRewardConfig() {
    return this.rewardsService.getRewardConfig();
  }

  // 2. Partner Wallet: Available points, reserved points, total earned, total redeemed, ledger & claims history
  @UseGuards(JwtAuthGuard)
  @Get('partner-wallet')
  async getPartnerWallet(
    @Query('email') email: string,
    @Query('role') role: string | undefined,
    @Request() req: any
  ) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    const targetEmail = isAdmin && email ? email : (req.user?.email || email);
    return this.rewardsService.getPartnerWallet(targetEmail, role);
  }

  // 3. Save / Update Partner Bank Details
  @UseGuards(JwtAuthGuard)
  @Post('bank-detail')
  async saveBankDetail(@Body() body: any, @Request() req: any) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    if (!isAdmin && req.user?.email) {
      body.email = req.user.email;
    }
    return this.rewardsService.saveBankDetail(body);
  }

  // 4. Partner Submit Reward Claim (500 pts OR All Points)
  @UseGuards(JwtAuthGuard)
  @Post('claim-reward')
  async claimReward(@Body() body: any, @Request() req: any) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    if (!isAdmin && req.user?.email) {
      body.email = req.user.email;
    }
    return this.rewardsService.claimReward(body);
  }

  // Legacy Endpoints (Maintained for backward compatibility)
  @UseGuards(JwtAuthGuard)
  @Post('claim')
  async submitClaim(@Body() body: any, @Request() req: any) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    if (!isAdmin && req.user?.email) {
      body.userEmail = req.user.email;
    }
    return this.rewardsService.submitClaim(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-claim')
  async getMyClaim(@Query('email') email: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    const targetEmail = isAdmin && email ? email : (req.user?.email || email);
    return this.rewardsService.getClaimByUser(targetEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dealer-summary')
  async getDealerSummary(@Query('email') email: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    const targetEmail = isAdmin && email ? email : (req.user?.email || email);
    return this.rewardsService.getDealerRewardsSummary(targetEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Get('spotter-summary')
  async getSpotterSummary(@Query('email') email: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.type === 'admin';
    const targetEmail = isAdmin && email ? email : (req.user?.email || email);
    return this.rewardsService.getSpotterRewardsSummary(targetEmail);
  }

  // =========================================================================
  // ADMIN SECURED ENDPOINTS
  // =========================================================================

  // 5. Admin: Update Reward Conversion Setting (500 Pts = ₹Configurable)
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards.settings', 'rewards')
  @Patch('config')
  async updateRewardConfig(@Body() body: any, @Request() req: any) {
    return this.rewardsService.updateRewardConfig(body, req?.user);
  }

  // 6. Admin: Get all Reward Claims with filters, search, and summary dashboard metrics
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards.view', 'rewards')
  @Get('claims')
  async getAllClaimsAdmin(
    @Query('status') status?: string,
    @Query('partner') partner?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.rewardsService.getAllClaimsAdmin({ status, partner, search, startDate, endDate });
  }

  // 7. Admin: Get Partner complete profile (Property contributions, points history, claims, bank details)
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards.view', 'rewards')
  @Get('partner-profile/:email')
  async getPartnerProfileAdmin(@Param('email') email: string) {
    return this.rewardsService.getPartnerProfileAdmin(email);
  }

  // 8. Admin: Process Claim (Mark as Paid with UTR/Ref ID, or Reject and release reserved points)
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards.approve', 'rewards.reject', 'rewards.process', 'rewards.mark_paid', 'rewards')
  @Patch('claims/:id/process')
  async processClaimAdmin(
    @Param('id') id: string,
    @Body() body: {
      status: 'PROCESSING' | 'APPROVED' | 'PAID' | 'REJECTED';
      paymentReference?: string;
      paymentDate?: string;
      adminNotes?: string;
      rejectionReason?: string;
    },
    @Request() req: any
  ) {
    const isSuper = req.user?.role === 'SUPER_ADMIN';
    const userPerms: string[] = req.user?.permissions || [];
    if (!isSuper) {
      if (body.status === 'APPROVED' && !userPerms.includes('rewards') && !userPerms.includes('rewards.approve')) {
        throw new ForbiddenException('Permission Denied: You do not have permission to approve reward claims (rewards.approve)');
      }
      if (body.status === 'REJECTED' && !userPerms.includes('rewards') && !userPerms.includes('rewards.reject')) {
        throw new ForbiddenException('Permission Denied: You do not have permission to reject reward claims (rewards.reject)');
      }
      if (body.status === 'PROCESSING' && !userPerms.includes('rewards') && !userPerms.includes('rewards.process')) {
        throw new ForbiddenException('Permission Denied: You do not have permission to process reward claims (rewards.process)');
      }
      if (body.status === 'PAID' && !userPerms.includes('rewards') && !userPerms.includes('rewards.mark_paid')) {
        throw new ForbiddenException('Permission Denied: You do not have permission to mark reward claims as paid (rewards.mark_paid)');
      }
    }
    return this.rewardsService.processClaimAdmin(id, body, req?.user);
  }

  // Legacy Admin Endpoints
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards.view', 'rewards')
  @Get()
  async findAll(@Query('status') status?: string, @Query('role') role?: string) {
    return this.rewardsService.findAll(status, role);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Post()
  async create(@Body() body: any) {
    return this.rewardsService.create(body);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.rewardsService.updateStatus(id, body.status);
  }

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('rewards')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.rewardsService.delete(id);
  }
}
