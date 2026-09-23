const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Xóa toàn bộ tài khoản khác, chỉ giữ lại duy nhất tài khoản admin
  await prisma.user.deleteMany({
    where: {
      email: { not: 'admin' },
    },
  });

  // Khởi tạo hoặc cập nhật duy nhất 1 tài khoản admin
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: {
      passwordHash,
      status: 'ACTIVE',
      role: 'ADMIN',
    },
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

  console.log(`✅ Duy nhất 1 tài khoản Admin: ${admin.email}`);
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
