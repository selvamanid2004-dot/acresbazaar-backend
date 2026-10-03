import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions/permissions.guard';
import { RequirePermissions } from '../common/permissions/permissions.decorator';

@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  // Public endpoint for Public Website (Approved properties only with Multi-criteria Filter Search)
  @Get('public')
  async findPublic(
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('city') city?: string,
    @Query('budget') budget?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('propertyType') propertyType?: string,
    @Query('bhk') bhk?: string,
    @Query('facing') facing?: string,
    @Query('furnishing') furnishing?: string,
    @Query('constructionStatus') constructionStatus?: string,
    @Query('planType') planType?: string,
    @Query('search') search?: string,
    @Query('isSnap') isSnap?: string
  ) {
    return this.propertiesService.findPublic({ 
      category, 
      location: location || city, 
      budget, 
      minPrice, 
      maxPrice, 
      propertyType,
      bhk,
      facing,
      furnishing,
      constructionStatus,
      planType, 
      search, 
      isSnap 
    });
  }

  // Public endpoint for dynamic location/city autocomplete suggestions from live database properties
  @Get('locations')
  async getLocations(@Query('q') q?: string) {
    return this.propertiesService.getDistinctLocations(q);
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
    @Query('phone') phone?: string,
    @Query('role') role?: string
  ) {
    return this.propertiesService.findSellerProperties({ sellerId, email, phone, role });
  }

  // Admin endpoint: List all properties with status tabs (PENDING, APPROVED, HOLD, REJECTED, ALL)
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('properties', 'gold_properties', 'premium_properties', 'snap_properties')
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

  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('properties', 'gold_properties', 'premium_properties', 'snap_properties')
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

  // Dealer / Buyer: Book / Purchase Property under Gold Plan or Platinum Plan
  @Post(':id/book')
  async bookProperty(@Param('id') id: string, @Body() body: any) {
    return this.propertiesService.bookProperty(id, body);
  }

  // Dealer: Get my booked properties (Strictly Isolated)
  @Get('bookings/my')
  async findDealerBookings(
    @Query('email') email?: string,
    @Query('dealerId') dealerId?: string
  ) {
    return this.propertiesService.findDealerBookings(email, dealerId);
  }

  // Buyer: Get my booked properties / enquiries (Strictly Isolated)
  @Get('bookings/buyer')
  async findBuyerBookings(
    @Query('email') email?: string,
    @Query('buyerId') buyerId?: string
  ) {
    return this.propertiesService.findBuyerBookings(email, buyerId);
  }

  // Admin: Get all property bookings (Filterable by Buyer vs Dealer, Gold vs Premium Plan, and Status)
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('bookings', 'properties', 'gold_properties', 'premium_properties')
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
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('bookings', 'properties', 'gold_properties', 'premium_properties')
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
    return this.propertiesService.create(body);
  }

  // Admin: Update Status (APPROVE, REJECT, HOLD, PUBLISH) + optional tier/plan selection
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('properties')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: string; planType?: string; tier?: string },
    @Request() req: any
  ) {
    const tier = body.planType || body.tier;
    return this.propertiesService.updateStatus(id, body.status, tier, req?.user);
  }

  // Edit property details (Seller/Dealer can edit their own, Admin can edit any)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.propertiesService.update(id, body, req?.user);
  }

  // Delete property (Seller/Dealer can delete their own, Admin can delete any)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.propertiesService.delete(id, req?.user);
  }
}
