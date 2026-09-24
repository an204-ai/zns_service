const { prisma } = require('../config/database');
const { generateApiKey, hashApiKey, getApiKeyPrefix, encrypt, decrypt } = require('../utils/crypto');

/**
 * Create a new API key for a user (optionally associated with an App config)
 * Saves encrypted key so user can view/copy anytime
 */
async function createApiKey(userId, keyName, appConfigId = null) {
  const plainKey = generateApiKey();
  const apiKeyHash = hashApiKey(plainKey);
  const prefix = getApiKeyPrefix(plainKey);
  const apiKeyEncrypted = encrypt(plainKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      appConfigId: appConfigId || null,
      keyName,
      apiKeyHash,
      apiKeyEncrypted,
      prefix,
      isActive: true,
    },
    include: {
      appConfig: {
        select: { id: true, appName: true, isSystem: true, fptAppId: true },
      },
    },
  });

  return {
    id: apiKey.id,
    keyName: apiKey.keyName,
    prefix: apiKey.prefix,
    appConfigId: apiKey.appConfigId,
    appConfig: apiKey.appConfig,
    apiKey: plainKey,
    webhookUrl: apiKey.webhookUrl || null,
    webhookDlrUrl: apiKey.webhookDlrUrl || apiKey.webhookUrl || null,
    webhookRatingUrl: apiKey.webhookRatingUrl || null,
    webhookSecret: apiKey.webhookSecret || null,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Ensure an API key exists for a user and App config
 * If exists, returns it with decrypted key; if not, creates a new one
 */
async function getOrCreateApiKeyForApp(userId, appConfigId, keyName = null) {
  let key = await prisma.apiKey.findFirst({
    where: { userId, appConfigId },
    include: {
      appConfig: {
        select: { id: true, appName: true, isSystem: true },
      },
    },
  });

  if (!key) {
    const app = await prisma.fptAppConfig.findUnique({ where: { id: appConfigId } });
    const appTitle = app?.appName || null;
    const generatedName = keyName || (appTitle ? `Khóa API - ${appTitle}` : 'Khóa API ZNS');
    key = await createApiKey(userId, generatedName, appConfigId);
    return key;
  }

  let plainKey = null;
  if (key.apiKeyEncrypted) {
    try {
      plainKey = decrypt(key.apiKeyEncrypted);
    } catch (e) {
      console.error('Failed to decrypt apiKey:', e.message);
    }
  }

  // If existing record did not have apiKeyEncrypted, upgrade it with a new key
  if (!plainKey) {
    plainKey = generateApiKey();
    const apiKeyHash = hashApiKey(plainKey);
    const prefix = getApiKeyPrefix(plainKey);
    const apiKeyEncrypted = encrypt(plainKey);
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { apiKeyHash, apiKeyEncrypted, prefix },
    });
    key.prefix = prefix;
  }

  return {
    id: key.id,
    keyName: key.keyName,
    prefix: key.prefix,
    apiKey: plainKey,
    webhookUrl: key.webhookUrl || null,
    webhookDlrUrl: key.webhookDlrUrl || key.webhookUrl || null,
    webhookRatingUrl: key.webhookRatingUrl || null,
    webhookSecret: key.webhookSecret || null,
    appConfigId: key.appConfigId,
    appConfig: key.appConfig,
    isActive: key.isActive,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
  };
}

/**
 * Regenerate API key for an App config
 */
async function regenerateApiKeyForApp(userId, appConfigId) {
  const plainKey = generateApiKey();
  const apiKeyHash = hashApiKey(plainKey);
  const prefix = getApiKeyPrefix(plainKey);
  const apiKeyEncrypted = encrypt(plainKey);

  const existing = await prisma.apiKey.findFirst({ where: { userId, appConfigId } });

  if (existing) {
    const updated = await prisma.apiKey.update({
      where: { id: existing.id },
      data: {
        apiKeyHash,
        apiKeyEncrypted,
        prefix,
        isActive: true,
        lastUsedAt: null,
      },
    });
    return {
      id: updated.id,
      keyName: updated.keyName,
      prefix: updated.prefix,
      apiKey: plainKey,
      webhookUrl: updated.webhookUrl || null,
      webhookDlrUrl: updated.webhookDlrUrl || updated.webhookUrl || null,
      webhookRatingUrl: updated.webhookRatingUrl || null,
      webhookSecret: updated.webhookSecret || null,
      appConfigId,
    };
  } else {
    const app = await prisma.fptAppConfig.findUnique({ where: { id: appConfigId } });
    const key = await prisma.apiKey.create({
      data: {
        userId,
        appConfigId,
        keyName: app ? `Khóa API - ${app.appName}` : 'Khóa API ZNS',
        apiKeyHash,
        apiKeyEncrypted,
        prefix,
        isActive: true,
      },
    });
    return {
      id: key.id,
      keyName: key.keyName,
      prefix: key.prefix,
      apiKey: plainKey,
      webhookUrl: key.webhookUrl || null,
      webhookDlrUrl: key.webhookDlrUrl || key.webhookUrl || null,
      webhookRatingUrl: key.webhookRatingUrl || null,
      webhookSecret: key.webhookSecret || null,
      appConfigId,
    };
  }
}

/**
 * Get all API keys for a user (with decrypted plain keys)
 */
