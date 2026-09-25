const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('===============================================================');
  console.log('📦 ACRESBAZAAR DATABASE INSPECTION REPORT');
  console.log('===============================================================\n');

  console.log('Database Engine: SQLite (Local Embedded High-Performance Relational DB)');
  console.log('Database File:   backend/prisma/dev.db');
  console.log('ORM:             Prisma Client 5.x\n');

  // Count records in all models
  const [
    adminCount,
    userCount,
    propertyCount,
    bookingCount,
    rewardCount,
    partnerCount,
    categoryCount,
    planCount,
    reportCount,
    chatCount,
    calendarCount,
    settingCount
  ] = await Promise.all([
    prisma.admin.count(),
    prisma.user.count(),
    prisma.property.count(),
    prisma.propertyBooking.count(),
    prisma.reward.count(),
    prisma.verifiedPartner.count(),
    prisma.category.count(),
    prisma.plan.count(),
    prisma.report.count(),
    prisma.chat.count(),
    prisma.calendarEvent.count(),
    prisma.websiteSetting.count()
  ]);

  console.log('📊 DATABASE TABLES & RECORD COUNTS:');
  console.log('---------------------------------------------------------------');
  console.log(` 1. Admin              : ${adminCount} records`);
  console.log(` 2. User (Customers)   : ${userCount} records (Buyers, Sellers, Dealers, Spotters)`);
  console.log(` 3. Property           : ${propertyCount} records`);
  console.log(` 4. PropertyBooking    : ${bookingCount} records (Customer Inquiries & Deals)`);
  console.log(` 5. Reward             : ${rewardCount} records (Spotter bounties & Dealer points)`);
  console.log(` 6. VerifiedPartner    : ${partnerCount} records (Registered Agencies & Developers)`);
  console.log(` 7. Category           : ${categoryCount} records (Villa, Apartment, Commercial, Plot, etc.)`);
  console.log(` 8. Plan               : ${planCount} records (Membership Tiers: Standard, Gold, Platinum)`);
  console.log(` 9. Report             : ${reportCount} records`);
  console.log(`10. Chat               : ${chatCount} records`);
  console.log(`11. CalendarEvent      : ${calendarCount} records`);
  console.log(`12. WebsiteSetting     : ${settingCount} records\n`);

  // Sample User breakdown
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });
  console.log('👥 USER ROLES BREAKDOWN:');
  console.log('---------------------------------------------------------------');
  usersByRole.forEach(u => {
    console.log(`  • ${u.role.padEnd(15)} : ${u._count.id} users`);
  });

  // Sample Property breakdown
  const propsByStatus = await prisma.property.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('\n🏠 PROPERTY LISTINGS BREAKDOWN:');
  console.log('---------------------------------------------------------------');
  propsByStatus.forEach(p => {
    console.log(`  • ${p.status.padEnd(15)} : ${p._count.id} listings`);
  });

  // Sample recent properties
  const sampleProps = await prisma.property.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, category: true, priceDisplay: true, location: true, status: true }
  });
  console.log('\n🔍 RECENT PROPERTY RECORDS (SAMPLE):');
  console.log('---------------------------------------------------------------');
  sampleProps.forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.status}] ${p.title} (${p.category}) - ${p.priceDisplay} @ ${p.location}`);
  });

  // Sample Admin record
  const admin = await prisma.admin.findFirst({
    select: { email: true, name: true, role: true }
  });
  console.log('\n🛡️ SUPER ADMIN CREDENTIAL PROFILE:');
  console.log('---------------------------------------------------------------');
  console.log(`  • Email : ${admin?.email}`);
  console.log(`  • Name  : ${admin?.name}`);
  console.log(`  • Role  : ${admin?.role}\n`);

  console.log('===============================================================');
  await prisma.$disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
