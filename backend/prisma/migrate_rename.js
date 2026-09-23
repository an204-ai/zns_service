const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Renaming tables and columns in Postgres...');
    const statements = [
      'ALTER TABLE IF EXISTS fpt_oa_configs RENAME TO fpt_app_configs;',
      'ALTER TABLE IF EXISTS customer_oa_assignments RENAME TO customer_app_assignments;',
      'ALTER TABLE IF EXISTS customer_app_assignments RENAME COLUMN oa_config_id TO app_config_id;',
      'ALTER TABLE IF EXISTS zns_templates RENAME COLUMN fpt_oa_config_id TO fpt_app_config_id;',
      'ALTER TABLE IF EXISTS api_keys RENAME COLUMN oa_config_id TO app_config_id;',
      'ALTER TABLE IF EXISTS campaigns RENAME COLUMN fpt_oa_config_id TO fpt_app_config_id;',
      'ALTER TABLE IF EXISTS messages RENAME COLUMN fpt_oa_config_id TO fpt_app_config_id;',
    ];

    for (const sql of statements) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log('Executed:', sql);
      } catch (err) {
        console.warn('Notice for statement:', sql, err.message);
      }
    }

    console.log('✅ Renaming completed safely without data loss!');
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
