const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Starting Render Cloud Build Process ===');

// 1. If deploying to cloud (PostgreSQL), configure PostgreSQL schema
const pgSchemaPath = path.join(__dirname, 'prisma', 'schema.postgresql.prisma');
const targetSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

if (fs.existsSync(pgSchemaPath)) {
  console.log('1. Configuring PostgreSQL schema for Render deployment...');
  fs.copyFileSync(pgSchemaPath, targetSchemaPath);
}

// Helper to run commands
function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 2. Generate Prisma client
console.log('2. Generating Prisma Client for PostgreSQL...');
run('npx prisma generate');

// 3. Push schema to Cloud database safely if configured
if (process.env.DATABASE_URL && process.env.AUTO_SYNC_SCHEMA === 'true') {
  console.log('3. Syncing database schema with Cloud DB (safe mode)...');
  try {
    run('npx prisma db push');
  } catch (err) {
    console.warn('Notice: Prisma db push encountered warning/skip:', err.message);
  }
}

if (process.env.RUN_SEED === 'true') {
  console.log('4. Running initial database seed (RUN_SEED=true)...');
  try {
    run('npx ts-node prisma/seed.ts');
  } catch (err) {
    console.warn('Notice: Seed step:', err.message);
  }
}

// 4. Build NestJS application
console.log('5. Compiling NestJS production bundle...');
run('npx tsc -p tsconfig.build.json');

console.log('=== Render Build Completed Successfully ===');
