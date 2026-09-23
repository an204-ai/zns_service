const { prisma } = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto');
const fptAdapter = require('./fptAdapter');

/**
 * Create a new OA config and sync from FPT
 */
async function createOAConfig({ userId, oaName, fptAppId, fptSecretKey, isSystem = false }) {
  // Encrypt secret key before storing
  const encrypted = encrypt(fptSecretKey);

  // Try to get OA info from FPT to validate credentials
  let oaInfo = null;
  let connectionWarning = null;
  try {
    oaInfo = await fptAdapter.getOAInfo(fptAppId, fptSecretKey);
  } catch (error) {
    // If FPT explicitly returned invalid credentials (status !== 1 from FPT)
    if (error.statusCode === 400) {
      throw error;
    }
    // If network connection error / timeout (e.g. FPT firewall has not whitelisted local IP yet)
    connectionWarning = error.message;
    console.warn('[createOAConfig Network Warning]:', error.message);
  }

  const oaConfig = await prisma.fptAppConfig.create({
    data: {
      userId: userId || null,
      oaName,
      oaId: oaInfo?.oa_id || null,
      fptAppId,
      fptSecretKeyEncrypted: encrypted,
      isSystem,
      oaInfo: oaInfo || { name: oaName, note: connectionWarning || 'Chờ kết nối FPT ZBS' },
      syncedAt: new Date(),
    },
  });

  // Auto-sync templates if FPT connection succeeded
  if (oaInfo) {
    try {
      await syncTemplates(oaConfig.id, fptAppId, fptSecretKey);
    } catch (err) {
      console.warn('Lỗi đồng bộ template khi tạo OA:', err.message);
    }
  }

  // Auto-create API Key for this OA
  if (userId) {
    try {
      const apiKeyService = require('./apiKeyService');
      await apiKeyService.getOrCreateApiKeyForOA(userId, oaConfig.id, `Khóa API - ${oaName}`);
    } catch (err) {
      console.error('Lỗi tự động tạo API Key khi kết nối OA:', err.message);
    }
  }

  return {
    ...oaConfig,
    connectionWarning,
  };
}

/**
 * Sync templates from FPT for a given App config
 */
async function syncTemplates(appConfigId, appId, secretKey) {
  let page = 1;
  let hasMore = true;
  const synced = [];

  while (hasMore) {
    const result = await fptAdapter.getTemplates(appId, secretKey, page);
    if (result.status !== 1 || !result.data || result.data.length === 0) break;

    for (const tpl of result.data) {
      // Get template detail
      let detail = {};
      try {
        const detailResult = await fptAdapter.getTemplateDetail(appId, secretKey, tpl.id);
        if (detailResult.status === 1) {
          detail = detailResult.data;
        }
      } catch (e) {
        // Skip detail if error
      }

      const upserted = await prisma.znsTemplate.upsert({
        where: {
          fptAppConfigId_templateId: {
            fptAppConfigId: appConfigId,
            templateId: tpl.id,
          },
        },
        update: {
          templateName: tpl.name || detail.templateName || '',
          templateTag: detail.templateTag || null,
          templateQuality: detail.templateQuality || null,
          listParams: detail.listParams || null,
          listButtons: detail.listButtons || null,
          previewUrl: detail.previewUrl || null,
          templateContent: detail.templateContent || null,
          status: detail.status === 'ENABLE' ? 'ENABLE' : detail.status === 'PENDING' ? 'PENDING' : 'LOCKED',
          syncedAt: new Date(),
        },
        create: {
          fptAppConfigId: appConfigId,
          templateId: tpl.id,
          templateName: tpl.name || detail.templateName || '',
          templateTag: detail.templateTag || null,
          templateQuality: detail.templateQuality || null,
          listParams: detail.listParams || null,
          listButtons: detail.listButtons || null,
          previewUrl: detail.previewUrl || null,
          templateContent: detail.templateContent || null,
          status: 'ENABLE',
          syncedAt: new Date(),
        },
      });
      synced.push(upserted);
    }

    hasMore = page < (result.last_page || 1);
    page++;
  }

  return synced;
}

