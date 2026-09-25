import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Clean Database Seeding ---');

  // 1. Seed Admin Account
  const adminEmails = ['admin@acresbazaar.com', 'admin@auraestate.com'];
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);
  for (const email of adminEmails) {
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (!existingAdmin) {
      await prisma.admin.create({
        data: {
          email,
          passwordHash,
          name: 'Executive Administrator',
          role: 'SUPER_ADMIN'
        }
      });
      console.log(`✓ Admin account seeded: ${email} / Admin@123`);
    } else {
      await prisma.admin.update({
        where: { email },
        data: { passwordHash }
      });
      console.log(`• Admin account refreshed: ${email}`);
    }
  }

  // 2. Seed Default Categories
  const categories = [
    {
      name: 'All Residential',
      slug: 'all-residential',
      description: 'Luxury homes, villas, residential apartments, and premium townhouses.',
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      displayOrder: 1
    },
    {
      name: 'Plot / Land',
      slug: 'plots-land',
      description: 'Exclusive gated layouts, approved residential plots, and corner parcels.',
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
      displayOrder: 2
    },
    {
      name: 'Villas',
      slug: 'villas',
      description: 'Private estate residences, architectural villas, and luxury compounds.',
      imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      displayOrder: 3
    },
    {
      name: 'Apartments',
      slug: 'apartments',
      description: 'High-rise sky residences, duplex penthouses, and gated urban suites.',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      displayOrder: 4
    },
    {
      name: 'Independent Houses',
      slug: 'independent-houses',
      description: 'Custom standalone bungalows, row villas, and independent heritage homes.',
      imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80',
      displayOrder: 5
    },
    {
      name: 'Commercial Spaces',
      slug: 'commercial-spaces',
      description: 'Grade-A corporate towers, retail frontage, tech parks, and commercial plots.',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      displayOrder: 6
    },
    {
      name: 'Farm Lands',
      slug: 'farm-lands',
      description: 'Agricultural estates, organic orchards, managed farmlands, and country retreats.',
      imageUrl: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80',
      displayOrder: 7
    }
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✓ Category seeded: ${cat.name}`);
    }
  }

  // 3. Seed Plans (Gold & Platinum ONLY)
  const plans = [
    {
      planId: 'gold',
      name: 'Gold Scout Plan',
      price: 4999,
      description: 'Essential tier with verified listings and direct owner contact information.',
      benefits: JSON.stringify([
        'Access to Verified Gold Listings',
        'Direct Owner / Dealer Mobile Numbers',
        'Standard Legal Document Verification Status',
        'Email Alerts for New Matches'
      ]),
      features: JSON.stringify([
        'Up to 25 Property Contact Unlocks',
        'Dedicated Property Scout Support',
        '30-Day Validity with Rollover Options'
      ]),
      content: 'Unlock prime residential homes and plots with verified titles and direct contact access.'
    },
    {
      planId: 'platinum',
      name: 'Platinum Executive Plan',
      price: 14999,
      description: 'Ultra-exclusive tier for off-market, luxury villas, and vetted developer plots.',
      benefits: JSON.stringify([
        'Full Unrestricted Access to all Platinum Listings',
        'Zero Hidden Addresses or Blocked Pricing',
        'Comprehensive Title Verification & RERA Dossier',
        'Priority Site Visits with Personal Relationship Manager',
        'Executive Legal Opinion & Escrow Advisory'
      ]),
      features: JSON.stringify([
        'Unlimited Property Unlocks',
        'Personal Real Estate Concierge',
        'Priority Off-Market Pre-Launch Invitations',
        '90-Day Full Executive Coverage'
      ]),
      content: 'The definitive luxury real estate membership for ultra-high-net-worth buyers and investors.'
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({ where: { planId: plan.planId } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
      console.log(`✓ Plan seeded: ${plan.name}`);
    }
  }

  // 4. Seed Default Website Settings
  const settings = [
    { key: 'website_logo', value: '', group: 'logo' },
    { key: 'website_name', value: 'AcresBazaar | Luxury Real Estate & Prime Properties', group: 'home' },
    { key: 'hero_headline', value: 'Discover Architectural Masterpieces & Prime Land Parcels', group: 'home' },
    { key: 'hero_subheading', value: 'Curated portfolio of prime plots, designer villas, and high-yield commercial assets.', group: 'home' },
    { key: 'about_headline', value: 'Setting the Benchmark in High-Value Real Estate', group: 'about' },
    { key: 'about_story', value: 'AcresBazaar connects discerning buyers, developers, and accredited sellers with verified title certainty.', group: 'about' },
    { key: 'service_overview', value: 'End-to-end real estate brokerage, property title verification, legal diligence, and private sales.', group: 'service' },
    { key: 'contact_email', value: 'concierge@acresbazaar.com', group: 'contact' },
    { key: 'contact_phone', value: '+91 98450 00000', group: 'contact' },
    { key: 'contact_address', value: 'Executive Tower 4, Central Business District, Bengaluru, KA 560001', group: 'contact' }
  ];

  for (const s of settings) {
    await prisma.websiteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, group: s.group },
      create: s
    });
  }

  console.log('✓ Clean Seeding Completed Successfully!');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
