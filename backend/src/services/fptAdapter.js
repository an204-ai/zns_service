const axios = require('axios');
const { env } = require('../config/env');
const { redis } = require('../config/redis');

const fptClient = axios.create({
  baseURL: env.FPT_ZBS_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Send a ZNS message via FPT ZBS API
 */
async function sendMessage({ appId, secretKey, phone, templateId, templateData, refId, callbackUrl }) {
  const body = {
    phone,
    template_id: templateId,
    template_data: templateData,
  };
  if (refId) body.ref_id = refId;
  if (callbackUrl) body.callback_url = callbackUrl;

  const response = await fptClient.post('/api/send-message', body, {
    headers: {
      'app-id': appId,
      'secret-key': secretKey,
    },
  });

  return response.data;
}

/**
 * Get OA information from FPT
 */
async function getOAInfo(appId, secretKey) {
  const cacheKey = `fpt:oa:${appId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fptClient.get('/open-api/api/official-accounts', {
    headers: {
      'app-id': appId,
      'secret-key': secretKey,
    },
  });

  if (response.data.status === 1) {
    await redis.set(cacheKey, JSON.stringify(response.data.data), 'EX', 3600);
  }

  return response.data.data;
}

/**
 * Get list of ZNS templates from FPT
 */
async function getTemplates(appId, secretKey, page = 1) {
  const response = await fptClient.get(`/open-api/api/zns-templates?page=${page}`, {
    headers: {
      'app-id': appId,
      'secret-key': secretKey,
    },
  });

  return response.data;
}

/**
 * Get template detail from FPT
 */
async function getTemplateDetail(appId, secretKey, templateId) {
  const response = await fptClient.get(`/open-api/api/zns-templates/${templateId}`, {
    headers: {
      'app-id': appId,
      'secret-key': secretKey,
    },
  });

  return response.data;
}

/**
 * Get OA quota from FPT
 */
async function getQuota(appId, secretKey) {
  const cacheKey = `fpt:quota:${appId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fptClient.get('/open-api/api/official-accounts/quota', {
    headers: {
      'app-id': appId,
      'secret-key': secretKey,
    },
  });

  if (response.data.status === 1) {
    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(response.data.data), 'EX', 300);
  }

  return response.data.data;
}

/**
 * Get customer ratings from FPT
 */
async function getRatings(appId, secretKey, { templateId, fromTime, toTime, page }) {
  const response = await fptClient.post('/open-api/api/official-accounts/rating', {
    template_id: templateId,
    from_time: fromTime,
    to_time: toTime,
    page,
  }, {
    headers: {
      'app-id': appId,
      'secret-key': secretKey,
    },
  });

  return response.data;
}

module.exports = {
  sendMessage,
  getOAInfo,
  getTemplates,
  getTemplateDetail,
  getQuota,
  getRatings,
};
