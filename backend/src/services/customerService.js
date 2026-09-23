const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const oaConfigService = require('./oaConfigService');

/**
 * Create a new customer with optional OA config
 */
async function createCustomer({ email, password, fullName, companyName, phone, oaType, systemOaId, oaName, fptAppId, fptSecretKey }) {
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

  let oaConfig = null;
  let oaError = null;

  // 1. Gán OA Hệ thống nếu chọn dùng OA Hệ thống
  if (oaType === 'SYSTEM' && systemOaId) {
    try {
      await oaConfigService.assignSystemOA({ userId: customer.id, oaConfigId: systemOaId });
      oaConfig = { type: 'SYSTEM', id: systemOaId };
    } catch (err) {
      console.error('Lỗi gán OA hệ thống cho khách hàng mới:', err.message);
      oaError = err.message || 'Không thể gán OA Hệ thống';
    }
  }
  // 2. Tạo OA riêng nếu chọn cấu hình OA riêng
  else if (oaType === 'PRIVATE' && fptAppId && fptSecretKey) {
    try {
      oaConfig = await oaConfigService.createOAConfig({
        userId: customer.id,
        oaName: oaName?.trim() || fullName || 'OA Khách hàng',
        fptAppId: fptAppId.trim(),
        fptSecretKey: fptSecretKey.trim(),
        isSystem: false,
      });
    } catch (err) {
      console.error('Lỗi khởi tạo OA riêng cho khách hàng mới:', err.message);
      oaError = err.message || 'Không thể kết nối FPT. Vui lòng kiểm tra lại App ID và Secret Key';
    }
  }
  // Fallback tương thích nếu truyền thẳng fptAppId & fptSecretKey
  else if (fptAppId && fptSecretKey) {
    try {
      oaConfig = await oaConfigService.createOAConfig({
        userId: customer.id,
        oaName: oaName?.trim() || fullName || 'OA Khách hàng',
        fptAppId: fptAppId.trim(),
        fptSecretKey: fptSecretKey.trim(),
        isSystem: false,
      });
    } catch (err) {
      console.error('Lỗi khởi tạo OA cho khách hàng mới:', err.message);
      oaError = err.message || 'Không thể kết nối FPT. Vui lòng kiểm tra lại App ID và Secret Key';
    }
  }

  // Tự động tạo API Key mặc định cho khách hàng
  try {
    const apiKeyService = require('./apiKeyService');
    await apiKeyService.createApiKey(customer.id, 'API Key mặc định');
  } catch (err) {
    console.error('Lỗi tự động tạo API Key mặc định cho khách hàng:', err.message);
  }

  return { ...customer, oaConfig, oaError };
}

/**
 * Get all customers with pagination including OA details
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
            oaName: true,
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
                oaName: true,
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

  // Map both appConfigs and oaConfigs for backward and forward compatibility
  const formattedData = data.map((u) => ({
    ...u,
    oaConfigs: u.appConfigs,
    systemOaAssignments: (u.systemAppAssignments || []).map((s) => ({
      ...s,
      oaConfig: s.appConfig,
    })),
  }));

  return { data: formattedData, total, page, totalPages: Math.ceil(total / limit) };
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
          oaName: true,
          oaId: true,
          fptAppId: true,
          status: true,
          isSystem: true,
          syncedAt: true,
          _count: { select: { templates: true, messages: true } },
          apiKeys: {
            where: { userId: id },
            select: { id: true, keyName: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
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
              oaName: true,
              oaId: true,
              fptAppId: true,
              status: true,
              isSystem: true,
              syncedAt: true,
              _count: { select: { templates: true, messages: true } },
              apiKeys: {
                where: { userId: id },
                select: { id: true, keyName: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
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
  const allOAs = [];
  const privateApps = customer.appConfigs || customer.oaConfigs || [];
  const systemApps = customer.systemAppAssignments || customer.systemOaAssignments || [];

  for (const oa of privateApps) {
    let key = oa.apiKeys?.[0];
    if (!key) {
      key = await apiKeyService.getOrCreateApiKeyForOA(id, oa.id, `Khóa API - ${oa.oaName}`);
    }
    allOAs.push({
      ...oa,
      type: 'PRIVATE',
      assignmentId: null,
      apiKey: key,
    });
  }

  for (const a of systemApps) {
    const config = a.appConfig || a.oaConfig;
    if (!config) continue;
    let key = config.apiKeys?.[0];
    if (!key) {
      key = await apiKeyService.getOrCreateApiKeyForOA(id, config.id, `Khóa API - ${config.oaName}`);
    }
    allOAs.push({
      ...config,
      type: 'SYSTEM',
      assignmentId: a.id,
      assignedAt: a.assignedAt,
      apiKey: key,
    });
  }

  return {
    ...customer,
    oaConfigs: privateApps,
    appConfigs: privateApps,
    systemOaAssignments: systemApps,
    systemAppAssignments: systemApps,
    allOAs,
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
    await (tx.customerAppAssignment || tx.customerOaAssignment).deleteMany({
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
    const userApps = await (tx.fptAppConfig || tx.fptOaConfig).findMany({
      where: { userId: id },
      select: { id: true },
    });
    const appIds = userApps.map((o) => o.id);

    if (appIds.length > 0) {
      await (tx.customerAppAssignment || tx.customerOaAssignment).deleteMany({
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
      await (tx.fptAppConfig || tx.fptOaConfig).deleteMany({
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
 * Create a private OA / App for a customer
 */
async function createCustomerPrivateOA(userId, { oaName, fptAppId, fptSecretKey }) {
  const oa = await oaConfigService.createOAConfig({
    userId,
    oaName,
    fptAppId,
    fptSecretKey,
    isSystem: false,
  });
  return oa;
}

/**
 * Delete a private app of a customer
 */
async function deleteCustomerPrivateOA(userId, oaConfigId) {
  const model = prisma.fptAppConfig || prisma.fptOaConfig;
  const oa = await model.findFirst({
    where: { id: oaConfigId, userId, isSystem: false },
  });
  if (!oa) throw Object.assign(new Error('Ứng dụng liên kết riêng không tồn tại hoặc không thuộc khách hàng này'), { statusCode: 404 });

  return prisma.$transaction(async (tx) => {
    const appAssignModel = tx.customerAppAssignment || tx.customerOaAssignment;
    const appModel = tx.fptAppConfig || tx.fptOaConfig;
    await tx.apiKey.deleteMany({ where: { appConfigId: oaConfigId } });
    await tx.message.deleteMany({ where: { fptAppConfigId: oaConfigId } });
    await tx.campaign.deleteMany({ where: { fptAppConfigId: oaConfigId } });
    await tx.znsTemplate.deleteMany({ where: { fptAppConfigId: oaConfigId } });
    await appAssignModel.deleteMany({ where: { appConfigId: oaConfigId } });
    return appModel.delete({ where: { id: oaConfigId } });
  });
}

/**
 * Regenerate API key for an OA
 */
async function regenerateOAKey(userId, oaConfigId) {
  const apiKeyService = require('./apiKeyService');
  return apiKeyService.regenerateApiKeyForOA(userId, oaConfigId);
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
  createCustomerPrivateOA,
  deleteCustomerPrivateOA,
  regenerateOAKey,
};
