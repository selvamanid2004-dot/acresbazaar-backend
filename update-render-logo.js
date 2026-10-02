const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const RENDER_DB_URL = 'postgresql://acresbazaar_db_user:s6e16cTq5sU2x10F1qf5qDkC5LhKqjQp@dpg-cvi7q8dumphs73fsqt00-a.oregon-postgres.render.com/acresbazaar_db?sslmode=require';

async function updateLogo() {
  console.log('Connecting to Render PostgreSQL database via pg...');
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Render PostgreSQL!');

    const logoBuf = fs.readFileSync(path.join(__dirname, 'uploads', 'logo-1790851863558.jpg'));
    const base64DataUrl = `data:image/jpeg;base64,${logoBuf.toString('base64')}`;
    const fileUploadUrl = `/uploads/logo-1790851863558.jpg`;

    console.log('Updating website_logo, logo_url, and logo_base64 in WebsiteSetting table...');

    await client.query(`
      INSERT INTO "WebsiteSetting" ("id", "key", "value", "group", "updatedAt")
      VALUES ($1, 'website_logo', $2, 'logo', NOW())
      ON CONFLICT ("key") DO UPDATE SET "value" = $2, "updatedAt" = NOW();
    `, [require('crypto').randomUUID(), fileUploadUrl]);

    await client.query(`
      INSERT INTO "WebsiteSetting" ("id", "key", "value", "group", "updatedAt")
      VALUES ($1, 'logo_url', $2, 'logo', NOW())
      ON CONFLICT ("key") DO UPDATE SET "value" = $2, "updatedAt" = NOW();
    `, [require('crypto').randomUUID(), fileUploadUrl]);

    await client.query(`
      INSERT INTO "WebsiteSetting" ("id", "key", "value", "group", "updatedAt")
      VALUES ($1, 'logo_base64', $2, 'logo', NOW())
      ON CONFLICT ("key") DO UPDATE SET "value" = $2, "updatedAt" = NOW();
    `, [require('crypto').randomUUID(), base64DataUrl]);

    console.log('✅ Successfully updated logo settings in Render DB!');

    const res = await client.query('SELECT count(*) FROM "Property";');
    console.log(`Total properties in Render DB: ${res.rows[0].count}`);

    const settingsRes = await client.query('SELECT key, value FROM "WebsiteSetting" WHERE "group" = \'logo\';');
    console.log('Logo settings in DB:', settingsRes.rows);
  } catch (err) {
    console.error('Error updating Render DB:', err);
  } finally {
    await client.end();
  }
}

updateLogo();
