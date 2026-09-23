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

  const oaConfig = await prisma.fptOaConfig.create({
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
 * Sync templates from FPT for a given OA config
 */
async function syncTemplates(oaConfigId, appId, secretKey) {
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
          fptOaConfigId_templateId: {
            fptOaConfigId: oaConfigId,
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
          fptOaConfigId: oaConfigId,
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
 * Get all OA configs with optional filtering
 */
async function getAllOAConfigs({ userId, status, isSystem, page = 1, limit = 20 }) {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (typeof isSystem === 'boolean') where.isSystem = isSystem;

  const [data, total] = await Promise.all([
    prisma.fptOaConfig.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, companyName: true } },
        _count: { select: { templates: true, messages: true, assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fptOaConfig.count({ where }),
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
    prisma.fptOaConfig.findMany({
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
    prisma.fptOaConfig.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Assign a system OA to a customer
 */
async function assignSystemOA({ userId, oaConfigId }) {
  const oa = await prisma.fptOaConfig.findFirst({
    where: { id: oaConfigId, isSystem: true },
  });
  if (!oa) throw Object.assign(new Error('OA Hệ thống không tồn tại hoặc không phải là OA Hệ thống'), { statusCode: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error('Khách hàng không tồn tại'), { statusCode: 404 });

  const assignment = await prisma.customerOaAssignment.upsert({
    where: {
      userId_oaConfigId: { userId, oaConfigId },
    },
    create: { userId, oaConfigId },
    update: {},
    include: {
      oaConfig: {
        select: { id: true, oaName: true, fptAppId: true, isSystem: true },
      },
    },
  });

  // Auto-create API Key for this customer and system OA
  try {
    const apiKeyService = require('./apiKeyService');
    await apiKeyService.getOrCreateApiKeyForOA(
      userId,
      oaConfigId,
      `Khóa API - ${assignment.oaConfig?.oaName || 'OA Hệ thống'}`
    );
  } catch (err) {
    console.error('Lỗi tự động tạo API Key khi gán OA Hệ thống:', err.message);
  }

  return assignment;
}

/**
 * Unassign a system OA from a customer
 */
async function unassignSystemOA({ userId, oaConfigId }) {
  // Delete the API key linked to this OA for this customer
  try {
    await prisma.apiKey.deleteMany({ where: { userId, oaConfigId } });
  } catch (err) {
    console.error('Lỗi xóa API Key khi gỡ OA Hệ thống:', err.message);
  }

  return prisma.customerOaAssignment.deleteMany({
    where: { userId, oaConfigId },
  });
}

/**
 * Get OA config by ID with decrypted secret key
 */
async function getOAConfigById(id) {
  const config = await prisma.fptOaConfig.findUnique({
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
 * Get decrypted FPT credentials for an OA config
 */
async function getDecryptedCredentials(oaConfigId) {
  const config = await prisma.fptOaConfig.findUnique({ where: { id: oaConfigId } });
  if (!config) throw Object.assign(new Error('OA config not found'), { statusCode: 404 });

  return {
    appId: config.fptAppId,
    secretKey: decrypt(config.fptSecretKeyEncrypted),
  };
}

/**
 * Resync OA info and templates from FPT
 */
async function resyncOAConfig(oaConfigId) {
  const config = await prisma.fptOaConfig.findUnique({ where: { id: oaConfigId } });
  if (!config) throw Object.assign(new Error('Không tìm thấy cấu hình OA'), { statusCode: 404 });

  const secretKey = decrypt(config.fptSecretKeyEncrypted);

  const oaInfo = await fptAdapter.getOAInfo(config.fptAppId, secretKey);

  await prisma.fptOaConfig.update({
    where: { id: oaConfigId },
    data: {
      oaInfo,
      oaId: oaInfo?.oa_id || config.oaId,
      syncedAt: new Date(),
    },
  });

  const templates = await syncTemplates(oaConfigId, config.fptAppId, secretKey);
  return { oaInfo, templatesCount: templates.length };
}

/**
 * Update OA config status
 */
async function updateOAStatus(id, status) {
  return prisma.fptOaConfig.update({ where: { id }, data: { status } });
}

/**
 * Delete an OA config (and cascade assignments, templates, api keys)
 */
async function deleteOAConfig(id) {
  const config = await prisma.fptOaConfig.findUnique({ where: { id } });
  if (!config) throw Object.assign(new Error('Cấu hình OA không tồn tại'), { statusCode: 404 });

  return prisma.$transaction(async (tx) => {
    await tx.customerOaAssignment.deleteMany({ where: { oaConfigId: id } });
    await tx.apiKey.deleteMany({ where: { oaConfigId: id } });
    await tx.message.deleteMany({ where: { fptOaConfigId: id } });
    await tx.campaign.deleteMany({ where: { fptOaConfigId: id } });
    await tx.znsTemplate.deleteMany({ where: { fptOaConfigId: id } });
    return tx.fptOaConfig.delete({ where: { id } });
  });
}

/**
 * Update an existing OA config
 */
async function updateOAConfig(id, { oaName, fptAppId, fptSecretKey, status }) {
  const existing = await prisma.fptOaConfig.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Cấu hình OA không tồn tại'), { statusCode: 404 });

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

  const updated = await prisma.fptOaConfig.update({
    where: { id },
    data,
  });

  return updated;
}

/**
 * Get ZNS Quota for an OA config
 */
async function getOAQuota(oaConfigId, forceRefresh = false) {
  const { appId, secretKey } = await getDecryptedCredentials(oaConfigId);
  return fptAdapter.getQuota(appId, secretKey, forceRefresh);
}

/**
 * Get Customer Ratings for a template
 */
async function getTemplateRatings(oaConfigId, templateId, { fromTime, toTime, page = 1 }) {
  const { appId, secretKey } = await getDecryptedCredentials(oaConfigId);

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
async function getTemplateLiveDetail(oaConfigId, templateId) {
  const { appId, secretKey } = await getDecryptedCredentials(oaConfigId);
  let detail = null;
  let liveDetailError = null;

  try {
    const detailResult = await fptAdapter.getTemplateDetail(appId, secretKey, Number(templateId));
    if (detailResult?.status === 1 && detailResult?.data) {
      detail = detailResult.data;

      await prisma.znsTemplate.upsert({
        where: {
          fptOaConfigId_templateId: {
            fptOaConfigId: oaConfigId,
            templateId: Number(templateId),
          },
        },
        update: {
          templateName: detail.templateName || undefined,
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
          fptOaConfigId: oaConfigId,
          templateId: Number(templateId),
          templateName: detail.templateName || `Template #${templateId}`,
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

  const dbTemplate = await prisma.znsTemplate.findFirst({
    where: {
      fptOaConfigId: oaConfigId,
      templateId: Number(templateId),
    },
    include: {
      fptOaConfig: {
        select: { id: true, oaName: true, oaId: true, isSystem: true },
      },
    },
  });

  if (!dbTemplate && liveDetailError) {
    const error = new Error(liveDetailError);
    error.statusCode = 400;
    throw error;
  }

  return {
    ...dbTemplate,
    liveDetail: detail,
    liveDetailError,
  };
}

module.exports = {
  createOAConfig,
  syncTemplates,
  getAllOAConfigs,
  getSystemOAConfigs,
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

