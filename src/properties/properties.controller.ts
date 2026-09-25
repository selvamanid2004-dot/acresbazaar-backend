import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  // Public endpoint for Public Website (Approved properties only)
  @Get('public')
  async findPublic(
    @Query('category') category?: string,
    @Query('planType') planType?: string,
    @Query('search') search?: string
  ) {
    return this.propertiesService.findPublic({ category, planType, search });
  }

  // Seller / Dealer: Get my submitted properties
  @UseGuards(JwtAuthGuard)
  @Get('my-properties')
  async findMyProperties(@Request() req: any) {
    return this.propertiesService.findMyProperties(req.user.sub);
  }

  // Seller: Get properties submitted by seller (by sellerId, email, or phone)
  @Get('seller/listings')
  async findSellerProperties(
    @Query('sellerId') sellerId?: string,
    @Query('email') email?: string,
    @Query('phone') phone?: string
  ) {
    return this.propertiesService.findSellerProperties({ sellerId, email, phone });
  }

  // Admin endpoint: List all properties with status tabs (PENDING, APPROVED, HOLD, REJECTED, ALL)
  @UseGuards(AdminGuard)
  @Get('admin/all')
  async findAllAdmin(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isSnap') isSnap?: string,
    @Query('planType') planType?: string
  ) {
    return this.propertiesService.findAllAdmin({ status, category, search, role, isSnap, planType });
  }

  @UseGuards(AdminGuard)
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isSnap') isSnap?: string
  ) {
    return this.propertiesService.findAllAdmin({ status, category, search, role, isSnap });
  }

  // Dealer: Book / Purchase Property under Gold Plan or Premium Plan
  @Post(':id/book')
  async bookProperty(@Param('id') id: string, @Body() body: any) {
    return this.propertiesService.bookProperty(id, body);
  }

  // Dealer: Get my booked properties
  @Get('bookings/my')
  async findDealerBookings(
    @Query('email') email?: string,
    @Query('dealerId') dealerId?: string
  ) {
    return this.propertiesService.findDealerBookings(email, dealerId);
  }

  // Admin: Get all property bookings (Filterable by Buyer vs Dealer, Gold vs Premium Plan, and Status)
  @UseGuards(AdminGuard)
  @Get('admin/bookings')
  async findAllBookingsAdmin(
    @Query('role') role?: string,
    @Query('planType') planType?: string,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    return this.propertiesService.findAllBookingsAdmin({ role, planType, search, status });
  }

  // Admin: Update Booking status
  @UseGuards(AdminGuard)
  @Patch('admin/bookings/:id/status')
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    return this.propertiesService.updateBookingStatus(id, body.status);
  }

  // Get single property details
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  // Create property (Seller, Dealer, or Admin quick-post)
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    // If bearer token attached, associate with user
    return this.propertiesService.create(body);
  }

  // Admin: Update Status (APPROVE, REJECT, HOLD, PUBLISH) + optional tier/plan selection
  @UseGuards(AdminGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: string; planType?: string; tier?: string }
  ) {
    const tier = body.planType || body.tier;
    return this.propertiesService.updateStatus(id, body.status, tier);
  }

  // Admin: Edit property details
  @UseGuards(AdminGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.propertiesService.update(id, body);
  }

  // Admin: Delete property
  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.propertiesService.delete(id);
  }
}
