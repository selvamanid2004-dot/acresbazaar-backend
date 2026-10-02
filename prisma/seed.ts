import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🌱 STARTING DETERMINISTIC DATABASE SEED & CLEAN SYNC');
  console.log('================================================================\n');

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
  console.log(`▶ [2/6] Seeding ${data.admins?.length || 0} Admin accounts...`);
  for (const admin of data.admins || []) {
    const { id, createdAt, updatedAt, ...rest } = admin;
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: { ...rest },
      create: { id, ...rest }
    });
  }

  // 3. Seed Users
  console.log(`▶ [3/6] Seeding ${data.users?.length || 0} Users / Customers...`);
  const userMap = new Map<string, string>();
  for (const user of data.users || []) {
    const { id, createdAt, updatedAt, ...rest } = user;
    const dbUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { ...rest },
      create: { id, ...rest }
    });
    userMap.set(user.id, dbUser.id);
    userMap.set(user.email, dbUser.id);
  }

  // 4. Seed Categories & Plans
  console.log(`▶ [4/6] Seeding Categories & Plans...`);
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
  console.log(`▶ [5/6] Seeding exactly ${data.properties?.length || 0} Properties...`);
  const defaultUserId = userMap.get('seller@acresbazaar.com') || (userMap.size > 0 ? Array.from(userMap.values())[0] : undefined);
  for (const prop of data.properties || []) {
    const { id, createdAt, updatedAt, sellerId, userId, ...rest } = prop;
    let resolvedUserId = sellerId || userId;
    if (resolvedUserId && userMap.has(resolvedUserId)) {
      resolvedUserId = userMap.get(resolvedUserId);
    } else if (defaultUserId) {
      resolvedUserId = defaultUserId;
    }

    await prisma.property.upsert({
      where: { id },
      update: {
        ...rest,
        seller: resolvedUserId ? { connect: { id: resolvedUserId } } : undefined
      },
      create: {
        id,
        ...rest,
        seller: resolvedUserId ? { connect: { id: resolvedUserId } } : undefined
      }
    });
  }

  for (const img of data.propertyImages || []) {
    const { id, createdAt, propertyId, ...rest } = img;
    await prisma.propertyImage.upsert({
      where: { id },
      update: {
        ...rest,
        property: { connect: { id: propertyId } }
      },
      create: {
        id,
        ...rest,
        property: { connect: { id: propertyId } }
      }
    });
  }

  // 6. Seed Website Settings & Bookings
  console.log(`▶ [6/6] Seeding Website Settings...`);
  for (const setting of data.websiteSettings || []) {
    await prisma.websiteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, group: setting.group },
      create: { key: setting.key, value: setting.value, group: setting.group }
    });
  }

  for (const booking of data.bookings || []) {
    const { id, createdAt, updatedAt, propertyId, ...rest } = booking;
    await prisma.propertyBooking.upsert({
      where: { id },
      update: {
        ...rest,
        property: propertyId ? { connect: { id: propertyId } } : undefined
      },
      create: {
        id,
        ...rest,
        property: propertyId ? { connect: { id: propertyId } } : undefined
      }
    });
  }

  const propCount = await prisma.property.count();
  const userCount = await prisma.user.count();
  console.log(`\n🎉 SEED COMPLETE: Exactly ${propCount} Properties & ${userCount} Users in database!`);
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
