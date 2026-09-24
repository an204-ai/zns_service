const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const appConfigService = require('./appConfigService');

/**
 * Create a new customer with optional App config
 */
async function createCustomer({ email, password, fullName, companyName, phone, appType, systemAppId, appName, fptAppId, fptSecretKey }) {
  const passwordHash = await bcrypt.hash(password, 12);

  const customer = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      companyName,
      phone,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      companyName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  let appConfig = null;
  let appError = null;

  const targetType = appType;
  const targetSystemId = systemAppId;
  const targetAppName = appName?.trim() || fullName || 'Ứng dụng Khách hàng';

  // 1. Gán App Hệ thống nếu chọn dùng App Hệ thống
  if (targetType === 'SYSTEM' && targetSystemId) {
    try {
      await appConfigService.assignAppToCustomer({ userId: customer.id, appConfigId: targetSystemId });
      appConfig = { type: 'SYSTEM', id: targetSystemId };
    } catch (err) {
      console.error('Lỗi gán Ứng dụng hệ thống cho khách hàng mới:', err.message);
      appError = err.message || 'Không thể gán Ứng dụng Hệ thống';
    }
  }
  // 2. Tạo App riêng nếu chọn cấu hình App riêng
  else if (targetType === 'PRIVATE' && fptAppId && fptSecretKey) {
    try {
      appConfig = await appConfigService.createAppConfig({
        userId: customer.id,
        appName: targetAppName,
        fptAppId: fptAppId.trim(),
        fptSecretKey: fptSecretKey.trim(),
        isSystem: false,
      });
    } catch (err) {
      console.error('Lỗi khởi tạo Ứng dụng riêng cho khách hàng mới:', err.message);
      appError = err.message || 'Không thể kết nối FPT. Vui lòng kiểm tra lại App ID và Secret Key';
    }
  }
  // Fallback tương thích nếu truyền thẳng fptAppId & fptSecretKey
  else if (fptAppId && fptSecretKey) {
    try {
      appConfig = await appConfigService.createAppConfig({
        userId: customer.id,
        appName: targetAppName,
        fptAppId: fptAppId.trim(),
        fptSecretKey: fptSecretKey.trim(),
        isSystem: false,
      });
    } catch (err) {
      console.error('Lỗi khởi tạo Ứng dụng cho khách hàng mới:', err.message);
      appError = err.message || 'Không thể kết nối FPT. Vui lòng kiểm tra lại App ID và Secret Key';
    }
  }

  return { ...customer, appConfig, appError };
}

/**
 * Get all customers with pagination including App details
 */
