const { prisma } = require('../config/database');
const { encrypt, decrypt } = require('../utils/crypto');
const fptAdapter = require('./fptAdapter');

/**
 * Create a new App config and sync from FPT
 */
async function createAppConfig({ userId, appName, fptAppId, fptSecretKey, isSystem = false }) {
  const finalAppName = appName?.trim() || 'Ứng dụng Zalo';
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
    console.warn('[createAppConfig Network Warning]:', error.message);
  }

  const appConfig = await prisma.fptAppConfig.create({
    data: {
      userId: userId || null,
      appName: finalAppName,
      oaId: oaInfo?.oa_id || null,
      fptAppId,
      fptSecretKeyEncrypted: encrypted,
      isSystem,
      oaInfo: oaInfo || { name: finalAppName, note: connectionWarning || 'Chờ kết nối FPT ZBS' },
      syncedAt: new Date(),
    },
  });

  // Auto-sync templates if FPT connection succeeded
  if (oaInfo) {
    try {
      await syncTemplates(appConfig.id, fptAppId, fptSecretKey);
    } catch (err) {
      console.warn('Lỗi đồng bộ template khi tạo Ứng dụng:', err.message);
    }
  }

  // Auto-create API Key for this App
  if (userId) {
    try {
      const apiKeyService = require('./apiKeyService');
      await apiKeyService.getOrCreateApiKeyForApp(userId, appConfig.id, `Khóa API - ${finalAppName}`);
    } catch (err) {
      console.error('Lỗi tự động tạo API Key khi kết nối Ứng dụng:', err.message);
    }
  }

  return {
    ...appConfig,
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
 * Get all App configs with optional filtering (supports type: all, system, private, unassigned)
 */
async function getAllAppConfigs({ userId, status, isSystem, type, search, page = 1, limit = 50 } = {}) {
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
      { appName: { contains: s, mode: 'insensitive' } },
      { fptAppId: { contains: s, mode: 'insensitive' } },
      { oaId: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [rawList, total] = await Promise.all([
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

  return { data: rawList, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get all System App configs
 */
async function getSystemAppConfigs({ status, page = 1, limit = 50 } = {}) {
  const where = { isSystem: true };
  if (status) where.status = status;

  const [rawList, total] = await Promise.all([
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

  return { data: rawList, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get all available apps that can be assigned to a specific customer:
 * 1. Active System Apps that are not yet assigned to this user
 * 2. Active Private Apps that have no user assigned yet (userId IS NULL)
 */
async function getAvailableAppsForCustomer(userId) {
  const userAssignments = await prisma.customerAppAssignment.findMany({
    where: { userId },
    select: { appConfigId: true },
  });
  const assignedSystemAppIds = userAssignments.map(a => a.appConfigId);

  const [rawSystemApps, rawPrivateApps] = await Promise.all([
    prisma.fptAppConfig.findMany({
      where: {
        isSystem: true,
        status: 'ACTIVE',
        ...(assignedSystemAppIds.length > 0 ? { id: { notIn: assignedSystemAppIds } } : {}),
      },
      select: {
        id: true,
        appName: true,
        oaId: true,
        fptAppId: true,
        isSystem: true,
        status: true,
        _count: { select: { templates: true, assignments: true } },
      },
      orderBy: { appName: 'asc' },
    }),
    prisma.fptAppConfig.findMany({
      where: {
        isSystem: false,
        status: 'ACTIVE',
        userId: null,
      },
      select: {
        id: true,
        appName: true,
        oaId: true,
        fptAppId: true,
        isSystem: true,
        status: true,
        _count: { select: { templates: true } },
      },
      orderBy: { appName: 'asc' },
    }),
  ]);

  return {
    systemApps: rawSystemApps,
    privateApps: rawPrivateApps,
    allAvailable: [
      ...rawSystemApps.map(a => ({ ...a, category: 'SYSTEM' })),
      ...rawPrivateApps.map(a => ({ ...a, category: 'PRIVATE' })),
    ],
  };
}

/**
 * Assign an App (System or Private) to a customer
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
    await prisma.customerAppAssignment.upsert({
      where: {
        userId_appConfigId: { userId, appConfigId },
      },
      create: { userId, appConfigId },
      update: {},
    });
  } else {
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

  const appName = app.appName || 'Ứng dụng Zalo';
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
 * Get App config by ID
 */
async function getAppConfigById(id) {
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
async function resyncAppConfig(appConfigId) {
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
 * Update App config status
 */
async function updateAppStatus(id, status) {
  return prisma.fptAppConfig.update({ where: { id }, data: { status } });
}

/**
 * Delete an App config (and cascade)
 */
async function deleteAppConfig(id) {
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
 * Update an existing App config
 */
async function updateAppConfig(id, { appName, fptAppId, fptSecretKey, status }) {
  const existing = await prisma.fptAppConfig.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Ứng dụng liên kết không tồn tại'), { statusCode: 404 });

  const data = {};
  if (appName !== undefined && appName.trim()) {
    data.appName = appName.trim();
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

  const effectiveAppId = data.fptAppId || existing.fptAppId;
  let effectiveSecretKey = null;
  try {
    effectiveSecretKey = fptSecretKey && fptSecretKey.trim() ? fptSecretKey.trim() : decrypt(existing.fptSecretKeyEncrypted);
  } catch (err) {
    console.warn('Decrypt error during updateAppConfig:', err.message);
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
async function getAppQuota(appConfigId, forceRefresh = false) {
  const { appId, secretKey } = await getDecryptedCredentials(appConfigId);
  return fptAdapter.getQuota(appId, secretKey, forceRefresh);
}

/**
 * Get Customer Ratings for a template
 */
async function getTemplateRatings(appConfigId, templateId, { fromTime, toTime, page = 1 }) {
  const { appId, secretKey } = await getDecryptedCredentials(appConfigId);

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
  const dbTemplate = await prisma.znsTemplate.findFirst({
    where: {
      fptAppConfigId: appConfigId,
      templateId: Number(templateId),
    },
    include: {
      fptAppConfig: {
        select: { id: true, appName: true, oaId: true, isSystem: true },
      },
    },
  });

  if (dbTemplate && !forceRefresh) {
    return {
      ...dbTemplate,
      liveDetail: null,
      liveDetailError: null,
    };
  }

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
        select: { id: true, appName: true, oaId: true, isSystem: true },
      },
    },
  });

  if (!updatedTemplate && !dbTemplate && liveDetailError) {
    const error = new Error(liveDetailError);
    error.statusCode = 400;
    throw error;
  }

  const resTemplate = updatedTemplate || dbTemplate;
  return {
    ...resTemplate,
    liveDetail: detail,
    liveDetailError,
  };
}

module.exports = {
  createAppConfig,
  syncTemplates,
  getAllAppConfigs,
  getSystemAppConfigs,
  getAvailableAppsForCustomer,
  assignAppToCustomer,
  unassignAppFromCustomer,
  getAppConfigById,
  getDecryptedCredentials,
  resyncAppConfig,
  updateAppStatus,
  deleteAppConfig,
  updateAppConfig,
  getAppQuota,
  getTemplateRatings,
  getTemplateLiveDetail,
};