/**
 * Get all OA configs with optional filtering (supports type: all, system, private, unassigned)
 */
async function getAllOAConfigs({ userId, status, isSystem, type, search, page = 1, limit = 50 } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (typeof isSystem === 'boolean') {
    where.isSystem = isSystem;
  } else if (type === 'system') {
    where.isSystem = true;
  } else if (type === 'private') {
    where.isSystem = false;
  } else if (type === 'unassigned') {
    where.isSystem = false;
    where.userId = null;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { oaName: { contains: s, mode: 'insensitive' } },
      { fptAppId: { contains: s, mode: 'insensitive' } },
      { oaId: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.fptAppConfig.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, companyName: true } },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, companyName: true } },
          },
        },
        _count: { select: { templates: true, messages: true, assignments: true } },
      },
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fptAppConfig.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get all System OA configs
 */
async function getSystemOAConfigs({ status, page = 1, limit = 50 } = {}) {
  const where = { isSystem: true };
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.fptAppConfig.findMany({
      where,
      include: {
        _count: { select: { templates: true, messages: true, assignments: true } },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, companyName: true } }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fptAppConfig.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get all available apps that can be assigned to a specific customer:
 * 1. Active System Apps that are not yet assigned to this user
 * 2. Active Private Apps that have no user assigned yet (userId IS NULL)
 */
async function getAvailableAppsForCustomer(userId) {
  // Find IDs of system apps already assigned to this user
  const userAssignments = await prisma.customerAppAssignment.findMany({
    where: { userId },
    select: { appConfigId: true },
  });
  const assignedSystemAppIds = userAssignments.map(a => a.appConfigId);

  const [systemApps, privateApps] = await Promise.all([
    // Active System Apps not yet assigned to this customer
    prisma.fptAppConfig.findMany({
      where: {
        isSystem: true,
        status: 'ACTIVE',
        ...(assignedSystemAppIds.length > 0 ? { id: { notIn: assignedSystemAppIds } } : {}),
      },
      select: {
        id: true,
        oaName: true,
        oaId: true,
        fptAppId: true,
        isSystem: true,
        status: true,
        _count: { select: { templates: true, assignments: true } },
      },
      orderBy: { oaName: 'asc' },
    }),
    // Active Private Apps NOT yet assigned to ANY customer (userId is null)
    prisma.fptAppConfig.findMany({
      where: {
        isSystem: false,
        status: 'ACTIVE',
        userId: null,
      },
      select: {
        id: true,
        oaName: true,
        oaId: true,
        fptAppId: true,
        isSystem: true,
        status: true,
        _count: { select: { templates: true } },
      },
      orderBy: { oaName: 'asc' },
    }),
  ]);

  return {
    systemApps,
    privateApps,
    allAvailable: [
      ...systemApps.map(a => ({ ...a, category: 'SYSTEM' })),
      ...privateApps.map(a => ({ ...a, category: 'PRIVATE' })),
    ],
  };
}

/**
 * Assign an App (System or Private) to a customer
 * System app -> can be assigned to multiple customers (via CustomerAppAssignment)
 * Private app -> can ONLY be assigned to 1 customer (userId set on FptAppConfig)
 */
async function assignAppToCustomer({ userId, appConfigId }) {
  const app = await prisma.fptAppConfig.findUnique({
    where: { id: appConfigId },
  });
  if (!app) {
    throw Object.assign(new Error('Ứng dụng không tồn tại'), { statusCode: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('Khách hàng không tồn tại'), { statusCode: 404 });
  }

  if (app.isSystem) {
    // System app -> many customers allowed via customerAppAssignment
    await prisma.customerAppAssignment.upsert({
      where: {
        userId_appConfigId: { userId, appConfigId },
      },
      create: { userId, appConfigId },
      update: {},
    });
  } else {
    // Private app -> ONLY 1 customer allowed!
    if (app.userId && app.userId !== userId) {
      throw Object.assign(
        new Error('Ứng dụng cá nhân này đã được gán cho một khách hàng khác! Mỗi ứng dụng cá nhân chỉ được gán cho duy nhất 1 khách hàng.'),
        { statusCode: 400 }
      );
    }
    await prisma.fptAppConfig.update({
      where: { id: appConfigId },
      data: { userId },
    });
  }

  // Auto-create API Key for this customer and app
  const appName = app.oaName || 'Ứng dụng Zalo';
  try {
    const apiKeyService = require('./apiKeyService');
    await apiKeyService.getOrCreateApiKeyForApp(
      userId,
      appConfigId,
      `Khóa API - ${appName}`
    );
  } catch (err) {
    console.error('Lỗi tự động tạo API Key khi gán Ứng dụng:', err.message);
  }

  return { success: true, appConfigId, isSystem: app.isSystem };
}

/**
 * Unassign an App (System or Private) from a customer
 */
async function unassignAppFromCustomer({ userId, appConfigId }) {
  const app = await prisma.fptAppConfig.findUnique({
    where: { id: appConfigId },
  });
  if (!app) {
    throw Object.assign(new Error('Ứng dụng không tồn tại'), { statusCode: 404 });
  }

  // Delete API key linked to this app for this customer
  try {
    await prisma.apiKey.deleteMany({ where: { userId, appConfigId } });
  } catch (err) {
    console.error('Lỗi xóa API Key khi gỡ ứng dụng:', err.message);
  }

  if (app.isSystem) {
    await prisma.customerAppAssignment.deleteMany({
      where: { userId, appConfigId },
    });
  } else {
    // If it was assigned to this user, return to unassigned pool (userId = null)
    if (app.userId === userId) {
      await prisma.fptAppConfig.update({
        where: { id: appConfigId },
        data: { userId: null },
      });
    }
  }

  return { success: true };
}

/**
 * Assign a system App to a customer (wrapper for backward compatibility)
 */
async function assignSystemOA({ userId, appConfigId }) {
  return assignAppToCustomer({ userId, appConfigId });
}

/**
 * Unassign a system App from a customer (wrapper for backward compatibility)
 */
async function unassignSystemOA({ userId, appConfigId }) {
  return unassignAppFromCustomer({ userId, appConfigId });
}

/**
 * Get App config by ID with decrypted secret key
 */
async function getOAConfigById(id) {
  const config = await prisma.fptAppConfig.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, companyName: true } },
      templates: { orderBy: { templateName: 'asc' } },
      assignments: {
        include: {
          user: { select: { id: true, fullName: true, email: true, companyName: true } },
        },
      },
    },
  });
  return config;
}