async function getApiKeys(userId) {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      keyName: true,
      prefix: true,
      apiKeyEncrypted: true,
      webhookUrl: true,
      webhookDlrUrl: true,
      webhookRatingUrl: true,
      webhookSecret: true,
      appConfigId: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      appConfig: {
        select: { id: true, appName: true, isSystem: true, fptAppId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map((k) => {
    let plainKey = null;
    if (k.apiKeyEncrypted) {
      try {
        plainKey = decrypt(k.apiKeyEncrypted);
      } catch (e) {}
    }
    return {
      id: k.id,
      keyName: k.keyName,
      prefix: k.prefix,
      apiKey: plainKey || `${k.prefix}...`,
      webhookUrl: k.webhookUrl || null,
      webhookDlrUrl: k.webhookDlrUrl || k.webhookUrl || null,
      webhookRatingUrl: k.webhookRatingUrl || null,
      webhookSecret: k.webhookSecret || null,
      appConfigId: k.appConfigId,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      appConfig: k.appConfig,
    };
  });
}

/**
 * Update Webhook URLs for a customer's API Key
 */
async function updateCustomerApiKeyWebhook(id, userId, payload) {
  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) throw Object.assign(new Error('Khóa API Key không tồn tại hoặc không thuộc quyền sở hữu'), { statusCode: 404 });

  let webhookDlr = typeof payload === 'object' && payload !== null ? (payload.webhookDlrUrl !== undefined ? payload.webhookDlrUrl : payload.webhookUrl) : payload;
  let webhookRating = typeof payload === 'object' && payload !== null ? payload.webhookRatingUrl : undefined;
  let webhookSecret = typeof payload === 'object' && payload !== null ? payload.webhookSecret : undefined;

  const cleanedDlr = webhookDlr !== undefined ? (webhookDlr?.trim() || null) : undefined;
  const cleanedRating = webhookRating !== undefined ? (webhookRating?.trim() || null) : undefined;
  const cleanedSecret = webhookSecret !== undefined ? (webhookSecret?.trim() || null) : undefined;

  if (cleanedDlr && !/^https?:\/\/.+/i.test(cleanedDlr)) {
    throw Object.assign(new Error('Webhook URL trạng thái gửi tin (DLR) không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'), { statusCode: 400 });
  }
  if (cleanedRating && !/^https?:\/\/.+/i.test(cleanedRating)) {
    throw Object.assign(new Error('Webhook URL đánh giá khách hàng không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'), { statusCode: 400 });
  }

  const updateData = {};
  if (cleanedDlr !== undefined) {
    updateData.webhookDlrUrl = cleanedDlr;
    updateData.webhookUrl = cleanedDlr;
  }
  if (cleanedRating !== undefined) {
    updateData.webhookRatingUrl = cleanedRating;
  }
  if (cleanedSecret !== undefined) {
    updateData.webhookSecret = cleanedSecret;
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      keyName: true,
      prefix: true,
      webhookUrl: true,
      webhookDlrUrl: true,
      webhookRatingUrl: true,
      webhookSecret: true,
      appConfigId: true,
    },
  });

  return updated;
}

/**
 * Admin update Webhook URLs for any API Key
 */
async function adminUpdateApiKeyWebhook(id, payload) {
  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) throw Object.assign(new Error('Khóa API Key không tồn tại'), { statusCode: 404 });

  let webhookDlr = typeof payload === 'object' && payload !== null ? (payload.webhookDlrUrl !== undefined ? payload.webhookDlrUrl : payload.webhookUrl) : payload;
  let webhookRating = typeof payload === 'object' && payload !== null ? payload.webhookRatingUrl : undefined;
  let webhookSecret = typeof payload === 'object' && payload !== null ? payload.webhookSecret : undefined;

  const cleanedDlr = webhookDlr !== undefined ? (webhookDlr?.trim() || null) : undefined;
  const cleanedRating = webhookRating !== undefined ? (webhookRating?.trim() || null) : undefined;
  const cleanedSecret = webhookSecret !== undefined ? (webhookSecret?.trim() || null) : undefined;

  if (cleanedDlr && !/^https?:\/\/.+/i.test(cleanedDlr)) {
    throw Object.assign(new Error('Webhook URL trạng thái gửi tin (DLR) không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'), { statusCode: 400 });
  }
  if (cleanedRating && !/^https?:\/\/.+/i.test(cleanedRating)) {
    throw Object.assign(new Error('Webhook URL đánh giá khách hàng không hợp lệ (phải bắt đầu bằng http:// hoặc https://)'), { statusCode: 400 });
  }

  const updateData = {};
  if (cleanedDlr !== undefined) {
    updateData.webhookDlrUrl = cleanedDlr;
    updateData.webhookUrl = cleanedDlr;
  }
  if (cleanedRating !== undefined) {
    updateData.webhookRatingUrl = cleanedRating;
  }
  if (cleanedSecret !== undefined) {
    updateData.webhookSecret = cleanedSecret;
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      keyName: true,
      prefix: true,
      webhookUrl: true,
      webhookDlrUrl: true,
      webhookRatingUrl: true,
      webhookSecret: true,
      userId: true,
      appConfigId: true,
    },
  });

  return updated;
}

/**
 * Toggle API key active status
 */
async function toggleApiKey(id, userId) {
  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) throw Object.assign(new Error('API Key không tồn tại'), { statusCode: 404 });

  return prisma.apiKey.update({
    where: { id },
    data: { isActive: !key.isActive },
    select: { id: true, keyName: true, prefix: true, isActive: true },
  });
}

/**
 * Delete an API key
 */
async function deleteApiKey(id, userId) {
  const key = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!key) throw Object.assign(new Error('API Key không tồn tại'), { statusCode: 404 });

  return prisma.apiKey.delete({ where: { id } });
}

module.exports = {
  createApiKey,
  getOrCreateApiKeyForApp,
  getOrCreateApiKeyForOA: getOrCreateApiKeyForApp,
  regenerateApiKeyForApp,
  regenerateApiKeyForOA: regenerateApiKeyForApp,
  getApiKeys,
  updateCustomerApiKeyWebhook,
  adminUpdateApiKeyWebhook,
  toggleApiKey,
  deleteApiKey,
};
