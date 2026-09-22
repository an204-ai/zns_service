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
  let quotaInfo = null;
  try {
    oaInfo = await fptAdapter.getOAInfo(fptAppId, fptSecretKey);
    quotaInfo = await fptAdapter.getQuota(fptAppId, fptSecretKey);
  } catch (error) {
    throw Object.assign(new Error('Không thể kết nối FPT. Vui lòng kiểm tra App ID và Secret Key'), { statusCode: 400 });
  }

  const oaConfig = await prisma.fptOaConfig.create({
    data: {
      userId: userId || null,
      oaName,
      oaId: oaInfo?.oa_id || null,
      fptAppId,
      fptSecretKeyEncrypted: encrypted,
      isSystem,
      oaInfo,
      quotaInfo,
      syncedAt: new Date(),
    },
  });

  // Auto-sync templates
  await syncTemplates(oaConfig.id, fptAppId, fptSecretKey);

  // Auto-create API Key for this OA
  if (userId) {
    try {
      const apiKeyService = require('./apiKeyService');
      await apiKeyService.getOrCreateApiKeyForOA(userId, oaConfig.id, `Khóa API - ${oaName}`);
    } catch (err) {
      console.error('Lỗi tự động tạo API Key khi kết nối OA:', err.message);
    }
  }

  return oaConfig;
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

  const [oaInfo, quotaInfo] = await Promise.all([
    fptAdapter.getOAInfo(config.fptAppId, secretKey),
    fptAdapter.getQuota(config.fptAppId, secretKey),
  ]);

  await prisma.fptOaConfig.update({
    where: { id: oaConfigId },
    data: {
      oaInfo,
      quotaInfo,
      oaId: oaInfo?.oa_id || config.oaId,
      syncedAt: new Date(),
    },
  });

  const templates = await syncTemplates(oaConfigId, config.fptAppId, secretKey);
  return { oaInfo, quotaInfo, templatesCount: templates.length };
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
};