/**
 * Get decrypted FPT credentials for an App config
 */
async function getDecryptedCredentials(appConfigId) {
  const config = await prisma.fptAppConfig.findUnique({ where: { id: appConfigId } });
  if (!config) throw Object.assign(new Error('Ứng dụng liên kết không tồn tại'), { statusCode: 404 });

  return {
    appId: config.fptAppId,
    secretKey: decrypt(config.fptSecretKeyEncrypted),
  };
}

/**
 * Resync App info and templates from FPT
 */
async function resyncOAConfig(appConfigId) {
  const config = await prisma.fptAppConfig.findUnique({ where: { id: appConfigId } });
  if (!config) throw Object.assign(new Error('Không tìm thấy ứng dụng liên kết'), { statusCode: 404 });

  const secretKey = decrypt(config.fptSecretKeyEncrypted);

  const oaInfo = await fptAdapter.getOAInfo(config.fptAppId, secretKey);

  await prisma.fptAppConfig.update({
    where: { id: appConfigId },
    data: {
      oaInfo,
      oaId: oaInfo?.oa_id || config.oaId,
      syncedAt: new Date(),
    },
  });

  const templates = await syncTemplates(appConfigId, config.fptAppId, secretKey);
  return { oaInfo, templatesCount: templates.length };
}

