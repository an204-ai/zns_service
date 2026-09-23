const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Backward compatibility aliases
if (!prisma.fptOaConfig && prisma.fptAppConfig) {
  prisma.fptOaConfig = prisma.fptAppConfig;
}
if (!prisma.customerOaAssignment && prisma.customerAppAssignment) {
  prisma.customerOaAssignment = prisma.customerAppAssignment;
}

module.exports = { prisma };
