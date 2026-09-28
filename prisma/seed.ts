import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🌱 STARTING COMPLETE DATABASE SEEDING & SYNC');
  console.log('================================================================\n');

  const seedDataPath = path.join(__dirname, 'seed-data.json');

  if (fs.existsSync(seedDataPath)) {
    console.log('📦 Loading full dataset from seed-data.json...');
    const data = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

    // 1. Seed Admins
    console.log(`▶ Seeding ${data.admins?.length || 0} Admin accounts...`);
    for (const admin of data.admins || []) {
      const { id, createdAt, updatedAt, ...rest } = admin;
      await prisma.admin.upsert({
        where: { email: admin.email },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 2. Seed Users
    console.log(`▶ Seeding ${data.users?.length || 0} Users / Customers...`);
    for (const user of data.users || []) {
      const { id, createdAt, updatedAt, ...rest } = user;
      await prisma.user.upsert({
        where: { email: user.email },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 3. Seed Categories
    console.log(`▶ Seeding ${data.categories?.length || 0} Categories...`);
    for (const cat of data.categories || []) {
      const { id, createdAt, updatedAt, ...rest } = cat;
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 4. Seed Plans
    console.log(`▶ Seeding ${data.plans?.length || 0} Plans...`);
    for (const plan of data.plans || []) {
      const { id, createdAt, updatedAt, ...rest } = plan;
      await prisma.plan.upsert({
        where: { planId: plan.planId },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 5. Seed Properties
    console.log(`▶ Seeding ${data.properties?.length || 0} Properties...`);
    for (const prop of data.properties || []) {
      const { id, createdAt, updatedAt, ...rest } = prop;
      // Ensure seller exists or disconnect if not found
      let sellerConnectId = rest.sellerId;
      if (sellerConnectId) {
        const userExists = await prisma.user.findUnique({ where: { id: sellerConnectId } });
        if (!userExists) {
          sellerConnectId = null;
        }
      }

      await prisma.property.upsert({
        where: { id },
        update: {
          ...rest,
          sellerId: sellerConnectId
        },
        create: {
          id,
          ...rest,
          sellerId: sellerConnectId
        }
      });
    }

    // 6. Seed Property Images
    console.log(`▶ Seeding ${data.propertyImages?.length || 0} Property Images...`);
    for (const img of data.propertyImages || []) {
      const { id, createdAt, ...rest } = img;
      const propExists = await prisma.property.findUnique({ where: { id: rest.propertyId } });
      if (propExists) {
        await prisma.propertyImage.upsert({
          where: { id },
          update: { ...rest },
          create: { id, ...rest }
        });
      }
    }

    // 7. Seed Bookings
    console.log(`▶ Seeding ${data.bookings?.length || 0} Property Bookings...`);
    for (const booking of data.bookings || []) {
      const { id, createdAt, updatedAt, ...rest } = booking;
      const propExists = await prisma.property.findUnique({ where: { id: rest.propertyId } });
      if (propExists) {
        await prisma.propertyBooking.upsert({
          where: { id },
          update: { ...rest },
          create: { id, ...rest }
        });
      }
    }

    // 8. Seed Verified Partners
    console.log(`▶ Seeding ${data.partners?.length || 0} Verified Partners...`);
    for (const partner of data.partners || []) {
      const { id, createdAt, updatedAt, ...rest } = partner;
      await prisma.verifiedPartner.upsert({
        where: { id },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 9. Seed Rewards
    console.log(`▶ Seeding ${data.rewards?.length || 0} Rewards...`);
    for (const reward of data.rewards || []) {
      const { id, createdAt, updatedAt, ...rest } = reward;
      await prisma.reward.upsert({
        where: { id },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 10. Seed Website Settings
    console.log(`▶ Seeding ${data.websiteSettings?.length || 0} Website Settings...`);
    for (const setting of data.websiteSettings || []) {
      const { id, createdAt, updatedAt, ...rest } = setting;
      await prisma.websiteSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, group: setting.group },
        create: { key: setting.key, value: setting.value, group: setting.group }
      });
    }

    // 11. Seed Chats
    console.log(`▶ Seeding ${data.chats?.length || 0} Chats...`);
    for (const chat of data.chats || []) {
      const { id, createdAt, updatedAt, ...rest } = chat;
      await prisma.chat.upsert({
        where: { id },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    // 12. Seed Calendar Events
    console.log(`▶ Seeding ${data.calendarEvents?.length || 0} Calendar Events...`);
    for (const event of data.calendarEvents || []) {
      const { id, createdAt, updatedAt, ...rest } = event;
      await prisma.calendarEvent.upsert({
        where: { id },
        update: { ...rest },
        create: { id, ...rest }
      });
    }

    console.log('\n✅ ALL DATABASE RECORDS SEEDED SUCCESSFULLY FROM BACKUP!');
  } else {
    console.log('⚠️ No seed-data.json found. Running minimal default fallback seed...');

    // Minimal Admin seed
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);
    await prisma.admin.upsert({
      where: { email: 'admin@acresbazaar.com' },
      update: { passwordHash },
      create: {
        email: 'admin@acresbazaar.com',
        passwordHash,
        name: 'Executive Administrator',
        role: 'SUPER_ADMIN'
      }
    });
  }
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