/**
 * Update OA config status
 */
async function updateOAStatus(id, status) {
  return prisma.fptAppConfig.update({ where: { id }, data: { status } });
}

/**
 * Delete an OA config (and cascade assignments, templates, api keys)
 */
async function deleteOAConfig(id) {
  const config = await prisma.fptAppConfig.findUnique({ where: { id } });
  if (!config) throw Object.assign(new Error('Ứng dụng liên kết không tồn tại'), { statusCode: 404 });

  return prisma.$transaction(async (tx) => {
    await tx.customerAppAssignment.deleteMany({ where: { appConfigId: id } });
    await tx.apiKey.deleteMany({ where: { appConfigId: id } });
    await tx.message.deleteMany({ where: { fptAppConfigId: id } });
    await tx.campaign.deleteMany({ where: { fptAppConfigId: id } });
    await tx.znsTemplate.deleteMany({ where: { fptAppConfigId: id } });
    return tx.fptAppConfig.delete({ where: { id } });
  });
}

/**
 * Update an existing OA config
 */
async function updateOAConfig(id, { oaName, fptAppId, fptSecretKey, status }) {
  const existing = await prisma.fptAppConfig.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Ứng dụng liên kết không tồn tại'), { statusCode: 404 });

  const data = {};
  if (oaName !== undefined && oaName.trim()) {
    data.oaName = oaName.trim();
  }
  if (fptAppId !== undefined && fptAppId.trim()) {
    data.fptAppId = fptAppId.trim();
  }
  if (fptSecretKey && fptSecretKey.trim()) {
    data.fptSecretKeyEncrypted = encrypt(fptSecretKey.trim());
  }
  if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
    data.status = status;
  }

  // If App ID or Secret Key changed, try to validate with FPT and refresh oaId
  const effectiveAppId = data.fptAppId || existing.fptAppId;
  let effectiveSecretKey = null;
  try {
    effectiveSecretKey = fptSecretKey && fptSecretKey.trim() ? fptSecretKey.trim() : decrypt(existing.fptSecretKeyEncrypted);
  } catch (err) {
    console.warn('Decrypt error during updateOAConfig:', err.message);
  }

  if (effectiveSecretKey && (data.fptAppId || (fptSecretKey && fptSecretKey.trim()))) {
    try {
      const oaInfo = await fptAdapter.getOAInfo(effectiveAppId, effectiveSecretKey);
      if (oaInfo?.oa_id) {
        data.oaId = oaInfo.oa_id;
      }
    } catch (e) {
      console.warn('FPT getOAInfo check warning:', e.message);
    }
  }

  const updated = await prisma.fptAppConfig.update({
    where: { id },
    data,
  });

  return updated;
}

/**
 * Get ZNS Quota for an App config
 */
async function getOAQuota(appConfigId, forceRefresh = false) {
  const { appId, secretKey } = await getDecryptedCredentials(appConfigId);
  return fptAdapter.getQuota(appId, secretKey, forceRefresh);
}

/**
 * Get Customer Ratings for a template
 */
async function getTemplateRatings(appConfigId, templateId, { fromTime, toTime, page = 1 }) {
  const { appId, secretKey } = await getDecryptedCredentials(appConfigId);

  // Default dates: last 30 days if not provided
  let from = fromTime;
  let to = toTime;
  if (!from || !to) {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    to = now.toISOString().split('T')[0];
    from = past.toISOString().split('T')[0];
  }

  const result = await fptAdapter.getRatings(appId, secretKey, {
    templateId,
    fromTime: from,
    toTime: to,
    page,
  });

  // Calculate rating stats
  let avgRate = 0;
  const list = result?.data || [];
  if (Array.isArray(list) && list.length > 0) {
    const sum = list.reduce((acc, curr) => acc + (Number(curr.rate) || 0), 0);
    avgRate = Math.round((sum / list.length) * 10) / 10;
  }

  return {
    ...result,
    fromTime: from,
    toTime: to,
    page: Number(page) || 1,
    avgRate,
  };
}