async function getCustomers({ search, status, page = 1, limit = 20 }) {
  const where = { role: 'CUSTOMER' };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        companyName: true,
        phone: true,
        status: true,
        createdAt: true,
        appConfigs: {
          select: {
            id: true,
            appName: true,
            oaId: true,
            fptAppId: true,
            status: true,
            isSystem: true,
            syncedAt: true,
            _count: { select: { templates: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        systemAppAssignments: {
          select: {
            id: true,
            assignedAt: true,
            appConfig: {
              select: {
                id: true,
                appName: true,
                oaId: true,
                fptAppId: true,
                status: true,
                isSystem: true,
                syncedAt: true,
                _count: { select: { templates: true } },
              },
            },
          },
        },
        _count: { select: { messages: true, appConfigs: true, apiKeys: true, systemAppAssignments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get customer by ID with detailed info and per-OA API keys
 */
async function getCustomerById(id) {
  const customer = await prisma.user.findFirst({
    where: { id, role: 'CUSTOMER' },
    select: {
      id: true,
      email: true,
      fullName: true,
      companyName: true,
      phone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      appConfigs: {
        where: { isSystem: false },
        select: {
          id: true,
          appName: true,
          oaId: true,
          fptAppId: true,
          status: true,
          isSystem: true,
          syncedAt: true,
          _count: { select: { templates: true, messages: true } },
          apiKeys: {
            where: { userId: id },
            select: { id: true, keyName: true, prefix: true, webhookUrl: true, webhookDlrUrl: true, webhookRatingUrl: true, isActive: true, lastUsedAt: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      systemAppAssignments: {
        select: {
          id: true,
          assignedAt: true,
          appConfig: {
            select: {
              id: true,
              appName: true,
              oaId: true,
              fptAppId: true,
              status: true,
              isSystem: true,
              syncedAt: true,
              _count: { select: { templates: true, messages: true } },
              apiKeys: {
                where: { userId: id },
                select: { id: true, keyName: true, prefix: true, webhookUrl: true, webhookDlrUrl: true, webhookRatingUrl: true, isActive: true, lastUsedAt: true, createdAt: true },
              },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
      _count: { select: { messages: true, campaigns: true } },
    },
  });

  if (!customer) return null;

  const apiKeyService = require('./apiKeyService');
  const allApps = [];
  const privateApps = customer.appConfigs || [];
  const systemApps = customer.systemAppAssignments || [];

  for (const app of privateApps) {
    let key = app.apiKeys?.[0];
    if (!key) {
      key = await apiKeyService.getOrCreateApiKeyForApp(id, app.id, `Khóa API - ${app.appName}`);
    }
    allApps.push({
      ...app,
      type: 'PRIVATE',
      assignmentId: null,
      apiKey: key,
    });
  }

  for (const a of systemApps) {
    const config = a.appConfig;
    if (!config) continue;
    let key = config.apiKeys?.[0];
    if (!key) {
      key = await apiKeyService.getOrCreateApiKeyForApp(id, config.id, `Khóa API - ${config.appName}`);
    }
    allApps.push({
      ...config,
      type: 'SYSTEM',
      assignmentId: a.id,
      assignedAt: a.assignedAt,
      apiKey: key,
    });
  }

  return {
    ...customer,
    appConfigs: privateApps,
    systemAppAssignments: systemApps,
    allApps,
  };
}

/**
 * Update customer status (block/unblock)
 */
async function updateCustomerStatus(id, status) {
  return prisma.user.update({
    where: { id },
    data: { status },
    select: { id: true, email: true, fullName: true, status: true },
  });
}

/**
 * Reset customer password
 */
async function resetCustomerPassword(id, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  return prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: { id: true, email: true },
  });
}

/**
 * Update customer profile
 */
async function updateProfile(id, { fullName, companyName, phone }) {
  return prisma.user.update({
    where: { id },
    data: { fullName, companyName, phone },
    select: { id: true, email: true, fullName: true, companyName: true, phone: true },
  });
}

/**
 * Change password
 */
async function changePassword(id, oldPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('Người dùng không tồn tại'), { statusCode: 404 });

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) throw Object.assign(new Error('Mật khẩu hiện tại không đúng'), { statusCode: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  return prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: { id: true, email: true },
  });
}

/**
 * Delete a customer and cascade cleanup related records
 */
async function deleteCustomer(id) {
  const customer = await prisma.user.findFirst({
    where: { id, role: 'CUSTOMER' },
  });
  if (!customer) {
    throw Object.assign(new Error('Khách hàng không tồn tại'), { statusCode: 404 });
  }

  return prisma.$transaction(async (tx) => {
    // 1. Delete system application assignments for this customer
    await tx.customerAppAssignment.deleteMany({
      where: { userId: id },
    });

    // 2. Delete messages belonging to this customer
    await tx.message.deleteMany({
      where: { userId: id },
    });

    // 3. Delete campaigns belonging to this customer
    await tx.campaign.deleteMany({
      where: { userId: id },
    });

    // 4. Delete API keys belonging to this customer
    await tx.apiKey.deleteMany({
      where: { userId: id },
    });

    // 5. Delete private apps owned by this customer
    const userApps = await tx.fptAppConfig.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const appIds = userApps.map((o) => o.id);

    if (appIds.length > 0) {
      await tx.customerAppAssignment.deleteMany({
        where: { appConfigId: { in: appIds } },
      });
      await tx.message.deleteMany({
        where: { fptAppConfigId: { in: appIds } },
      });
      await tx.campaign.deleteMany({
        where: { fptAppConfigId: { in: appIds } },
      });
      await tx.znsTemplate.deleteMany({
        where: { fptAppConfigId: { in: appIds } },
      });
      await tx.fptAppConfig.deleteMany({
        where: { id: { in: appIds } },
      });
    }

    // 6. Delete the customer user account
    return tx.user.delete({
      where: { id },
      select: { id: true, email: true, fullName: true },
    });
  });
}

/**
 * Create a private App for a customer
 */
async function createCustomerPrivateApp(userId, { appName, fptAppId, fptSecretKey }) {
  const app = await appConfigService.createAppConfig({
    userId,
    appName,
    fptAppId,
    fptSecretKey,
    isSystem: false,
  });
  return app;
}

/**
 * Delete a private app of a customer
 */
async function deleteCustomerPrivateApp(userId, appConfigId) {
  const app = await prisma.fptAppConfig.findFirst({
    where: { id: appConfigId, userId, isSystem: false },
  });
  if (!app) throw Object.assign(new Error('Ứng dụng liên kết riêng không tồn tại hoặc không thuộc khách hàng này'), { statusCode: 404 });

  return prisma.$transaction(async (tx) => {
    await tx.apiKey.deleteMany({ where: { appConfigId } });
    await tx.message.deleteMany({ where: { fptAppConfigId: appConfigId } });
    await tx.campaign.deleteMany({ where: { fptAppConfigId: appConfigId } });
    await tx.znsTemplate.deleteMany({ where: { fptAppConfigId: appConfigId } });
    await tx.customerAppAssignment.deleteMany({ where: { appConfigId } });
    return tx.fptAppConfig.delete({ where: { id: appConfigId } });
  });
}

/**
 * Regenerate API key for an App
 */
async function regenerateAppKey(userId, appConfigId) {
  const apiKeyService = require('./apiKeyService');
  return apiKeyService.regenerateApiKeyForApp(userId, appConfigId);
}

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomerStatus,
  resetCustomerPassword,
  updateProfile,
  changePassword,
  deleteCustomer,
  createCustomerPrivateApp,
  deleteCustomerPrivateApp,
  regenerateAppKey,
};
