const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Đang khởi tạo dữ liệu hệ thống (Chế độ Production/VPS)...');

  // Khởi tạo duy nhất tài khoản Quản trị viên tối cao (Admin)
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const adminPasswordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      status: 'ACTIVE',
      role: 'ADMIN',
    },
    create: {
      email: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'Quản trị viên',
      companyName: 'ZNS Reseller Platform',
      phone: '0900000000',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('🌱 Hoàn tất quá trình seed database!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi khởi tạo tài khoản Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