/**
 * Get live detailed template data from FPT and update DB cache
 */
async function getTemplateLiveDetail(appConfigId, templateId, forceRefresh = false) {
  // 1. Kiểm tra dữ liệu mẫu tin đã đồng bộ trong Database trước (phản hồi siêu nhanh < 15ms)
  const dbTemplate = await prisma.znsTemplate.findFirst({
    where: {
      fptAppConfigId: appConfigId,
      templateId: Number(templateId),
    },
    include: {
      fptAppConfig: {
        select: { id: true, oaName: true, oaId: true, isSystem: true },
      },
    },
  });

  // Nếu DB đã có thông tin mẫu tin và không yêu cầu cưỡng chế làm mới, trả về ngay lập tức (< 10ms)
  if (dbTemplate && !forceRefresh) {
    return {
      ...dbTemplate,
      liveDetail: null,
      liveDetailError: null,
    };
  }

  // 2. Nếu chưa có hoặc yêu cầu làm mới (forceRefresh = true), gọi sang FPT
  const { appId, secretKey } = await getDecryptedCredentials(appConfigId);
  let detail = null;
  let liveDetailError = null;

  try {
    const detailResult = await fptAdapter.getTemplateDetail(appId, secretKey, Number(templateId));
    const detailData = detailResult?.data || (detailResult?.templateName || detailResult?.name ? detailResult : null);
    if (detailData) {
      detail = detailData;

      await prisma.znsTemplate.upsert({
        where: {
          fptAppConfigId_templateId: {
            fptAppConfigId: appConfigId,
            templateId: Number(templateId),
          },
        },
        update: {
          templateName: detail.templateName || detail.name || undefined,
          templateTag: detail.templateTag || null,
          templateQuality: detail.templateQuality || null,
          listParams: detail.listParams || null,
          listButtons: detail.listButtons || null,
          previewUrl: detail.previewUrl || null,
          templateContent: detail.templateContent || null,
          status: detail.status === 'ENABLE' ? 'ENABLE' : detail.status === 'PENDING' ? 'PENDING' : 'LOCKED',
          syncedAt: new Date(),
        },
        create: {
          fptAppConfigId: appConfigId,
          templateId: Number(templateId),
          templateName: detail.templateName || detail.name || `Template #${templateId}`,
          templateTag: detail.templateTag || null,
          templateQuality: detail.templateQuality || null,
          listParams: detail.listParams || null,
          listButtons: detail.listButtons || null,
          previewUrl: detail.previewUrl || null,
          templateContent: detail.templateContent || null,
          status: 'ENABLE',
          syncedAt: new Date(),
        },
      });
    }
  } catch (err) {
    liveDetailError = err.message;
  }

  const updatedTemplate = await prisma.znsTemplate.findFirst({
    where: {
      fptAppConfigId: appConfigId,
      templateId: Number(templateId),
    },
    include: {
      fptAppConfig: {
        select: { id: true, oaName: true, oaId: true, isSystem: true },
      },
    },
  });

  if (!updatedTemplate && !dbTemplate && liveDetailError) {
    const error = new Error(liveDetailError);
    error.statusCode = 400;
    throw error;
  }

  return {
    ...(updatedTemplate || dbTemplate),
    liveDetail: detail,
    liveDetailError,
  };
}

module.exports = {
  createOAConfig,
  syncTemplates,
  getAllOAConfigs,
  getSystemOAConfigs,
  getAvailableAppsForCustomer,
  assignAppToCustomer,
  unassignAppFromCustomer,
  assignSystemOA,
  unassignSystemOA,
  getOAConfigById,
  getDecryptedCredentials,
  resyncOAConfig,
  updateOAStatus,
  deleteOAConfig,
  updateOAConfig,
  getOAQuota,
  getTemplateRatings,
  getTemplateLiveDetail,
};

