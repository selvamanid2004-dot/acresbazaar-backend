import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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
  @RequirePermissions('properties.view', 'properties', 'gold_properties.view', 'premium_properties.view', 'snap_properties.view')
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
  @RequirePermissions('properties.view', 'properties', 'gold_properties.view', 'premium_properties.view', 'snap_properties.view')
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
  @RequirePermissions('bookings.view', 'bookings', 'properties.view', 'properties')
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
  @RequirePermissions('bookings.update', 'bookings', 'properties.update', 'properties')
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
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any, @Request() req: any) {
    if (req.user && !body.sellerId && req.user.type !== 'admin') {
      body.sellerId = req.user.sub || req.user.id;
      if (!body.sellerEmail && req.user.email) body.sellerEmail = req.user.email;
      if (!body.sellerName && req.user.name) body.sellerName = req.user.name;
    }
    return this.propertiesService.create(body);
  }

  // Admin: Update Status (APPROVE, REJECT, HOLD, PUBLISH) + optional tier/plan selection
  @UseGuards(AdminGuard, PermissionsGuard)
  @RequirePermissions('properties.approve', 'properties.reject', 'properties.update', 'properties')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: string; planType?: string; tier?: string },
    @Request() req: any
  ) {
    const cleanStatus = (body.status || '').toUpperCase();
    const userPerms: string[] = req.user?.permissions || [];
    const isSuper = req.user?.role === 'SUPER_ADMIN';

    if (!isSuper) {
      if (cleanStatus === 'APPROVED') {
        const canApprove = userPerms.includes('properties') || 
                           userPerms.includes('properties.approve') || 
                           userPerms.includes('gold_properties.approve') || 
                           userPerms.includes('premium_properties.approve') || 
                           userPerms.includes('snap_properties.approve');
        if (!canApprove) {
          throw new ForbiddenException('Permission Denied: You do not have permission to approve properties (properties.approve)');
        }
      } else if (cleanStatus === 'REJECTED' || cleanStatus === 'HOLD') {
        const canReject = userPerms.includes('properties') || 
                           userPerms.includes('properties.reject') || 
                           userPerms.includes('gold_properties.reject') || 
                           userPerms.includes('premium_properties.reject') || 
                           userPerms.includes('snap_properties.reject');
        if (!canReject) {
          throw new ForbiddenException('Permission Denied: You do not have permission to reject or hold properties (properties.reject)');
        }
      }
    }

    const tier = body.planType || body.tier;
    return this.propertiesService.updateStatus(id, body.status, tier, req?.user);
  }

  // Edit property details (Seller/Dealer can edit their own, Admin can edit any)
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    if (req.user && req.user.type === 'admin' && req.user.role !== 'SUPER_ADMIN') {
      const userPerms: string[] = req.user.permissions || [];
      const canEdit = userPerms.includes('properties') || userPerms.includes('properties.update');
      if (!canEdit) {
        throw new ForbiddenException('Permission Denied: You do not have permission to edit properties (properties.update)');
      }
    }
    return this.propertiesService.update(id, body, req?.user);
  }

  // Set cover / primary image for a property
  @UseGuards(JwtAuthGuard)
  @Patch(':id/images/:imageId/cover')
  async setCoverImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Request() req: any
  ) {
    if (req.user && req.user.type === 'admin' && req.user.role !== 'SUPER_ADMIN') {
      const userPerms: string[] = req.user.permissions || [];
      const canEdit = userPerms.includes('properties') || userPerms.includes('properties.update');
      if (!canEdit) {
        throw new ForbiddenException('Permission Denied: You do not have permission to edit property images (properties.update)');
      }
    }
    return this.propertiesService.setCoverImage(id, imageId, req?.user);
  }

  // Delete an individual image from a property
  @UseGuards(JwtAuthGuard)
  @Delete(':id/images/:imageId')
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Request() req: any
  ) {
    if (req.user && req.user.type === 'admin' && req.user.role !== 'SUPER_ADMIN') {
      const userPerms: string[] = req.user.permissions || [];
      const canDel = userPerms.includes('properties') || userPerms.includes('properties.delete') || userPerms.includes('properties.update');
      if (!canDel) {
        throw new ForbiddenException('Permission Denied: You do not have permission to delete property images (properties.delete)');
      }
    }
    return this.propertiesService.deleteImage(id, imageId, req?.user);
  }

  // Add more images to a property
  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  async addImages(
    @Param('id') id: string,
    @Body() body: { images: any[] },
    @Request() req: any
  ) {
    if (req.user && req.user.type === 'admin' && req.user.role !== 'SUPER_ADMIN') {
      const userPerms: string[] = req.user.permissions || [];
      const canAdd = userPerms.includes('properties') || userPerms.includes('properties.create') || userPerms.includes('properties.update');
      if (!canAdd) {
        throw new ForbiddenException('Permission Denied: You do not have permission to add property images (properties.update)');
      }
    }
    return this.propertiesService.addImages(id, body.images, req?.user);
  }

  // Delete property (Seller/Dealer can delete their own, Admin can delete any)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    if (req.user && req.user.type === 'admin' && req.user.role !== 'SUPER_ADMIN') {
      const userPerms: string[] = req.user.permissions || [];
      const canDelete = userPerms.includes('properties') || userPerms.includes('properties.delete');
      if (!canDelete) {
        throw new ForbiddenException('Permission Denied: You do not have permission to delete properties (properties.delete)');
      }
    }
    return this.propertiesService.delete(id, req?.user);
  }
}
