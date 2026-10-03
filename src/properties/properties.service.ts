import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

function getCategoryFallbackImage(category?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('plot') || cat.includes('land')) {
    return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('villa') || cat.includes('estate') || cat.includes('house')) {
    return 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('apartment') || cat.includes('flat')) {
    return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('commercial') || cat.includes('office') || cat.includes('retail')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('farm')) {
    return 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
}

function saveBase64Image(dataUrl: string, category?: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return getCategoryFallbackImage(category);
  }
  const trimmed = dataUrl.trim();
  if (trimmed.length < 500 && trimmed.startsWith('data:image/')) {
    return getCategoryFallbackImage(category);
  }
  if (trimmed.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')) {
    return getCategoryFallbackImage(category);
  }
  if (trimmed.startsWith('data:image/')) {
    try {
      const matches = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches && matches[2].length > 300) {
        const rawExt = matches[1].toLowerCase();
        const ext = rawExt.includes('png') ? 'png' : rawExt.includes('webp') ? 'webp' : 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const hash = require('crypto').createHash('md5').update(matches[2].slice(0, 1000)).digest('hex').slice(0, 12);
        const fileName = `prop-${hash}.${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, buffer);
        }
        return `/uploads/${fileName}`;
      }
    } catch {
      return trimmed;
    }
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return getCategoryFallbackImage(category);
}

function parseBudgetRange(budget?: string): { min?: number; max?: number } {
  if (!budget || budget === 'any' || budget === 'ALL') return {};
  const b = budget.toLowerCase().trim();

  if (b.includes('under-20') || b.includes('0-20') || b === 'under-20l' || b === 'under-20-lakhs') {
    return { min: 0, max: 2000000 };
  }
  if (b.includes('20l-50l') || b.includes('20-50') || b.includes('20lakhs-50lakhs') || b === '20l-50l') {
    return { min: 2000000, max: 5000000 };
  }
  if (b.includes('50l-1cr') || b.includes('50-1cr') || b.includes('50lakhs-1crore') || b === '50l-1cr') {
    return { min: 5000000, max: 10000000 };
  }
  if (b.includes('1cr-3cr') || b.includes('1-3cr') || b.includes('1crore-3crore') || b === '1cr-3cr') {
    return { min: 10000000, max: 30000000 };
  }
  if (b.includes('3cr-5cr') || b.includes('3-5cr') || b.includes('3crore-5crore') || b === '3cr-5cr') {
    return { min: 30000000, max: 50000000 };
  }
  if (b.includes('above-5cr') || b.includes('5cr-plus') || b.includes('5cr+') || b.includes('above-5crore') || b === 'above-5cr') {
    return { min: 50000000 };
  }
  if (b.includes('under-500k')) return { min: 0, max: 500000 };
  if (b.includes('500k-1m')) return { min: 500000, max: 1000000 };
  if (b.includes('1m-2m')) return { min: 1000000, max: 2000000 };
  if (b.includes('2m-5m')) return { min: 2000000, max: 5000000 };
  if (b.includes('5m-plus')) return { min: 5000000 };

  if (b.includes('-')) {
    const parts = b.split('-');
    const minVal = parseFloat(parts[0]);
    const maxVal = parseFloat(parts[1]);
    return {
      min: !isNaN(minVal) ? minVal : undefined,
      max: !isNaN(maxVal) ? maxVal : undefined
    };
  }

  return {};
}

function normalizeCategoryTerms(catSlugOrName: string): string[] {
  const c = catSlugOrName.toLowerCase().trim();
  if (!c || c === 'all' || c === 'all-residential') return [];

  if (c.includes('plot') || c.includes('land')) return ['Plot', 'Plots', 'Land', 'Plots & Land', 'Plots & Lands', 'plots', 'plots-land'];
  if (c.includes('villa') || c.includes('estate')) return ['Villa', 'Villas', 'Villas & Estates', 'villas', 'villas-estates'];
  if (c.includes('apartment') || c.includes('flat')) return ['Apartment', 'Apartments', 'Apartment / Flats', 'Flats', 'apartments'];
  if (c.includes('house') || c.includes('independent')) return ['Independent House', 'Independent Houses', 'House', 'Houses', 'independent-houses'];
  if (c.includes('commercial') || c.includes('office') || c.includes('retail')) return ['Commercial', 'Commercial Space', 'Commercial Spaces', 'commercial', 'commercial-spaces'];
  if (c.includes('farm')) return ['Farm Land', 'Farm Lands', 'Farm', 'farm-lands'];

  return [catSlugOrName];
}

function extractOwnerContact(property: any) {
  let specs: any = {};
  try {
    if (typeof property.categorySpecs === 'string') {
      specs = JSON.parse(property.categorySpecs);
    } else if (property.categorySpecs && typeof property.categorySpecs === 'object') {
      specs = property.categorySpecs;
    }
  } catch {}

  const isSnap = specs?.isSnapProperty || (property.sellerRole === 'COMMON_PEOPLE') || (property.sellerRole === 'PARTNER');

  // 1. Phone: prioritize snap boardContact, then property-specific sellerPhone, then specs.ownerPhone
  let phone = '';
  if (isSnap && specs?.boardContact) {
    phone = specs.boardContact.trim();
  } else if (property.sellerPhone && property.sellerPhone.trim()) {
    phone = property.sellerPhone.trim();
  } else if (specs?.ownerPhone || specs?.owner_phone || specs?.contactPhone) {
    phone = (specs.ownerPhone || specs.owner_phone || specs.contactPhone).trim();
  } else if (property.seller?.mobile && property.seller?.mobile.trim()) {
    phone = property.seller.mobile.trim();
  }

  // 2. Name: prioritize property-specific sellerName / ownerName
  let name = '';
  if (property.sellerName && property.sellerName.trim() && !['partner', 'community partner', 'spotter', 'verified partner'].includes(property.sellerName.toLowerCase())) {
    name = property.sellerName.trim();
  } else if (specs?.ownerName || specs?.owner_name || specs?.boardContactName || specs?.contactName) {
    name = (specs.ownerName || specs.owner_name || specs.boardContactName || specs.contactName).trim();
  } else if (isSnap) {
    name = 'Property Owner';
  } else if (property.seller?.name) {
    name = property.seller.name;
  } else {
    name = 'Property Owner';
  }

  // 3. Email: prioritize property-specific sellerEmail / ownerEmail
  let email = '';
  if (property.sellerEmail && property.sellerEmail.trim() && !property.sellerEmail.includes('partner@') && !property.sellerEmail.includes('spotter@')) {
    email = property.sellerEmail.trim();
  } else if (specs?.ownerEmail || specs?.owner_email) {
    email = (specs.ownerEmail || specs.owner_email).trim();
  } else if (!isSnap && property.seller?.email) {
    email = property.seller.email;
  }

  return {
    name,
    phone,
    email
  };
}

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

    // Property Source Rule: Snap Properties contains ONLY properties registered/posted by Partners (previously Common People)
    if (isSnap === 'true') {
      const snapPartnerCond = {
        OR: [
          { seller: { role: { in: ['COMMON_PEOPLE', 'PARTNER'] } } },
          { sellerRole: { in: ['COMMON_PEOPLE', 'PARTNER'] } }
        ]
      };
      where.AND = [ ...(where.AND || []), snapPartnerCond ];
    }

    if (search && search.trim()) {
      const q = search.trim();
      const searchConditions = [
        { title:      { contains: q } },
        { location:   { contains: q } },
        { city:       { contains: q } },
        { sellerName: { contains: q } }
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

    const sanitizedProperties = properties.map(p => {
      let imgs = (p.images || []).map(img => ({
        ...img,
        imageUrl: saveBase64Image(img.imageUrl, p.category)
      }));
      if (imgs.length === 0) {
        imgs = [{
          id: `fallback-${p.id}`,
          propertyId: p.id,
          imageUrl: getCategoryFallbackImage(p.category),
          isPrimary: true,
          displayOrder: 0
        } as any];
      }
      const owner_contact = extractOwnerContact(p);
      return { 
        ...p, 
        images: imgs,
        owner_contact,
        ownerContact: owner_contact
      };
    });

    return { success: true, count: sanitizedProperties.length, properties: sanitizedProperties };
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
    let imgs = (property.images || []).map(img => ({
      ...img,
      imageUrl: saveBase64Image(img.imageUrl, property.category)
    }));
    if (imgs.length === 0) {
      imgs = [{
        id: `fallback-${property.id}`,
        propertyId: property.id,
        imageUrl: getCategoryFallbackImage(property.category),
        isPrimary: true,
        displayOrder: 0
      } as any];
    }
    const owner_contact = extractOwnerContact(property);
    return { 
      success: true, 
      property: { 
        ...property, 
        images: imgs,
        owner_contact,
        ownerContact: owner_contact
      } 
    };
  }

  // 3. Create Property (Seller, Dealer, Partner, or Admin quick-post)
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
    let isSnapProperty = false;
    if (data.categorySpecs !== undefined && data.categorySpecs !== null) {
      specsStr = typeof data.categorySpecs === 'object' ? JSON.stringify(data.categorySpecs) : String(data.categorySpecs);
      try {
        const parsed = typeof data.categorySpecs === 'object' ? data.categorySpecs : JSON.parse(specsStr);
        if (parsed?.isSnapProperty) isSnapProperty = true;
      } catch {}
    }

    // Detect role
    const rawRole = (data.sellerRole || '').toUpperCase().trim();
    const isDealerListing = rawRole === 'DEALER' || !!data.dealerCompany;
    const isPartnerListing = rawRole === 'COMMON_PEOPLE' || rawRole === 'PARTNER' || isSnapProperty;
    let sellerRole = isDealerListing ? 'DEALER' : (isPartnerListing ? (rawRole || 'COMMON_PEOPLE') : (data.sellerRole ? rawRole : 'SELLER'));
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
          if (!data.sellerRole && userExists.role) {
            sellerRole = userExists.role;
          }
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
          if (!data.sellerRole && userByEmail.role) {
            sellerRole = userByEmail.role;
          }
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
        .filter((url: string) => typeof url === 'string' && url.trim().length > 0)
        .map((url: string) => saveBase64Image(url, category));
    }
    if (imageList.length === 0) {
      imageList.push(getCategoryFallbackImage(category));
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

    return {
      success: true,
      message: 'Property created successfully' + (status === 'PENDING' ? ' and submitted for admin review.' : '.'),
      property
    };
  }

  // Helper method: Award 20 Points on property approval (Strictly Idempotent)
  private async awardApprovalPointsIdempotent(propertyId: string, adminUser?: any) {
    try {
      const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
      if (!property || property.pointsAwarded) {
        return; // Already awarded or not found
      }

      const setting = await this.prisma.rewardSetting.findFirst();
      const pointsToAward = setting?.pointsPerProperty || 20;

      const partnerEmail = (property.sellerEmail || '').trim().toLowerCase() || 'partner@acresbazaar.com';
      const partnerName = property.sellerName || 'Partner';
      const partnerRole = property.sellerRole || 'PARTNER';

      await this.prisma.$transaction(async (tx) => {
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

        // Add Points Ledger transaction
        await tx.pointsLedger.create({
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

        // Legacy reward record
        try {
          await tx.reward.create({
            data: {
              userName: partnerName,
              userEmail: partnerEmail,
              userRole: partnerRole,
              propertyTitle: property.title,
              rewardTitle: 'Property Approved Reward',
              points: pointsToAward,
              amount: pointsToAward,
              reason: `Property "${property.title}" approved by Admin. +${pointsToAward} points added.`,
              status: 'APPROVED'
            }
          });
        } catch (e) {
          // ignore legacy duplicate log
        }
      });
    } catch (err) {
      console.error('Failed to award property approval points:', err);
    }
  }

  // 4. Update Property Status (APPROVE, REJECT, HOLD, PUBLISH) with optional planType tier assignment (GOLD / PREMIUM)
  async updateStatus(id: string, status: string, planType?: string, adminUser?: any) {
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

    // Award +20 points ONLY when status is APPROVED for the first time
    if (cleanStatus === 'APPROVED') {
      await this.awardApprovalPointsIdempotent(id, adminUser);
    }

    return {
      success: true,
      message: `Property status updated to ${cleanStatus}` + (planType ? ` under ${planType} plan` : ''),
      property: updated
    };
  }

  // 5. Update Property Details (Strict Ownership Check for non-admin)
  async update(id: string, data: any, user?: any) {
    const property = await this.prisma.property.findUnique({ where: { id }, include: { images: true } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // If user is provided and is not admin/super_admin, enforce ownership
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.type !== 'admin') {
      const isOwner = property.sellerId === user.sub || 
                      property.sellerId === user.id || 
                      (user.email && property.sellerEmail?.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) {
        throw new ForbiddenException('Access denied. You do not have permission to modify this property.');
      }
    }

    const specsStr = data.categorySpecs && typeof data.categorySpecs === 'object'
      ? JSON.stringify(data.categorySpecs)
      : data.categorySpecs;

    // Handle images update if provided
    if (Array.isArray(data.images)) {
      const cleanImages = data.images
        .map((img: any) => (typeof img === 'string' ? img : (img?.imageUrl || img?.url || '')))
        .filter((url: string) => typeof url === 'string' && url.trim().length > 0)
        .map((url: string) => saveBase64Image(url, data.category || property.category));

      if (cleanImages.length > 0) {
        await this.prisma.propertyImage.deleteMany({ where: { propertyId: id } });
        for (let idx = 0; idx < cleanImages.length; idx++) {
          await this.prisma.propertyImage.create({
            data: {
              propertyId: id,
              imageUrl: cleanImages[idx],
              isPrimary: idx === 0,
              displayOrder: idx
            }
          });
        }
      }
    }

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
      include: { images: { orderBy: { displayOrder: 'asc' } }, seller: true }
    });

    if (data.status && data.status.toUpperCase() === 'APPROVED') {
      await this.awardApprovalPointsIdempotent(id, user);
    }

    return { success: true, message: 'Property updated successfully', property: updated };
  }

  // 5b. Set Cover / Primary Image for a property
  async setCoverImage(propertyId: string, imageId: string, user?: any) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.type !== 'admin') {
      const isOwner = property.sellerId === user.sub || property.sellerId === user.id || (user.email && property.sellerEmail?.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) throw new ForbiddenException('Access denied');
    }

    // Set all images of this property to non-primary
    await this.prisma.propertyImage.updateMany({
      where: { propertyId },
      data: { isPrimary: false }
    });

    // Set target image to primary and top displayOrder
    await this.prisma.propertyImage.update({
      where: { id: imageId },
      data: { isPrimary: true, displayOrder: 0 }
    });

    return { success: true, message: 'Cover image updated successfully' };
  }

  // 5c. Delete a single image from a property
  async deleteImage(propertyId: string, imageId: string, user?: any) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.type !== 'admin') {
      const isOwner = property.sellerId === user.sub || property.sellerId === user.id || (user.email && property.sellerEmail?.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) throw new ForbiddenException('Access denied');
    }

    const imgToDelete = await this.prisma.propertyImage.findUnique({ where: { id: imageId } });
    if (!imgToDelete) throw new NotFoundException('Image not found');

    await this.prisma.propertyImage.delete({ where: { id: imageId } });

    // If deleted image was primary, set first remaining image as primary
    const remaining = await this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' }
    });

    if (remaining.length > 0 && !remaining.some(img => img.isPrimary)) {
      await this.prisma.propertyImage.update({
        where: { id: remaining[0].id },
        data: { isPrimary: true, displayOrder: 0 }
      });
    }

    return { success: true, message: 'Image deleted successfully' };
  }

  // 5d. Add more images to a property
  async addImages(propertyId: string, newImages: any[], user?: any) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.type !== 'admin') {
      const isOwner = property.sellerId === user.sub || property.sellerId === user.id || (user.email && property.sellerEmail?.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) throw new ForbiddenException('Access denied');
    }

    const cleanImages = (newImages || [])
      .map((img: any) => (typeof img === 'string' ? img : (img?.imageUrl || img?.url || '')))
      .filter((url: string) => typeof url === 'string' && url.trim().length > 0)
      .map((url: string) => saveBase64Image(url, property.category));

    const existingCount = await this.prisma.propertyImage.count({ where: { propertyId } });

    for (let idx = 0; idx < cleanImages.length; idx++) {
      await this.prisma.propertyImage.create({
        data: {
          propertyId,
          imageUrl: cleanImages[idx],
          isPrimary: existingCount === 0 && idx === 0,
          displayOrder: existingCount + idx
        }
      });
    }

    const updatedImages = await this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' }
    });

    return { success: true, message: 'Images added successfully', images: updatedImages };
  }

  // 6. Delete Property (Strict Ownership Check for non-admin)
  async delete(id: string, user?: any) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // If user is provided and is not admin/super_admin, enforce ownership
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.type !== 'admin') {
      const isOwner = property.sellerId === user.sub || 
                      property.sellerId === user.id || 
                      (user.email && property.sellerEmail?.toLowerCase() === user.email.toLowerCase());
      if (!isOwner) {
        throw new ForbiddenException('Access denied. You do not have permission to delete this property.');
      }
    }

    await this.prisma.property.delete({ where: { id } });
    return { success: true, message: 'Property deleted successfully' };
  }

  // 7. PUBLIC Endpoint for Website (Returns only APPROVED properties with Multi-criteria Filter Search)
  async findPublic(query: { 
    category?: string; 
    location?: string; 
    budget?: string; 
    minPrice?: string | number; 
    maxPrice?: string | number; 
    propertyType?: string;
    bhk?: string;
    facing?: string;
    furnishing?: string;
    constructionStatus?: string;
    planType?: string; 
    search?: string; 
    isSnap?: string;
  }) {
    const { category, location, budget, minPrice, maxPrice, propertyType, bhk, facing, furnishing, constructionStatus, planType, search, isSnap } = query;
    const where: any = {
      status: 'APPROVED' // Only approved properties published on Public Website
    };

    const andConditions: any[] = [];

    // 1. Dynamic location search (matches any city, locality, district, or area in database)
    const locQuery = (location || '').trim();
    if (locQuery && locQuery.toUpperCase() !== 'ALL') {
      const parts = locQuery.split(/[\s,]+/).map(p => p.trim()).filter(p => p.length > 1);
      if (parts.length > 1) {
        // Multi-word search (e.g. "Anna Nagar Chennai", "Fairlands Salem"): each word matches property location fields
        const wordConditions = parts.map(word => ({
          OR: [
            { location: { contains: word } },
            { city: { contains: word } },
            { title: { contains: word } },
            { description: { contains: word } }
          ]
        }));
        andConditions.push({ AND: wordConditions });
      } else {
        andConditions.push({
          OR: [
            { location: { contains: locQuery } },
            { city: { contains: locQuery } },
            { title: { contains: locQuery } },
            { description: { contains: locQuery } }
          ]
        });
      }
    }

    // 2. Category search
    const catQuery = (category || '').trim();
    if (catQuery && catQuery.toUpperCase() !== 'ALL' && catQuery.toLowerCase() !== 'all-residential') {
      const catTerms = normalizeCategoryTerms(catQuery);
      if (catTerms.length > 0) {
        andConditions.push({
          OR: catTerms.map(term => ({ category: { contains: term } }))
        });
      }
    }

    // 3. Property Type / Sub-Type Filter
    if (propertyType && propertyType !== 'ALL' && propertyType !== 'any') {
      const pt = propertyType.trim();
      andConditions.push({
        OR: [
          { categorySpecs: { contains: pt } },
          { category: { contains: pt } },
          { description: { contains: pt } },
          { title: { contains: pt } }
        ]
      });
    }

    // 4. BHK / Bedrooms Filter
    if (bhk && bhk !== 'ALL' && bhk !== 'any') {
      const cleanBhk = bhk.replace(/[^0-9]/g, '');
      const bhkOr: any[] = [
        { categorySpecs: { contains: bhk } },
        { title: { contains: bhk } },
        { description: { contains: bhk } }
      ];
      if (cleanBhk) {
        bhkOr.push({ categorySpecs: { contains: `${cleanBhk} BHK` } });
        bhkOr.push({ categorySpecs: { contains: `"beds":${cleanBhk}` } });
        bhkOr.push({ categorySpecs: { contains: `"beds":"${cleanBhk}"` } });
        bhkOr.push({ title: { contains: `${cleanBhk} BHK` } });
      }
      andConditions.push({ OR: bhkOr });
    }

    // 5. Facing Direction Filter
    if (facing && facing !== 'ALL' && facing !== 'any') {
      const fc = facing.trim();
      andConditions.push({
        OR: [
          { categorySpecs: { contains: fc } },
          { description: { contains: fc } },
          { title: { contains: fc } }
        ]
      });
    }

    // 6. Furnishing Status Filter
    if (furnishing && furnishing !== 'ALL' && furnishing !== 'any') {
      const fn = furnishing.trim();
      andConditions.push({
        OR: [
          { categorySpecs: { contains: fn } },
          { description: { contains: fn } }
        ]
      });
    }

    // 7. Possession / Construction Status Filter
    if (constructionStatus && constructionStatus !== 'ALL' && constructionStatus !== 'any') {
      const cs = constructionStatus.trim();
      andConditions.push({
        OR: [
          { categorySpecs: { contains: cs } },
          { description: { contains: cs } },
          { title: { contains: cs } }
        ]
      });
    }

    // 8. Budget / Price Range Search
    let minP = minPrice !== undefined && minPrice !== '' ? parseFloat(String(minPrice)) : undefined;
    let maxP = maxPrice !== undefined && maxPrice !== '' ? parseFloat(String(maxPrice)) : undefined;

    if (budget && budget !== 'any' && budget !== 'ALL') {
      const parsed = parseBudgetRange(budget);
      if (parsed.min !== undefined && minP === undefined) minP = parsed.min;
      if (parsed.max !== undefined && maxP === undefined) maxP = parsed.max;
    }

    if (minP !== undefined || maxP !== undefined) {
      const priceCond: any = {};
      if (minP !== undefined && !isNaN(minP)) priceCond.gte = minP;
      if (maxP !== undefined && !isNaN(maxP)) priceCond.lte = maxP;
      andConditions.push({ price: priceCond });
    }

    // 9. Plan Type Filter (Gold / Platinum)
    if (planType && planType !== 'ALL') {
      const cleanPlan = planType.toUpperCase().trim();
      andConditions.push({
        planType: cleanPlan.includes('GOLD') ? 'GOLD' : 'PLATINUM'
      });
    }

    // 10. Snap Property Source Rule
    if (isSnap === 'true') {
      andConditions.push({
        OR: [
          { seller: { role: { in: ['COMMON_PEOPLE', 'PARTNER'] } } },
          { sellerRole: { in: ['COMMON_PEOPLE', 'PARTNER'] } }
        ]
      });
    }

    // 11. Free text search
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { title: { contains: q } },
          { location: { contains: q } },
          { city: { contains: q } },
          { description: { contains: q } }
        ]
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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

        const rawImages = (p.images || []).map((img, idx) => ({
          id: img.id,
          propertyId: img.propertyId,
          imageUrl: img.imageUrl ? saveBase64Image(img.imageUrl, p.category) : getCategoryFallbackImage(p.category),
          isPrimary: img.isPrimary,
          displayOrder: img.displayOrder ?? idx
        }));

        if (rawImages.length === 0) {
          rawImages.push({
            id: `fallback-${p.id}`,
            propertyId: p.id,
            imageUrl: getCategoryFallbackImage(p.category),
            isPrimary: true,
            displayOrder: 0
          });
        }

        const coverObj = rawImages.find(i => i.isPrimary) || rawImages[0];
        const mainImage = coverObj.imageUrl;
        const galleryImages = [
          coverObj.imageUrl,
          ...rawImages.filter(i => i.id !== coverObj.id).map(i => i.imageUrl)
        ];

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
          imageUrl: mainImage,
          coverImage: mainImage,
          galleryImages: galleryImages,
          images: rawImages,
          totalImages: galleryImages.length,
          imageCount: galleryImages.length,
          specs,
          owner_contact: extractOwnerContact(p),
          ownerContact: extractOwnerContact(p),
          sellerName: extractOwnerContact(p).name,
          sellerPhone: extractOwnerContact(p).phone,
          sellerEmail: extractOwnerContact(p).email,
          status: p.status,
          createdAt: p.createdAt
        };
      })
    };
  }

  // Dynamic location list derived purely from live database property data
  async getDistinctLocations(query?: string) {
    const q = (query || '').trim().toLowerCase();

    // Fetch approved properties from database
    const properties = await this.prisma.property.findMany({
      where: {
        status: 'APPROVED'
      },
      select: {
        location: true,
        city: true
      },
      take: 500
    });

    const locationSet = new Set<string>();

    for (const p of properties) {
      if (p.city && p.city.trim() && p.city.toLowerCase() !== 'unknown') {
        locationSet.add(p.city.trim());
      }
      if (p.location && p.location.trim() && p.location.toLowerCase() !== 'unknown') {
        const fullLoc = p.location.trim();
        locationSet.add(fullLoc);

        // Also split by commas if location has multiple parts like "Fairlands, Salem" or "Anna Nagar, Chennai"
        const segments = fullLoc.split(',').map(s => s.trim()).filter(s => s.length > 1 && s.toLowerCase() !== 'unknown' && s.toLowerCase() !== 'india');
        for (const seg of segments) {
          locationSet.add(seg);
        }
      }
    }

    let list = Array.from(locationSet);
    if (q) {
      list = list.filter(item => item.toLowerCase().includes(q));
    }

    // Sort alphabetically
    list.sort((a, b) => a.localeCompare(b));

    return {
      success: true,
      count: list.length,
      locations: list.slice(0, 50)
    };
  }

  // 8. Properties submitted by logged-in Seller / Dealer (Strict User ID Filtering)
  async findMyProperties(sellerId: string) {
    if (!sellerId || !sellerId.trim()) {
      return {
        success: true,
        statistics: { total: 0, pending: 0, approved: 0, rejected: 0, hold: 0 },
        properties: []
      };
    }

    const properties = await this.prisma.property.findMany({
      where: { sellerId: sellerId.trim() },
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
      properties: properties.map(p => {
        const urls = p.images.map(img => saveBase64Image(img.imageUrl, p.category));
        if (urls.length === 0) urls.push(getCategoryFallbackImage(p.category));
        return {
          property_id: p.id,
          title: p.title,
          category: p.category,
          plan: p.planType,
          price: p.priceDisplay || `₹${p.price.toLocaleString('en-IN')}`,
          location: p.location,
          city: p.city,
          status: p.status,
          created_at: p.createdAt.toISOString(),
          image_urls: urls,
          imageUrl: urls[0],
          category_specs: (() => { try { return p.categorySpecs ? JSON.parse(p.categorySpecs) : {}; } catch { return {}; } })()
        };
      })
    };
  }

  // 9. Seller Properties by filter (sellerId, email, phone) - STRICT ISOLATION
  async findSellerProperties(filter: { sellerId?: string; email?: string; phone?: string; role?: string }) {
    const conditions: any[] = [];
    if (filter.sellerId && filter.sellerId.trim()) {
      conditions.push({ sellerId: filter.sellerId.trim() });
    }
    if (filter.email && filter.email.trim()) {
      conditions.push({ sellerEmail: filter.email.trim().toLowerCase() });
    }
    if (filter.phone && filter.phone.trim()) {
      conditions.push({ sellerPhone: filter.phone.trim() });
    }

    // STRICT USER ISOLATION: If no specific seller identifier is provided, return empty
    if (conditions.length === 0) {
      return {
        success: true,
        statistics: { total: 0, pending: 0, approved: 0, rejected: 0, hold: 0 },
        count: 0,
        properties: []
      };
    }

    const where: any = { OR: conditions };
    if (filter.role && filter.role.trim() && filter.role.toUpperCase() !== 'ALL') {
      const cleanRole = filter.role.trim().toUpperCase();
      if (cleanRole === 'COMMON_PEOPLE' || cleanRole === 'PARTNER') {
        where.sellerRole = { in: ['COMMON_PEOPLE', 'PARTNER'] };
      } else {
        where.sellerRole = cleanRole;
      }
    }

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

        const urls = p.images.map(img => saveBase64Image(img.imageUrl, p.category));
        if (urls.length === 0) urls.push(getCategoryFallbackImage(p.category));

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
          image_urls: urls,
          imageUrl: urls[0],
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

  // 10. Get Dealer Bookings (Strictly Filtered by email or dealerId)
  async findDealerBookings(dealerEmail?: string, dealerId?: string) {
    if ((!dealerEmail || !dealerEmail.trim()) && (!dealerId || !dealerId.trim())) {
      return { success: true, count: 0, bookings: [] };
    }

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
    where.bookerRole = 'DEALER';

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

  // 10b. Get Buyer Bookings / Requests (Strictly Filtered by email or buyerId)
  async findBuyerBookings(buyerEmail?: string, buyerId?: string) {
    if ((!buyerEmail || !buyerEmail.trim()) && (!buyerId || !buyerId.trim())) {
      return { success: true, count: 0, bookings: [] };
    }

    const where: any = {};
    if (buyerEmail && buyerEmail.trim()) {
      where.bookerEmail = buyerEmail.trim().toLowerCase();
    } else if (buyerId && buyerId.trim()) {
      where.bookerId = buyerId.trim();
    }
    where.bookerRole = 'BUYER';

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

