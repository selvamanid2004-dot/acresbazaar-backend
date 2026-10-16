const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database and fetching all tables...');
  
  // Get all table names in the database
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES;');
  console.log('Tables found:', tables);

  // We can query all Prisma models
  const models = [
    'Admin',
    'User',
    'Category',
    'Banner',
    'Property',
    'PropertyBooking',
    'PropertyImage',
    'Plan',
    'Reward',
    'Report',
    'VerifiedPartner',
    'WebsiteSetting',
    'Chat',
    'CalendarEvent',
    'UserActivity',
    'PartnerWallet',
    'PointsLedger',
    'PartnerBankDetail',
    'RewardClaim',
    'RewardSetting'
  ];

  const results = {};

  for (const model of models) {
    const delegate = prisma[model.charAt(0).toLowerCase() + model.slice(1)];
    if (delegate && typeof delegate.findMany === 'function') {
      try {
        const count = await delegate.count();
        const rows = await delegate.findMany();
        results[model] = {
          count,
          rows
        };
        console.log(`Model ${model}: ${count} rows`);
      } catch (err) {
        console.error(`Error querying ${model}:`, err.message);
        results[model] = { error: err.message };
      }
    } else {
      console.log(`Delegate not found for ${model}`);
    }
  }

  fs.writeFileSync('db_dump_summary.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Saved db_dump_summary.json successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
