import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  // 1. Find all properties for Admin with filters (status: ALL, PENDING, APPROVED, REJECTED, HOLD)
  async findAllAdmin(query: { status?: string; category?: string; search?: string; role?: string; isSnap?: string; planType?: string }) {
    const { status, category, search, role, isSnap, planType } = query;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (planType && planType !== 'ALL') {
      const cleanPlan = planType.toUpperCase().trim();
      where.planType = cleanPlan.includes('GOLD') ? 'GOLD' : 'PLATINUM';
    }

    if (role && role !== 'ALL') {
      where.AND = [
        ...( where.AND || [] ),
        { OR: [
          { seller: { role: role.toUpperCase() } },
          { sellerRole: role.toUpperCase() }
        ]}
      ];
    }

    // FIX: isSnap filter must not overwrite role filter — merge with AND
    if (isSnap === 'true') {
      const snapCond = { OR: [
        { categorySpecs: { contains: '"isSnapProperty":true' } },
        { seller: { role: 'COMMON_PEOPLE' } }
      ]};
      where.AND = [ ...(where.AND || []), snapCond ];
    }

    if (search && search.trim()) {
      const q = search.trim();
      // FIX: case-insensitive search via mode: 'insensitive'
      const searchConditions = [
        { title:      { contains: q, mode: 'insensitive' } },
        { location:   { contains: q, mode: 'insensitive' } },
        { city:       { contains: q, mode: 'insensitive' } },
        { sellerName: { contains: q, mode: 'insensitive' } }
      ];
      where.AND = [ ...(where.AND || []), { OR: searchConditions } ];
    }

    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        seller: {
          select: { id: true, name: true, email: true, mobile: true, role: true }
        }
      }
    });

    return { success: true, count: properties.length, properties };
  }

  // 2. Find Single Property
  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        seller: true,
        bookings: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return { success: true, property };
  }

  // 3. Create Property (Seller, Dealer, or Admin quick-post)
  async create(data: {
    title: string;
    category: string;
    location?: string;
    address?: string;
    locality?: string;
    city?: string;
    price?: number | string;
    priceDisplay?: string;
    description?: string;
    planType?: string;
    sellerId?: string;
    sellerName?: string;
    sellerPhone?: string;
    sellerEmail?: string;
    sellerRole?: string;
    dealerCompany?: string;
    categorySpecs?: any;
    images?: any[];
    status?: string; // default PENDING unless Admin specifies
  }) {
    const title = (data.title || '').trim();
    const category = (data.category || '').trim();
    const location = (data.location || data.address || data.locality || data.city || '').trim();
    const city = (data.city || '').trim();

    // FIX: location is required; city alone is also acceptable as a fallback
    if (!title || !category || (!location && !city)) {
      throw new BadRequestException('Title, category, and location/city are required');
    }

    // Robust real-estate price parser (supports numbers, formatted commas, Cr, Lakh, etc.)
    let cleanPrice = 0;
    if (typeof data.price === 'number') {
      cleanPrice = isNaN(data.price) ? 0 : data.price;
    } else if (data.price !== undefined && data.price !== null) {
      const priceStr = String(data.price).trim().toLowerCase();
      const numPart = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      if (priceStr.includes('cr') || priceStr.includes('crore')) {
        cleanPrice = Math.round(numPart * 10000000);
      } else if (priceStr.includes('lakh') || priceStr.includes('lac')) {
        cleanPrice = Math.round(numPart * 100000);
      } else if (priceStr.includes('k')) {
        cleanPrice = Math.round(numPart * 1000);
      } else {
        cleanPrice = numPart;
      }
    }

    const priceDisplay = (data.priceDisplay && data.priceDisplay.trim())
      ? data.priceDisplay.trim()
      : (cleanPrice > 0 ? `₹${cleanPrice.toLocaleString('en-IN')}` : 'Price on Request');

    const status = (data.status || 'PENDING').toUpperCase().trim();
    
    // Normalize plan type: PREMIUM -> PLATINUM
    let planType = (data.planType || 'PLATINUM').toUpperCase().trim();
    if (planType === 'PREMIUM') planType = 'PLATINUM';

    // Serialize categorySpecs safely
    let specsStr: string | null = null;
    if (data.categorySpecs !== undefined && data.categorySpecs !== null) {
      specsStr = typeof data.categorySpecs === 'object' ? JSON.stringify(data.categorySpecs) : String(data.categorySpecs);
    }

    // Detect if dealer listing
    const isDealerListing = (data.sellerRole || '').toUpperCase() === 'DEALER' || !!data.dealerCompany;
    const sellerRole = isDealerListing ? 'DEALER' : (data.sellerRole ? data.sellerRole.toUpperCase().trim() : 'SELLER');
    const dealerCompany = data.dealerCompany ? data.dealerCompany.trim() : '';

    // Validate foreign key: check if sellerId exists in User table, or auto-link via email
    let validSellerId: string | null = null;
    let sellerName = (data.sellerName || '').trim();
    let sellerPhone = (data.sellerPhone || '').trim();
    let sellerEmail = (data.sellerEmail || '').trim().toLowerCase();

    if (data.sellerId && typeof data.sellerId === 'string' && data.sellerId.trim()) {
      try {
        const userExists = await this.prisma.user.findUnique({
          where: { id: data.sellerId.trim() }
        });
        if (userExists) {
          validSellerId = userExists.id;
          if (!sellerName) sellerName = userExists.name;
          if (!sellerPhone) sellerPhone = userExists.mobile;
          if (!sellerEmail) sellerEmail = userExists.email.toLowerCase();
        }
      } catch {}
    }

    if (!validSellerId && sellerEmail) {
      try {
        const userByEmail = await this.prisma.user.findUnique({
          where: { email: sellerEmail }
        });
        if (userByEmail) {
          validSellerId = userByEmail.id;
          if (!sellerName) sellerName = userByEmail.name;
          if (!sellerPhone) sellerPhone = userByEmail.mobile;
        } else if (sellerName) {
          // Auto-create user record so foreign key is valid and tracked in Customers
          const newUser = await this.prisma.user.create({
            data: {
              name: sellerName,
              email: sellerEmail,
              mobile: sellerPhone,
              role: sellerRole,
              // FIX: use a random irreversible placeholder — never a guessable string
              passwordHash: require('crypto').randomBytes(32).toString('hex'),
              isActive: true
            }
          });
          validSellerId = newUser.id;
        }
      } catch (err) {
        console.warn('Could not link/create user for property seller:', err);
      }
    }

    if (!sellerName) {
      sellerName = isDealerListing ? 'Authorized Dealer' : 'Registered Seller';
    }

    // Normalize images: accept string URLs, image objects, and provide fallback
    let imageList: string[] = [];
    if (Array.isArray(data.images)) {
      imageList = data.images
        .map((img: any) => (typeof img === 'string' ? img : (img?.imageUrl || img?.url || '')))
        .filter((url: string) => typeof url === 'string' && url.trim().length > 0);
    }
    if (imageList.length === 0) {
      imageList.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80');
    }

    // Determine city (already declared above; derive from location if not provided)
    const resolvedCity = city || (location.includes(',') ? location.split(',').pop()?.trim() || '' : '');

    const property = await this.prisma.property.create({
      data: {
        title,
        category,
        location: location || resolvedCity,
        city: resolvedCity,
        price: cleanPrice,
        priceDisplay,
        description: data.description ? data.description.trim() : '',
        status,
        planType,
        sellerId: validSellerId,
        sellerName,
        sellerPhone,
        sellerEmail,
        sellerRole,
        dealerCompany: dealerCompany || null,
        categorySpecs: specsStr,
        images: {
          create: imageList.map((url, idx) => ({
            imageUrl: url,
            isPrimary: idx === 0,
            displayOrder: idx
          }))
        }
      },
      include: {
        images: true,
        seller: true
      }
    });

    // Award +250 points to dealer when listing a property for sale
    if (isDealerListing) {
      try {
        await this.prisma.reward.create({
          data: {
            userName: sellerName || 'Dealer Partner',
            userEmail: sellerEmail || null,
            userRole: 'DEALER',
            propertyTitle: property.title,
            rewardTitle: 'Dealer Property Listing Reward',
            points: 250,
            amount: 250,
            reason: `Listed property "${property.title}" for sale. Agency: ${dealerCompany || 'Authorized Dealer'}`,
            status: 'APPROVED'
          }
        });
      } catch (err) {
        console.error('Failed to award dealer listing points:', err);
      }
    }

    return {
      success: true,
      message: 'Property created successfully' + (status === 'PENDING' ? ' and submitted for admin review.' : '.'),
      property
    };
  }

  // 4. Update Property Status (APPROVE, REJECT, HOLD, PUBLISH) with optional planType tier assignment (GOLD / PREMIUM)
  async updateStatus(id: string, status: string, planType?: string) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'HOLD'];
    const cleanStatus = status.toUpperCase();
    if (!validStatuses.includes(cleanStatus)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status: cleanStatus };
    if (planType) {
      let cleanPlan = planType.toUpperCase().trim();
      if (cleanPlan === 'PREMIUM') cleanPlan = 'PLATINUM';
      updateData.planType = cleanPlan;
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: updateData,
      include: { images: true }
    });

    return {
      success: true,
      message: `Property status updated to ${cleanStatus}` + (planType ? ` under ${planType} plan` : ''),
      property: updated
    };
  }

  // 5. Update Property Details
  async update(id: string, data: any) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const specsStr = data.categorySpecs && typeof data.categorySpecs === 'object'
      ? JSON.stringify(data.categorySpecs)
      : data.categorySpecs;

    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.category ? { category: data.category.trim() } : {}),
        ...(data.location ? { location: data.location.trim() } : {}),
        ...(data.city ? { city: data.city.trim() } : {}),
        ...(data.price !== undefined ? { price: Number(data.price) } : {}),
        ...(data.priceDisplay ? { priceDisplay: data.priceDisplay } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.planType ? { planType: data.planType.toUpperCase() } : {}),
        ...(data.status ? { status: data.status.toUpperCase() } : {}),
        ...(specsStr !== undefined ? { categorySpecs: specsStr } : {})
      },
      include: { images: true }
    });

    return { success: true, message: 'Property updated successfully', property: updated };
  }

  // 6. Delete Property
  async delete(id: string) {
    await this.prisma.property.delete({ where: { id } });
    return { success: true, message: 'Property deleted successfully' };
  }

  // 7. PUBLIC Endpoint for Website (Returns only APPROVED properties)
  async findPublic(query: { category?: string; planType?: string; search?: string }) {
    const { category, planType, search } = query;
    const where: any = {
      status: 'APPROVED' // Only approved properties published on Public Website
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (planType && planType !== 'ALL') {
      where.planType = planType.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { location: { contains: q } },
        { city: { contains: q } }
      ];
    }

    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { displayOrder: 'asc' } }
      }
    });

    return {
      success: true,
      count: properties.length,
      properties: properties.map(p => {
        let specs: any = {};
        try {
          specs = p.categorySpecs ? JSON.parse(p.categorySpecs) : {};
        } catch {}

        const planNormalized = (p.planType || 'PLATINUM').toUpperCase();
        const tier = planNormalized === 'GOLD' ? 'gold' : 'platinum';

        return {
          id: p.id,
          title: p.title,
          category: p.category,
          tier,
          planType: planNormalized,
          type: p.category,
          price: p.price,
          priceDisplay: p.priceDisplay || `₹${p.price.toLocaleString('en-IN')}`,
          location: p.location,
          city: p.city,
          description: p.description,
          imageUrl: p.images[0]?.imageUrl || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          galleryImages: p.images.map(img => img.imageUrl),
          specs,
          sellerName: p.sellerName || 'Verified Partner',
          sellerPhone: p.sellerPhone,
          status: p.status,
          createdAt: p.createdAt
        };
      })
    };
  }

  // 8. Properties submitted by logged-in Seller / Dealer
  async findMyProperties(sellerId: string) {
    const properties = await this.prisma.property.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: { images: true }
    });

    const stats = {
      total: properties.length,
      pending: properties.filter(p => p.status === 'PENDING').length,
      approved: properties.filter(p => p.status === 'APPROVED').length,
      rejected: properties.filter(p => p.status === 'REJECTED').length,
      hold: properties.filter(p => p.status === 'HOLD').length
    };

    return {
      success: true,
      statistics: stats,
      properties: properties.map(p => ({
        property_id: p.id,
        title: p.title,
        category: p.category,
        plan: p.planType,
        price: p.priceDisplay || `₹${p.price.toLocaleString('en-IN')}`,
        location: p.location,
        city: p.city,
        status: p.status,
        created_at: p.createdAt.toISOString(),
        image_urls: p.images.map(img => img.imageUrl),
        // FIX: unguarded JSON.parse — wrap in try/catch to prevent 500 errors on bad data
        category_specs: (() => { try { return p.categorySpecs ? JSON.parse(p.categorySpecs) : {}; } catch { return {}; } })()
      }))
    };
  }

  // 9. Seller Properties by filter (sellerId, email, phone)
  async findSellerProperties(filter: { sellerId?: string; email?: string; phone?: string }) {
    const conditions: any[] = [];
    if (filter.sellerId && filter.sellerId.trim()) {
      conditions.push({ sellerId: filter.sellerId.trim() });
    }
    if (filter.email && filter.email.trim()) {
      conditions.push({ sellerEmail: filter.email.trim() });
    }
    if (filter.phone && filter.phone.trim()) {
      conditions.push({ sellerPhone: filter.phone.trim() });
    }

    const where: any = conditions.length > 0 ? { OR: conditions } : {};

    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { displayOrder: 'asc' } } }
    });

    const stats = {
      total: properties.length,
      pending: properties.filter(p => p.status === 'PENDING').length,
      approved: properties.filter(p => p.status === 'APPROVED').length,
      rejected: properties.filter(p => p.status === 'REJECTED').length,
      hold: properties.filter(p => p.status === 'HOLD').length
    };

    return {
      success: true,
      statistics: stats,
      count: properties.length,
      properties: properties.map(p => {
        let specs = {};
        try {
          specs = p.categorySpecs ? JSON.parse(p.categorySpecs) : {};
        } catch {}

        return {
          property_id: p.id,
          id: p.id,
          title: p.title,
          category: p.category,
          plan: p.planType,
          planType: p.planType,
          price: p.priceDisplay || `₹${p.price.toLocaleString('en-IN')}`,
          rawPrice: p.price,
          location: p.location,
          city: p.city,
          locality: p.location,
          full_address: p.location,
          status: p.status,
          created_at: p.createdAt.toISOString(),
          image_urls: p.images.map(img => img.imageUrl),
          category_specs: specs,
          seller_id: p.sellerId,
          seller_name: p.sellerName,
          seller_phone: p.sellerPhone,
          seller_email: p.sellerEmail,
          seller_role: p.sellerRole,
          dealer_company: p.dealerCompany
        };
      })
    };
  }

  // 10. Book Property (Supports both registered Buyer and Dealer under Gold / Platinum / Standard Plan)
  async bookProperty(propertyId: string, data: {
    bookerRole?: string; // 'BUYER' or 'DEALER'
    bookerId?: string;
    bookerName?: string;
    bookerEmail?: string;
    bookerPhone?: string;
    planType?: string;
    dealerId?: string;
    dealerName?: string;
    dealerCompany?: string;
    dealerEmail?: string;
    dealerPhone?: string;
    bookingAmount?: number;
    notes?: string;
  }) {
    const role = (data.bookerRole || 'DEALER').toUpperCase().trim();
    const isBuyer = role === 'BUYER';
    const isDealer = role === 'DEALER';

    const bookerName = (isBuyer ? data.bookerName : (data.dealerName || data.bookerName))?.trim();
    const bookerEmail = (isBuyer ? data.bookerEmail : (data.dealerEmail || data.bookerEmail))?.trim().toLowerCase();
    const bookerPhone = (isBuyer ? data.bookerPhone : (data.dealerPhone || data.bookerPhone))?.trim();

    if (!bookerName || !bookerEmail || !bookerPhone) {
      throw new BadRequestException(`${isBuyer ? 'Buyer' : 'Dealer'} name, email, and phone number are required`);
    }

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        seller: true,
        images: true
      }
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const cleanPlan = (data.planType || property.planType || 'PLATINUM').toUpperCase();
    // FIX: was incorrectly setting 'PREMIUM'; the correct canonical value is 'PLATINUM'
    const planType = cleanPlan.includes('GOLD') ? 'GOLD' : 'PLATINUM';
    const cleanAmount = typeof data.bookingAmount === 'number'
      ? data.bookingAmount
      : (parseFloat(String(data.bookingAmount || 0)) || 0);

    const sellerName = property.sellerName || property.seller?.name || 'Registered Seller';
    const sellerEmail = property.sellerEmail || property.seller?.email || '';
    const sellerPhone = property.sellerPhone || property.seller?.mobile || '';
    const sellerId = property.sellerId || property.seller?.id || null;

    const booking = await this.prisma.propertyBooking.create({
      data: {
        propertyId: property.id,
        propertyTitle: property.title,
        propertyCategory: property.category,
        propertyPrice: property.price,
        planType,
        bookerRole: isBuyer ? 'BUYER' : 'DEALER',
        bookerId: isBuyer ? (data.bookerId || null) : (data.dealerId || data.bookerId || null),
        bookerName,
        bookerEmail,
        bookerPhone,
        dealerId: isDealer ? (data.dealerId || data.bookerId || null) : null,
        dealerName: isDealer ? bookerName : null,
        dealerCompany: isDealer ? (data.dealerCompany ? data.dealerCompany.trim() : '') : null,
        dealerEmail: isDealer ? bookerEmail : null,
        dealerPhone: isDealer ? bookerPhone : null,
        sellerId,
        sellerName,
        sellerEmail,
        sellerPhone,
        bookingAmount: cleanAmount,
        bookingStatus: 'CONFIRMED',
        notes: data.notes ? data.notes.trim() : ''
      }
    });

    // If a Dealer booked the property under Gold or Premium Plan, award +500 Dealer Reward Points
    if (isDealer) {
      try {
        await this.prisma.reward.create({
          data: {
            userName: bookerName,
            userEmail: bookerEmail,
            userRole: 'DEALER',
            propertyTitle: property.title,
            // FIX: label now consistently says 'Platinum Plan' instead of 'Premium Plan'
            rewardTitle: `Dealer ${planType === 'GOLD' ? 'Gold Plan' : 'Platinum Plan'} Booking Reward`,
            points: 500,
            amount: 500,
            reason: `Booked property "${property.title}" under ${planType === 'GOLD' ? 'Gold Plan' : 'Platinum Plan'}. Agency: ${data.dealerCompany || 'Authorized Dealer'}`,
            status: 'APPROVED'
          }
        });
      } catch (err) {
        console.error('Failed to create dealer booking reward:', err);
      }
    }

    return {
      success: true,
      // FIX: label now consistently says 'Platinum Plan'
      message: `Property booked successfully under ${planType === 'GOLD' ? 'Gold Plan' : 'Platinum Plan'}!` +
               (isDealer ? ' +500 Dealer Reward Points added to your account.' : ' Details forwarded to seller & admin.'),
      booking
    };
  }

  // 10. Get Dealer Bookings (Filtered by email or dealerId)
  async findDealerBookings(dealerEmail?: string, dealerId?: string) {
    const where: any = {};
    if (dealerEmail && dealerEmail.trim()) {
      where.OR = [
        { dealerEmail: dealerEmail.trim().toLowerCase() },
        { bookerEmail: dealerEmail.trim().toLowerCase() }
      ];
    } else if (dealerId && dealerId.trim()) {
      where.OR = [
        { dealerId: dealerId.trim() },
        { bookerId: dealerId.trim() }
      ];
    }

    const bookings = await this.prisma.propertyBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          include: { images: true }
        }
      }
    });

    return { success: true, count: bookings.length, bookings };
  }

  // 11. Get All Bookings for Admin (Filterable by Buyer vs Dealer, Gold vs Premium Plan, and Status)
  async findAllBookingsAdmin(query: { role?: string; planType?: string; search?: string; status?: string }) {
    const where: any = {};

    if (query.role && query.role !== 'ALL') {
      const cleanRole = query.role.toUpperCase().trim();
      where.bookerRole = cleanRole;
    }

    if (query.planType && query.planType !== 'ALL') {
      const cleanPlan = query.planType.toUpperCase();
      // FIX: was storing 'PREMIUM'; correct canonical value is 'PLATINUM'
      where.planType = cleanPlan.includes('GOLD') ? 'GOLD' : 'PLATINUM';
    }

    if (query.status && query.status !== 'ALL') {
      where.bookingStatus = query.status.toUpperCase().trim();
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { propertyTitle: { contains: q } },
        { bookerName: { contains: q } },
        { bookerEmail: { contains: q } },
        { bookerPhone: { contains: q } },
        { dealerName: { contains: q } },
        { dealerCompany: { contains: q } },
        { sellerName: { contains: q } },
        { sellerEmail: { contains: q } },
        { sellerPhone: { contains: q } }
      ];
    }

    const bookings = await this.prisma.propertyBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          include: { images: true }
        }
      }
    });

    return { success: true, count: bookings.length, bookings };
  }

  // 12. Update Booking Status (Admin)
  async updateBookingStatus(id: string, status: string) {
    const valid = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'];
    const clean = status.toUpperCase();
    if (!valid.includes(clean)) {
      throw new BadRequestException(`Status must be one of: ${valid.join(', ')}`);
    }

    const booking = await this.prisma.propertyBooking.update({
      where: { id },
      data: { bookingStatus: clean }
    });

    return { success: true, message: `Booking status updated to ${clean}`, booking };
  }
}

