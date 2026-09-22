const { prisma } = require('../config/database');
const { generateApiKey, hashApiKey, getApiKeyPrefix } = require('../utils/crypto');

/**
 * Create a new API key for a user (optionally associated with an OA config)
 * Returns the plain API key only once
 */
async function createApiKey(userId, keyName, oaConfigId = null) {
  const plainKey = generateApiKey();
  const apiKeyHash = hashApiKey(plainKey);
  const prefix = getApiKeyPrefix(plainKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      oaConfigId: oaConfigId || null,
      keyName,
      apiKeyHash,
      prefix,
      isActive: true,
    },
    include: {
      oaConfig: {
        select: { id: true, oaName: true, isSystem: true, fptAppId: true },
      },
    },
  });

  return {
    id: apiKey.id,
    keyName: apiKey.keyName,
    prefix: apiKey.prefix,
    oaConfigId: apiKey.oaConfigId,
    oaConfig: apiKey.oaConfig,
    apiKey: plainKey, // Only returned once at creation
    createdAt: apiKey.createdAt,
  };
}

/**
 * Ensure an API key exists for a user and OA config
 * If exists, returns it; if not, creates a new one
 */
async function getOrCreateApiKeyForOA(userId, oaConfigId, keyName = null) {
  let key = await prisma.apiKey.findFirst({
    where: { userId, oaConfigId },
    include: {
      oaConfig: {
        select: { id: true, oaName: true, isSystem: true },
      },
    },
  });

  if (!key) {
    const oa = await prisma.fptOaConfig.findUnique({ where: { id: oaConfigId } });
    const generatedName = keyName || (oa ? `Khóa API - ${oa.oaName}` : 'Khóa API ZNS');
    key = await createApiKey(userId, generatedName, oaConfigId);
    return key;
  }

  return {
    id: key.id,
    keyName: key.keyName,
    prefix: key.prefix,
    oaConfigId: key.oaConfigId,
    oaConfig: key.oaConfig,
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

  const existing = await prisma.apiKey.findFirst({ where: { userId, oaConfigId } });

  if (existing) {
    const updated = await prisma.apiKey.update({
      where: { id: existing.id },
      data: {
        apiKeyHash,
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
      oaConfigId,
    };
  } else {
    const oa = await prisma.fptOaConfig.findUnique({ where: { id: oaConfigId } });
    const key = await prisma.apiKey.create({
      data: {
        userId,
        oaConfigId,
        keyName: oa ? `Khóa API - ${oa.oaName}` : 'Khóa API ZNS',
        apiKeyHash,
        prefix,
        isActive: true,
      },
    });
    return {
      id: key.id,
      keyName: key.keyName,
      prefix: key.prefix,
      apiKey: plainKey,
      oaConfigId,
    };
  }
}

/**
 * Get all API keys for a user (without hash)
 */
async function getApiKeys(userId) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      keyName: true,
      prefix: true,
      oaConfigId: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      oaConfig: {
        select: { id: true, oaName: true, isSystem: true, fptAppId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
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
