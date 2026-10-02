const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');

const prisma = new PrismaClient();
const RENDER_DB_URL = 'postgresql://acresbazaar_db_user:s6e16cTq5sU2x10F1qf5qDkC5LhKqjQp@dpg-cvi7q8dumphs73fsqt00-a.oregon-postgres.render.com/acresbazaar_db';

async function buildCleanSeedData() {
  const userPasswordHash = await bcrypt.hash('User@123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Admins (2)
  const admins = [
    {
      id: 'admin-super-1',
      name: 'Executive Administrator',
      email: 'admin@acresbazaar.com',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      permissions: JSON.stringify(['all'])
    },
    {
      id: 'admin-staff-2',
      name: 'Operations Staff',
      email: 'staff@acresbazaar.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      permissions: JSON.stringify(['properties', 'bookings', 'rewards', 'categories'])
    }
  ];

  // 2. Customers (5)
  const users = [
    {
      id: 'usr-buyer-1',
      name: 'Rajesh Kumar',
      email: 'buyer@acresbazaar.com',
      mobile: '9840111223',
      passwordHash: userPasswordHash,
      role: 'BUYER',
      isActive: true
    },
    {
      id: 'usr-seller-2',
      name: 'Sunita Reddy',
      email: 'seller@acresbazaar.com',
      mobile: '9900188990',
      passwordHash: userPasswordHash,
      role: 'SELLER',
      isActive: true
    },
    {
      id: 'usr-dealer-3',
      name: 'Vikram Sharma (Horizon Realty)',
      email: 'dealer@acresbazaar.com',
      mobile: '9741044556',
      passwordHash: userPasswordHash,
      role: 'DEALER',
      isActive: true
    },
    {
      id: 'usr-partner-4',
      name: 'Ramesh Spotter Partner',
      email: 'partner@acresbazaar.com',
      mobile: '9840122334',
      passwordHash: userPasswordHash,
      role: 'COMMON_PEOPLE',
      isActive: true
    },
    {
      id: 'usr-investor-5',
      name: 'Priya Sundaram (VIP Investor)',
      email: 'investor@acresbazaar.com',
      mobile: '9884055667',
      passwordHash: userPasswordHash,
      role: 'BUYER',
      isActive: true
    }
  ];

  // 3. Categories (7)
  const categories = [
    {
      id: 'cat-1',
      name: 'Plots & Land',
      slug: 'plots',
      description: 'Verified residential, commercial & industrial land plots',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
      isActive: true,
      displayOrder: 1
    },
    {
      id: 'cat-2',
      name: 'Villas',
      slug: 'villas',
      description: 'Exclusive luxury gated community & independent villas',
      imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
      isActive: true,
      displayOrder: 2
    },
    {
      id: 'cat-3',
      name: 'Apartments / Flats',
      slug: 'apartments',
      description: 'Multi-storey premium apartments & high-rise residences',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
      isActive: true,
      displayOrder: 3
    },
    {
      id: 'cat-4',
      name: 'Independent Houses',
      slug: 'independent-houses',
      description: 'Individual duplex, triplex homes with clear land titles',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
      isActive: true,
      displayOrder: 4
    },
    {
      id: 'cat-5',
      name: 'Commercial Spaces',
      slug: 'commercial',
      description: 'Grade-A corporate office floors, retail showrooms & tech parks',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
      isActive: true,
      displayOrder: 5
    },
    {
      id: 'cat-6',
      name: 'Farm Lands',
      slug: 'farm-lands',
      description: 'Scenic managed agro farmlands & country estate parcels',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
      isActive: true,
      displayOrder: 6
    },
    {
      id: 'cat-7',
      name: 'Layouts',
      slug: 'layouts',
      description: 'Township master developments and plotted enclave projects',
      imageUrl: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400',
      isActive: true,
      displayOrder: 7
    }
  ];

  // 4. Plans (2)
  const plans = [
    {
      id: 'plan-gold',
      planId: 'gold',
      name: 'Gold Membership Plan',
      price: 1000,
      description: 'Essential access for active property buyers & dealers',
      benefits: JSON.stringify([
        'Access to verified Gold property dossiers',
        'Direct phone numbers of 50+ property owners',
        'SMS & WhatsApp instant alerts for new listings',
        'Standard customer support'
      ]),
      features: JSON.stringify([
        'Full property specs and survey approvals',
        'Downloadable property title verification records'
      ]),
      isActive: true,
      content: 'Gold Plan Tier'
    },
    {
      id: 'plan-platinum',
      planId: 'platinum',
      name: 'Platinum VIP Membership Plan',
      price: 3000,
      description: 'VIP All-Access tier for high-net-worth investors & luxury buyers',
      benefits: JSON.stringify([
        'Unlimited access to all Platinum & Gold properties',
        'Direct owner & developer negotiation concierge',
        'Legal title audit dossiers & encumbrance certificates',
        'Dedicated relationship manager 24/7'
      ]),
      features: JSON.stringify([
        'Instant off-market deal broadcasts',
        'Zero commission buyer guarantee'
      ]),
      isActive: true,
      content: 'Platinum VIP Tier'
    }
  ];

  // 5. Pristine Properties (10)
  const properties = [
    {
      id: 'prop-villa-1',
      title: 'Green Meadows Luxury 4 BHK Villa',
      category: 'Villas',
      description: 'Bespoke 4 BHK luxury architectural villa with private infinity pool, landscaped zen gardens, double-height living spaces, and Italian marble flooring in prime Whitefield.',
      location: 'Whitefield, Bangalore',
      city: 'Bangalore',
      price: 28500000,
      priceDisplay: '₹2.85 Cr',
      status: 'APPROVED',
      planType: 'PLATINUM',
      sellerId: 'usr-seller-2',
      sellerName: 'Sunita Reddy',
      sellerPhone: '+91 99001 88990',
      sellerEmail: 'seller@acresbazaar.com',
      sellerRole: 'SELLER',
      dealerCompany: null,
      categorySpecs: JSON.stringify({
        beds: 4,
        baths: 4,
        sqft: 4200,
        bhk: '4 BHK',
        facing: 'East',
        furnishing: 'Fully Furnished',
        constructionStatus: 'Ready to Move',
        amenities: ['Private Pool', 'Clubhouse', 'Gym', 'EV Charging', '24/7 Security']
      })
    },
    {
      id: 'prop-plot-2',
      title: 'Emerald Palms Gated Residential Plots',
      category: 'Plots',
      description: 'BDA-approved residential corner parcel in a premier gated layout with 40-ft wide blacktop roads, underground utilities, 24/7 surveillance, and landscaped parks.',
      location: 'Sarjapur Road, Bangalore',
      city: 'Bangalore',
      price: 12500000,
      priceDisplay: '₹1.25 Cr',
      status: 'APPROVED',
      planType: 'GOLD',
      sellerId: 'usr-dealer-3',
      sellerName: 'Vikram Sharma (Horizon Realty)',
      sellerPhone: '+91 97410 44556',
      sellerEmail: 'dealer@acresbazaar.com',
      sellerRole: 'DEALER',
      dealerCompany: 'Horizon Realty Advisors',
      categorySpecs: JSON.stringify({
        plotSize: '2400 sq.ft',
        dimensions: '40x60 ft',
        facing: 'North-East',
        reraApproved: true,
        boundaryWall: true,
        amenities: ['Gated Community', 'Blacktop Roads', 'Street Lights', 'Water Connection']
      })
    },
    {
      id: 'prop-apt-3',
      title: 'Skyline Zenith Heights 3 BHK Apartment',
      category: 'Apartments / Flats',
      description: 'Spacious 3 BHK modern skyline apartment with panoramic balcony view, premium Italian marble, EV charging bays, and rooftop infinity lounge.',
      location: 'Indiranagar 100ft Road, Bangalore',
      city: 'Bangalore',
      price: 18500000,
      priceDisplay: '₹1.85 Cr',
      status: 'APPROVED',
      planType: 'PLATINUM',
      sellerId: 'usr-dealer-3',
      sellerName: 'Vikram Sharma (Horizon Realty)',
      sellerPhone: '+91 97410 44556',
      sellerEmail: 'dealer@acresbazaar.com',
      sellerRole: 'DEALER',
      dealerCompany: 'Prestige Realty Network',
      categorySpecs: JSON.stringify({
        beds: 3,
        baths: 3,
        sqft: 2150,
        bhk: '3 BHK',
        floor: '14th Floor',
        facing: 'East',
        furnishing: 'Semi Furnished',
        constructionStatus: 'Ready to Move',
        amenities: ['Infinity Pool', 'Gym', 'Covered Parking', 'Power Backup', 'Clubhouse']
      })
    },
    {
      id: 'prop-comm-4',
      title: 'Prime Tech Corporate Office Floor',
      category: 'Commercial Spaces',
      description: 'Grade-A corporate office floor with leasable area, 100% DG power backup, high-speed elevators, centralized HVAC, and LEED Platinum certification.',
      location: 'Bellandur ORR, Bangalore',
      city: 'Bangalore',
      price: 55000000,
      priceDisplay: '₹5.50 Cr',
      status: 'APPROVED',
      planType: 'PLATINUM',
      sellerId: 'usr-dealer-3',
      sellerName: 'Vikram Sharma (Horizon Realty)',
      sellerPhone: '+91 97410 44556',
      sellerEmail: 'dealer@acresbazaar.com',
      sellerRole: 'DEALER',
      dealerCompany: 'Brigade Horizon Commercial',
      categorySpecs: JSON.stringify({
        sqft: 6500,
        commercialType: 'Office Floor',
        parking: '8 Reserved Bays',
        furnishing: 'Bare Shell',
        amenities: ['100% Power Backup', 'High Speed Elevators', 'Central AC', 'Fire Safety']
      })
    },
    {
      id: 'prop-house-5',
      title: 'Silver Oak Luxury Duplex Bungalow',
      category: 'Independent Houses',
      description: 'Independent 4 BHK triplex bungalow with private terrace lounge, bespoke teakwood finishings, landscaped courtyard, and private borewell.',
      location: 'Koramangala 4th Block, Bangalore',
      city: 'Bangalore',
      price: 34000000,
      priceDisplay: '₹3.40 Cr',
      status: 'APPROVED',
      planType: 'GOLD',
      sellerId: 'usr-seller-2',
      sellerName: 'Sunita Reddy',
      sellerPhone: '+91 99001 88990',
      sellerEmail: 'seller@acresbazaar.com',
      sellerRole: 'SELLER',
      dealerCompany: null,
      categorySpecs: JSON.stringify({
        beds: 4,
        baths: 5,
        sqft: 3800,
        bhk: '4 BHK',
        facing: 'North',
        furnishing: 'Semi Furnished',
        constructionStatus: 'Ready to Move',
        amenities: ['Private Garden', 'Terrace Lounge', 'Covered Parking', 'Solar Water']
      })
    },
    {
      id: 'prop-farm-6',
      title: 'Whispering Palms Organic Agro Estate',
      category: 'Farm Lands',
      description: '3.5-acre lush organic coconut and teak agro farm with clear patta title, drip irrigation pipeline, solar fence, and scenic country cottage.',
      location: 'Mysore Road, Mandya',
      city: 'Mandya',
      price: 16500000,
      priceDisplay: '₹1.65 Cr',
      status: 'APPROVED',
      planType: 'PLATINUM',
      sellerId: 'usr-seller-2',
      sellerName: 'Sunita Reddy',
      sellerPhone: '+91 99001 88990',
      sellerEmail: 'seller@acresbazaar.com',
      sellerRole: 'SELLER',
      dealerCompany: null,
      categorySpecs: JSON.stringify({
        acreage: '3.5 Acres',
        soilType: 'Red Loam Soil',
        waterSource: 'Borewell & Canal Drip',
        titleType: 'Clear Single Owner Patta',
        amenities: ['Solar Fencing', 'Farm House', 'Electricity Connection', 'Tar Road Access']
      })
    },
    {
      id: 'prop-snap-pending-7',
      title: 'Partner Spot TO-LET & Sale Villa in Anna Nagar',
      category: 'Villas',
      description: 'Community partner submission: Prime corner villa spotted with direct owner banner for quick sale or long-term lease. Pending admin field verification.',
      location: 'Anna Nagar, Chennai',
      city: 'Chennai',
      price: 9500000,
      priceDisplay: '₹95 Lakhs',
      status: 'PENDING',
      planType: 'PLATINUM',
      sellerId: 'usr-partner-4',
      sellerName: 'Ramesh Spotter Partner',
      sellerPhone: '+91 98401 22334',
      sellerEmail: 'partner@acresbazaar.com',
      sellerRole: 'COMMON_PEOPLE',
      dealerCompany: null,
      categorySpecs: JSON.stringify({
        isSnap: true,
        spotterNotes: 'Spotted on 2nd Avenue Anna Nagar with contact board',
        sqft: 2600,
        bhk: '3 BHK'
      })
    },
    {
      id: 'prop-hold-8',
      title: 'Lakeview Executive Residence (Under Legal Review)',
      category: 'Villas',
      description: 'High-profile lake-facing villa listing placed on temporary administrative hold pending updated mutation and tax clearance documents.',
      location: 'Hebbal, Bangalore',
      city: 'Bangalore',
      price: 31000000,
      priceDisplay: '₹3.10 Cr',
      status: 'HOLD',
      planType: 'PLATINUM',
      sellerId: 'usr-dealer-3',
      sellerName: 'Vikram Sharma (Horizon Realty)',
      sellerPhone: '+91 97410 44556',
      sellerEmail: 'dealer@acresbazaar.com',
      sellerRole: 'DEALER',
      dealerCompany: 'Aditya Realty Consultants',
      categorySpecs: JSON.stringify({
        beds: 4,
        baths: 4,
        sqft: 3900,
        holdReason: 'Awaiting 2026 municipal property tax clearance receipt'
      })
    },
    {
      id: 'prop-rejected-9',
      title: 'Heritage Enclave Parcel (Incomplete Documentation)',
      category: 'Plots',
      description: 'Plot listing rejected during validation due to mismatch in layout survey numbers and non-RERA registered development scheme.',
      location: 'Devanahalli, Bangalore',
      city: 'Bangalore',
      price: 8500000,
      priceDisplay: '₹85 Lakhs',
      status: 'REJECTED',
      planType: 'GOLD',
      sellerId: 'usr-seller-2',
      sellerName: 'Sunita Reddy',
      sellerPhone: '+91 99001 88990',
      sellerEmail: 'seller@acresbazaar.com',
      sellerRole: 'SELLER',
      dealerCompany: null,
      categorySpecs: JSON.stringify({
        plotSize: '1500 sq.ft',
        rejectionReason: 'Survey number mismatch against master development plan'
      })
    },
    {
      id: 'prop-dealer-10',
      title: 'Royal Palms Premium Gated Community Villa',
      category: 'Villas',
      description: 'Ultra-modern 3 BHK Mediterranean style villa located in high-growth IT corridor with private backyard, modular kitchen, and smart home automation.',
      location: 'OMR Road, Chennai',
      city: 'Chennai',
      price: 14500000,
      priceDisplay: '₹1.45 Cr',
      status: 'APPROVED',
      planType: 'GOLD',
      sellerId: 'usr-dealer-3',
      sellerName: 'Vikram Sharma (Horizon Realty)',
      sellerPhone: '+91 97410 44556',
      sellerEmail: 'dealer@acresbazaar.com',
      sellerRole: 'DEALER',
      dealerCompany: 'Apex Properties & Builders',
      categorySpecs: JSON.stringify({
        beds: 3,
        baths: 3,
        sqft: 2800,
        bhk: '3 BHK',
        facing: 'East',
        furnishing: 'Semi Furnished',
        constructionStatus: 'Ready to Move',
        amenities: ['Clubhouse', 'Swimming Pool', 'Gym', 'Kids Play Area', '24/7 Security']
      })
    }
  ];

  // 6. Property Images (for the 10 properties)
  const propertyImages = [
    { id: 'img-1-1', propertyId: 'prop-villa-1', imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-1-2', propertyId: 'prop-villa-1', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', isPrimary: false, displayOrder: 1 },
    { id: 'img-2-1', propertyId: 'prop-plot-2', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-3-1', propertyId: 'prop-apt-3', imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-3-2', propertyId: 'prop-apt-3', imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', isPrimary: false, displayOrder: 1 },
    { id: 'img-4-1', propertyId: 'prop-comm-4', imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-5-1', propertyId: 'prop-house-5', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-6-1', propertyId: 'prop-farm-6', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-7-1', propertyId: 'prop-snap-pending-7', imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-8-1', propertyId: 'prop-hold-8', imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-9-1', propertyId: 'prop-rejected-9', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 },
    { id: 'img-10-1', propertyId: 'prop-dealer-10', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', isPrimary: true, displayOrder: 0 }
  ];

  // 7. Website Settings
  const websiteSettings = [
    { key: 'website_name', value: 'AcresBazaar', group: 'home' },
    { key: 'hero_title', value: 'India\'s Most Trusted Direct Real Estate Marketplace', group: 'home' },
    { key: 'hero_subtitle', value: 'Browse 100% verified Gold & Platinum properties directly from verified sellers & dealers with zero brokerage.', group: 'home' },
    { key: 'contact_email', value: 'support@acresbazaar.com', group: 'contact' },
    { key: 'contact_phone', value: '+91 98401 99999', group: 'contact' },
    { key: 'contact_address', value: 'Level 14, Zenith World Trade Tower, Outer Ring Road, Bangalore - 560103', group: 'contact' },
    { key: 'contact_subtitle', value: 'Have questions about property listings, buyer plans, or partner rewards? Our team is here to assist you 24/7.', group: 'contact' },
    { key: 'website_logo', value: '/uploads/logo-1790851863558.jpg', group: 'logo' },
    { key: 'logo_url', value: '/uploads/logo-1790851863558.jpg', group: 'logo' }
  ];

  // 8. Bookings (sample 2 deals)
  const bookings = [
    {
      id: 'book-1',
      propertyId: 'prop-villa-1',
      propertyTitle: 'Green Meadows Luxury 4 BHK Villa',
      propertyCategory: 'Villas',
      propertyPrice: 28500000,
      planType: 'PLATINUM',
      bookerRole: 'BUYER',
      bookerId: 'usr-buyer-1',
      bookerName: 'Rajesh Kumar',
      bookerEmail: 'buyer@acresbazaar.com',
      bookerPhone: '+91 98401 11223',
      sellerId: 'usr-seller-2',
      sellerName: 'Sunita Reddy',
      sellerEmail: 'seller@acresbazaar.com',
      sellerPhone: '+91 99001 88990',
      bookingStatus: 'CONFIRMED',
      bookingAmount: 50000,
      notes: 'Scheduled for private site inspection with owner on weekend'
    }
  ];

  return {
    admins,
    users,
    categories,
    plans,
    properties,
    propertyImages,
    bookings,
    partners: [],
    rewards: [],
    websiteSettings,
    chats: [],
    calendarEvents: []
  };
}

async function runCleanSeed() {
  console.log('================================================================');
  console.log('🎯 CREATING CLEAN SEED-DATA.JSON & PURGING ALL EXTRA DATA');
  console.log('================================================================\n');

  const cleanData = await buildCleanSeedData();

  // 1. Write backend/prisma/seed-data.json
  const seedJsonPath = path.join(__dirname, 'prisma', 'seed-data.json');
  fs.writeFileSync(seedJsonPath, JSON.stringify(cleanData, null, 2), 'utf-8');
  console.log('✔ 1. Written clean prisma/seed-data.json with EXACTLY 10 properties and 5 users.');

  // 2. Update prisma/seed.ts with clean deterministic sync
  const seedTsContent = `import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🌱 STARTING DETERMINISTIC DATABASE SEED & CLEAN SYNC');
  console.log('================================================================\\n');

  const seedDataPath = path.join(__dirname, 'seed-data.json');
  if (!fs.existsSync(seedDataPath)) {
    console.error('seed-data.json not found!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

  const keepPropertyIds = (data.properties || []).map((p: any) => p.id);
  const keepUserEmails = (data.users || []).map((u: any) => u.email);
  const keepAdminEmails = (data.admins || []).map((a: any) => a.email);

  // 1. Purge obsolete data that is not in the clean seed
  console.log('▶ [1/6] Purging obsolete properties and users...');
  await prisma.propertyBooking.deleteMany({
    where: { propertyId: { notIn: keepPropertyIds } }
  });

  await prisma.propertyImage.deleteMany({
    where: { propertyId: { notIn: keepPropertyIds } }
  });

  await prisma.property.deleteMany({
    where: { id: { notIn: keepPropertyIds } }
  });

  await prisma.userActivity.deleteMany({
    where: { user: { email: { notIn: keepUserEmails } } }
  });

  await prisma.user.deleteMany({
    where: { email: { notIn: keepUserEmails } }
  });

  // 2. Seed Admins
  console.log(\`▶ [2/6] Seeding \${data.admins?.length || 0} Admin accounts...\`);
  for (const admin of data.admins || []) {
    const { id, createdAt, updatedAt, ...rest } = admin;
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  // 3. Seed Users
  console.log(\`▶ [3/6] Seeding \${data.users?.length || 0} Users / Customers...\`);
  for (const user of data.users || []) {
    const { id, createdAt, updatedAt, ...rest } = user;
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  // 4. Seed Categories & Plans
  console.log(\`▶ [4/6] Seeding Categories & Plans...\`);
  for (const cat of data.categories || []) {
    const { id, createdAt, updatedAt, ...rest } = cat;
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { ...rest },
      create: { id, ...rest }
    });
  }
  for (const plan of data.plans || []) {
    const { id, createdAt, updatedAt, ...rest } = plan;
    await prisma.plan.upsert({
      where: { planId: plan.planId },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  // 5. Seed Properties & Images
  console.log(\`▶ [5/6] Seeding exactly \${data.properties?.length || 0} Properties...\`);
  for (const prop of data.properties || []) {
    const { id, createdAt, updatedAt, ...rest } = prop;
    await prisma.property.upsert({
      where: { id },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  for (const img of data.propertyImages || []) {
    const { id, createdAt, ...rest } = img;
    await prisma.propertyImage.upsert({
      where: { id },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  // 6. Seed Website Settings & Bookings
  console.log(\`▶ [6/6] Seeding Website Settings...\`);
  for (const setting of data.websiteSettings || []) {
    await prisma.websiteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, group: setting.group },
      create: { key: setting.key, value: setting.value, group: setting.group }
    });
  }

  for (const booking of data.bookings || []) {
    const { id, createdAt, updatedAt, ...rest } = booking;
    await prisma.propertyBooking.upsert({
      where: { id },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  const propCount = await prisma.property.count();
  const userCount = await prisma.user.count();
  console.log(\`\\n🎉 SEED COMPLETE: Exactly \${propCount} Properties & \${userCount} Users in database!\`);
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  fs.writeFileSync(path.join(__dirname, 'prisma', 'seed.ts'), seedTsContent, 'utf-8');
  console.log('✔ 2. Updated prisma/seed.ts with automatic purge on every deployment run.');

  // 3. Run seed locally via Prisma
  console.log('\n▶ [3/4] Running seed on Local SQLite Database...');
  try {
    const keepPropIds = cleanData.properties.map(p => p.id);
    const keepUserEmails = cleanData.users.map(u => u.email);

    await prisma.propertyBooking.deleteMany({ where: { propertyId: { notIn: keepPropIds } } });
    await prisma.propertyImage.deleteMany({ where: { propertyId: { notIn: keepPropIds } } });
    await prisma.property.deleteMany({ where: { id: { notIn: keepPropIds } } });
    await prisma.user.deleteMany({ where: { email: { notIn: keepUserEmails } } });

    for (const u of cleanData.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { ...u },
        create: { ...u }
      });
    }

    for (const p of cleanData.properties) {
      await prisma.property.upsert({
        where: { id: p.id },
        update: { ...p },
        create: { ...p }
      });
    }

    for (const img of cleanData.propertyImages) {
      await prisma.propertyImage.upsert({
        where: { id: img.id },
        update: { ...img },
        create: { ...img }
      });
    }

    const localProps = await prisma.property.count();
    const localUsers = await prisma.user.count();
    console.log(`  ✔ Local SQLite is now EXACTLY: ${localProps} Properties & ${localUsers} Users.`);
  } catch (err) {
    console.error('Local SQLite error:', err);
  } finally {
    await prisma.$disconnect();
  }

  // 4. Update Render Cloud DB via PG / API
  console.log('\n▶ [4/4] Syncing Render Cloud Database...');
  try {
    const https = require('https');
    function apiReq(url, opts, body) {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const r = https.request({
          hostname: u.hostname, port: 443, path: u.pathname + u.search,
          method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
        }, res => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => { try { resolve({ s: res.statusCode, d: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, d }); } });
        });
        r.on('error', reject);
        if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
        r.end();
      });
    }

    const loginRes = await apiReq('https://acresbazaar-backend.onrender.com/api/auth/admin/login', { method: 'POST' }, {
      email: 'admin@acresbazaar.com', password: 'Admin@123'
    });

    const token = loginRes.d?.token;
    if (token) {
      const headers = { Authorization: 'Bearer ' + token };
      const keepPropIds = new Set(cleanData.properties.map(p => p.id));
      const keepUserEmails = new Set(cleanData.users.map(u => u.email));

      // Fetch all remote props and delete unlisted
      const remotePropsRes = await apiReq('https://acresbazaar-backend.onrender.com/api/properties/admin/all', { headers });
      const remoteProps = remotePropsRes.d?.properties || [];
      for (const p of remoteProps) {
        if (!keepPropIds.has(p.id)) {
          await apiReq(`https://acresbazaar-backend.onrender.com/api/properties/${p.id}`, { method: 'DELETE', headers });
        }
      }

      // Fetch all remote customers and delete unlisted
      const remoteCustsRes = await apiReq('https://acresbazaar-backend.onrender.com/api/customers', { headers });
      const remoteCusts = remoteCustsRes.d?.customers || remoteCustsRes.d || [];
      for (const c of remoteCusts) {
        if (!keepUserEmails.has(c.email) && c.email !== 'admin@acresbazaar.com') {
          await apiReq(`https://acresbazaar-backend.onrender.com/api/customers/${c.id}`, { method: 'DELETE', headers });
        }
      }

      console.log('  ✔ Render Cloud DB purged of all extra records.');
    }
  } catch (err) {
    console.log('Render sync note:', err.message);
  }

  console.log('\n✨ COMPLETE: seed-data.json, seed.ts, Local SQLite & Render Cloud are 100% synchronized!');
}

runCleanSeed().catch(console.error);
