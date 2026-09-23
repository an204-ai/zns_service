const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: {},
    create: {
      email: 'admin',
      passwordHash,
      fullName: 'Quản trị viên',
      companyName: 'ZNS Reseller Platform',
      phone: '0900000000',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Create demo customer user
  const customerPasswordHash = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer' },
    update: {},
    create: {
      email: 'customer',
      passwordHash: customerPasswordHash,
      fullName: 'Khách hàng mẫu',
      companyName: 'Công ty Demo',
      phone: '0901112222',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Demo customer created: ${customer.email}`);
  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
