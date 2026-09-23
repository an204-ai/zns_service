const axios = require('axios');
const { env } = require('../config/env');
const { redis } = require('../config/redis');

const fptClient = axios.create({
  baseURL: env.FPT_ZBS_BASE_URL,
  timeout: 3000,
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

  let response;
  try {
    response = await fptClient.get('/open-api/api/official-accounts', {
      headers: {
        'app-id': appId,
        'secret-key': secretKey,
      },
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ FPT';
    const error = new Error(`Không thể kết nối đến máy chủ FPT ZBS: ${detail}`);
    error.statusCode = 502;
    throw error;
  }

  if (!response.data) {
    const error = new Error('Máy chủ FPT không phản hồi thông tin OA');
    error.statusCode = 502;
    throw error;
  }

  if (response.data.status !== 1) {
    const error = new Error(response.data.message || 'App ID hoặc Secret Key không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  if (response.data.data) {
    await redis.set(cacheKey, JSON.stringify(response.data.data), 'EX', 3600);
  }

  return response.data.data;
}

/**
 * Get list of ZNS templates from FPT
 */
async function getTemplates(appId, secretKey, page = 1) {
  let response;
  try {
    response = await fptClient.get(`/open-api/api/zns-templates?page=${page}`, {
      headers: {
        'app-id': appId,
        'secret-key': secretKey,
      },
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ FPT';
    const error = new Error(`Không thể kết nối đến máy chủ FPT ZBS: ${detail}`);
    error.statusCode = 502;
    throw error;
  }

  if (!response.data) {
    const error = new Error('Máy chủ FPT không phản hồi danh sách mẫu tin');
    error.statusCode = 502;
    throw error;
  }

  if (response.data.status !== 1) {
    const error = new Error(response.data.message || 'FPT trả về lỗi khi lấy danh sách mẫu tin');
    error.statusCode = 400;
    throw error;
  }

  return response.data;
}

/**
 * Get template detail from FPT
 */
async function getTemplateDetail(appId, secretKey, templateId) {
  let response;
  try {
    response = await fptClient.get(`/open-api/api/zns-templates/${templateId}`, {
      headers: {
        'app-id': appId,
        'secret-key': secretKey,
      },
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ FPT';
    const error = new Error(`Không thể kết nối đến máy chủ FPT ZBS: ${detail}`);
    error.statusCode = 502;
    throw error;
  }

  if (!response.data) {
    const error = new Error('Máy chủ FPT không phản hồi chi tiết mẫu tin');
    error.statusCode = 502;
    throw error;
  }

  const res = response.data;
  const isSuccess =
    res.status === 1 ||
    res.status === 0 ||
    res.error === 0 ||
    res.code === 0 ||
    res.code === 1 ||
    (res.message && res.message.toLowerCase() === 'success');

  if (!isSuccess) {
    const error = new Error(res.message || `FPT trả về lỗi khi lấy thông tin mẫu tin #${templateId}`);
    error.statusCode = 400;
    throw error;
  }

  return response.data;
}

/**
 * Get ZNS sending quota from FPT (strictly real data, no mock fallback)
 */
async function getQuota(appId, secretKey, forceRefresh = false) {
  const cacheKey = `fpt:quota:${appId}`;
  if (!forceRefresh) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  let response;
  try {
    response = await fptClient.get('/open-api/api/official-accounts/quota', {
      headers: {
        'app-id': appId,
        'secret-key': secretKey,
      },
    });
  } catch (err) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const detail = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ FPT';
    const error = new Error(`Không thể kết nối đến máy chủ FPT ZBS: ${detail}`);
    error.statusCode = 502;
    throw error;
  }

  if (!response.data) {
    const error = new Error('Máy chủ FPT không trả về kết quả hạn mức');
    error.statusCode = 502;
    throw error;
  }

  if (response.data.status !== 1) {
    const error = new Error(response.data.message || 'FPT trả về lỗi khi tra cứu hạn mức gửi tin');
    error.statusCode = 400;
    throw error;
  }

  if (!response.data.data) {
    const error = new Error('Dữ liệu hạn mức từ FPT bị trống');
    error.statusCode = 400;
    throw error;
  }

  // Cache valid quota data for 5 minutes
  await redis.set(cacheKey, JSON.stringify(response.data.data), 'EX', 300);
  return response.data.data;
}

/**
 * Get customer ratings from FPT
 */
async function getRatings(appId, secretKey, { templateId, fromTime, toTime, page = 1 }) {
  const cacheKey = `fpt:rating:${appId}:${templateId}:${fromTime}:${toTime}:${page}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let response;
  try {
    response = await fptClient.post('/open-api/api/official-accounts/rating', {
      template_id: Number(templateId),
      from_time: fromTime,
      to_time: toTime,
      page: Number(page) || 1,
    }, {
      headers: {
        'app-id': appId,
        'secret-key': secretKey,
      },
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ FPT';
    const error = new Error(`Không thể kết nối đến máy chủ FPT ZBS: ${detail}`);
    error.statusCode = 502;
    throw error;
  }

  if (!response.data) {
    const error = new Error('Máy chủ FPT không phản hồi dữ liệu đánh giá');
    error.statusCode = 502;
    throw error;
  }

  const res = response.data;
  const isSuccess =
    res.status === 1 ||
    res.status === 0 ||
    res.error === 0 ||
    res.code === 0 ||
    res.code === 1 ||
    (res.message && res.message.toLowerCase() === 'success');

  if (!isSuccess) {
    const error = new Error(res.message || 'FPT trả về lỗi khi tra cứu đánh giá mẫu tin');
    error.statusCode = 400;
    throw error;
  }

  await redis.set(cacheKey, JSON.stringify(res), 'EX', 120); // 2 minutes cache
  return res;
}

module.exports = {
  sendMessage,
  getOAInfo,
  getQuota,
  getTemplates,
  getTemplateDetail,
  getRatings,
};
