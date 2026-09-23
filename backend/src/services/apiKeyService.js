const { prisma } = require('../config/database');
const { generateApiKey, hashApiKey, getApiKeyPrefix, encrypt, decrypt } = require('../utils/crypto');

/**
 * Create a new API key for a user (optionally associated with an OA config)
 * Saves encrypted key so user can view/copy anytime
 */
async function createApiKey(userId, keyName, oaConfigId = null) {
  const plainKey = generateApiKey();
  const apiKeyHash = hashApiKey(plainKey);
  const prefix = getApiKeyPrefix(plainKey);
  const apiKeyEncrypted = encrypt(plainKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      appConfigId: oaConfigId || null,
      keyName,
      apiKeyHash,
      apiKeyEncrypted,
      prefix,
      isActive: true,
    },
    include: {
      appConfig: {
        select: { id: true, oaName: true, isSystem: true, fptAppId: true },
      },
    },
  });

  return {
    id: apiKey.id,
    keyName: apiKey.keyName,
    prefix: apiKey.prefix,
    appConfigId: apiKey.appConfigId,
    oaConfigId: apiKey.appConfigId,
    appConfig: apiKey.appConfig,
    oaConfig: apiKey.appConfig,
    apiKey: plainKey,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Ensure an API key exists for a user and OA config
 * If exists, returns it with decrypted key; if not, creates a new one
 */
async function getOrCreateApiKeyForOA(userId, oaConfigId, keyName = null) {
  let key = await prisma.apiKey.findFirst({
    where: { userId, appConfigId: oaConfigId },
    include: {
      appConfig: {
        select: { id: true, oaName: true, isSystem: true },
      },
    },
  });

  if (!key) {
    const appModel = prisma.fptAppConfig || prisma.fptOaConfig;
    const oa = await appModel.findUnique({ where: { id: oaConfigId } });
    const generatedName = keyName || (oa ? `Khóa API - ${oa.oaName}` : 'Khóa API ZNS');
    key = await createApiKey(userId, generatedName, oaConfigId);
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
    appConfigId: key.appConfigId,
    oaConfigId: key.appConfigId,
    appConfig: key.appConfig,
    oaConfig: key.appConfig,
    isActive: key.isActive,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
  };
}

/**
 * Regenerate API key for an OA config
 */
async function regenerateApiKeyForOA(userId, oaConfigId) {
  const plainKey = generateApiKey();
  const apiKeyHash = hashApiKey(plainKey);
  const prefix = getApiKeyPrefix(plainKey);
  const apiKeyEncrypted = encrypt(plainKey);

  const existing = await prisma.apiKey.findFirst({ where: { userId, appConfigId: oaConfigId } });

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
      appConfigId: oaConfigId,
      oaConfigId,
    };
  } else {
    const appModel = prisma.fptAppConfig || prisma.fptOaConfig;
    const oa = await appModel.findUnique({ where: { id: oaConfigId } });
    const key = await prisma.apiKey.create({
      data: {
        userId,
        appConfigId: oaConfigId,
        keyName: oa ? `Khóa API - ${oa.oaName}` : 'Khóa API ZNS',
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
      appConfigId: oaConfigId,
      oaConfigId,
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
      appConfigId: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      appConfig: {
        select: { id: true, oaName: true, isSystem: true, fptAppId: true },
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
      appConfigId: k.appConfigId,
      oaConfigId: k.appConfigId,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      appConfig: k.appConfig,
      oaConfig: k.appConfig,
    };
  });
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
  getOrCreateApiKeyForOA,
  regenerateApiKeyForOA,
  getApiKeys,
  toggleApiKey,
  deleteApiKey,
};
