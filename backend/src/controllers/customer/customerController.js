const customerService = require('../../services/customerService');
const apiKeyService = require('../../services/apiKeyService');
const oaConfigService = require('../../services/oaConfigService');
const znsService = require('../../services/znsService');
const campaignService = require('../../services/campaignService');
const { prisma } = require('../../config/database');
const XLSX = require('xlsx');

/** GET /api/v1/customer/dashboard */
async function dashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayStats, monthStats, dailyStatsRaw, recentMessages, oaConfigs] = await Promise.all([
      znsService.getMessageStats({ userId, fromDate: startOfToday.toISOString() }),
      znsService.getMessageStats({ userId, fromDate: startOfMonth.toISOString() }),
      znsService.getDailyStats({ userId, days: 8 }),
      prisma.message.findMany({
        where: { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, templateId: true, status: true,
          errorCode: true, createdAt: true, deliveredAt: true,
          fptOaConfig: { select: { oaName: true } },
        },
      }),
      prisma.fptOaConfig.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { userId },
            { isSystem: true, assignments: { some: { userId } } },
          ],
        },
        select: { id: true, oaName: true, isSystem: true },
      }),
    ]);

    // Format chart data (DD/MM)
    const chartData = (dailyStatsRaw || []).map(day => {
      const parts = day.date.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : day.date;
      return {
        date: formattedDate,
        rawDate: day.date,
        transactions: day.success,
        requests: day.total,
      };
    });

    res.json({
      success: true,
      data: {
        todayStats: {
          transactions: todayStats.success || 0,
          requests: todayStats.total || 0,
        },
        monthStats: {
          transactions: monthStats.success || 0,
          requests: monthStats.total || 0,
        },
        chartData,
        dailyStats: dailyStatsRaw,
        recentMessages,
        oaConfigs,
      },
    });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/profile */
async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, fullName: true, companyName: true, phone: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
}

/** PUT /api/v1/customer/profile */
async function updateProfile(req, res, next) {
  try {
    const { fullName, companyName, phone } = req.body;
    const result = await customerService.updateProfile(req.user.id, { fullName, companyName, phone });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/** POST /api/v1/customer/change-password */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    await customerService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/api-keys */
async function listApiKeys(req, res, next) {
  try {
    let keys = await apiKeyService.getApiKeys(req.user.id);
    if (keys.length === 0) {
      await apiKeyService.createApiKey(req.user.id, 'API Key mặc định');
      keys = await apiKeyService.getApiKeys(req.user.id);
    }
    res.json({ success: true, data: keys });
  } catch (error) { next(error); }
}

/** POST /api/v1/customer/api-keys */
async function createApiKey(req, res, next) {
  return res.status(403).json({
    success: false,
    message: 'Chức năng tạo API Key chỉ được thực hiện bởi Quản trị viên hệ thống. Vui lòng liên hệ Admin để được hỗ trợ.',
  });
}

/** PATCH /api/v1/customer/api-keys/:id/toggle */
async function toggleApiKey(req, res, next) {
  return res.status(403).json({
    success: false,
    message: 'Chức năng thay đổi trạng thái API Key chỉ được thực hiện bởi Quản trị viên hệ thống.',
  });
}

/** DELETE /api/v1/customer/api-keys/:id */
async function deleteApiKey(req, res, next) {
  return res.status(403).json({
    success: false,
    message: 'Chức năng xoá API Key chỉ được thực hiện bởi Quản trị viên hệ thống.',
  });
}

/** GET /api/v1/customer/oa-configs */
async function listOAConfigs(req, res, next) {
  try {
    const configs = await prisma.fptOaConfig.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { userId: req.user.id },
          { isSystem: true, assignments: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        templates: {
          where: { status: 'ENABLE' },
          select: {
            id: true, templateId: true, templateName: true, templateTag: true,
            templateQuality: true, listParams: true, previewUrl: true, status: true,
          },
          orderBy: { templateName: 'asc' },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Don't expose encrypted secret key; attach dedicated API key for each OA
    const sanitized = await Promise.all(configs.map(async (c) => {
      const apiKey = await apiKeyService.getOrCreateApiKeyForOA(req.user.id, c.id, `Khóa API - ${c.oaName}`);
      return {
        id: c.id,
        oaName: c.oaName,
        oaId: c.oaId,
        isSystem: c.isSystem,
        oaInfo: c.oaInfo,
        status: c.status,
        templates: c.templates,
        syncedAt: c.syncedAt,
        apiKey,
      };
    }));

    res.json({ success: true, data: sanitized });
  } catch (error) { next(error); }
}

/** POST /api/v1/customer/oa-configs/:id/regenerate-key */
async function regenerateOAKey(req, res, next) {
  return res.status(403).json({
    success: false,
    message: 'Chức năng cấp lại API Key chỉ được thực hiện bởi Quản trị viên hệ thống. Vui lòng liên hệ Admin để được hỗ trợ.',
  });
}

async function verifyCustomerOAAccess(userId, oaConfigId) {
  return prisma.fptOaConfig.findFirst({
    where: {
      id: oaConfigId,
      status: 'ACTIVE',
      OR: [
        { userId },
        { isSystem: true, assignments: { some: { userId } } },
      ],
    },
  });
}

/** GET /api/v1/customer/oa-configs/:id/quota */
async function getOAQuota(req, res, next) {
  try {
    const oa = await verifyCustomerOAAccess(req.user.id, req.params.id);
    if (!oa) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Zalo OA này' });

    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const quota = await oaConfigService.getOAQuota(req.params.id, forceRefresh);
    res.json({ success: true, data: quota });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/oa-configs/:oaId/templates/:templateId/ratings */
async function getTemplateRatings(req, res, next) {
  try {
    const oa = await verifyCustomerOAAccess(req.user.id, req.params.oaId);
    if (!oa) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Zalo OA này' });

    const { from_time, to_time, page } = req.query;
    const ratings = await oaConfigService.getTemplateRatings(req.params.oaId, req.params.templateId, {
      fromTime: from_time,
      toTime: to_time,
      page,
    });
    res.json({ success: true, data: ratings });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/oa-configs/:oaId/templates/:templateId/detail */
async function getTemplateDetail(req, res, next) {
  try {
    const oa = await verifyCustomerOAAccess(req.user.id, req.params.oaId);
    if (!oa) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Zalo OA này' });

    const detail = await oaConfigService.getTemplateLiveDetail(req.params.oaId, req.params.templateId);
    res.json({ success: true, data: detail });
  } catch (error) { next(error); }
}


/** POST /api/v1/customer/send-message */
async function sendMessage(req, res, next) {
  try {
    const { fptOaConfigId, templateId, phone, templateData, refId, callbackUrl } = req.body;

    if (!fptOaConfigId || !templateId || !phone || !templateData) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const message = await znsService.queueMessage({
      userId: req.user.id,
      fptOaConfigId,
      templateId,
      phone,
      templateData,
      refId,
      callbackUrl,
    });

    res.status(202).json({
      success: true,
      data: { trackingId: message.id, status: message.status },
    });
  } catch (error) { next(error); }
}

/** POST /api/v1/customer/campaigns */
async function createCampaign(req, res, next) {
  try {
    const { name, fptOaConfigId, templateId } = req.body;
    const file = req.file;

    if (!name || !fptOaConfigId || !templateId || !file) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin và tải lên file Excel' });
    }

    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'File Excel không có dữ liệu' });
    }

    // First column must be 'phone'
    if (!rows[0].phone && !rows[0].Phone && !rows[0].PHONE) {
      return res.status(400).json({ success: false, message: 'Cột đầu tiên trong file phải là "phone" (số điện thoại)' });
    }

    // Build records
    const records = rows.map(row => {
      const phone = row.phone || row.Phone || row.PHONE;
      const templateData = { ...row };
      delete templateData.phone;
      delete templateData.Phone;
      delete templateData.PHONE;
      return { phone: String(phone), templateData };
    });

    // Create campaign
    const campaign = await campaignService.createCampaign({
      userId: req.user.id,
      name,
      fptOaConfigId,
      templateId: +templateId,
      totalMessages: records.length,
      source: 'EXCEL',
    });

    // Update status to PROCESSING
    await campaignService.updateCampaignStatus(campaign.id, 'PROCESSING');

    // Queue batch messages
    await znsService.queueBatchMessages({
      userId: req.user.id,
      fptOaConfigId,
      templateId: +templateId,
      records,
      campaignId: campaign.id,
    });

    res.status(202).json({
      success: true,
      data: {
        campaignId: campaign.id,
        totalMessages: records.length,
        status: 'PROCESSING',
      },
    });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/campaigns */
async function listCampaigns(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await campaignService.getCampaigns({ userId: req.user.id, status, page: +page, limit: +limit });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/campaigns/:id */
async function getCampaign(req, res, next) {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign || campaign.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/messages */
async function listMessages(req, res, next) {
  try {
    const { status, phone, templateId, fptOaConfigId, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const result = await znsService.getMessages({
      userId: req.user.id, status, phone, templateId: templateId ? +templateId : undefined,
      fptOaConfigId, fromDate, toDate, page: +page, limit: +limit
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/messages/:id */
async function getMessage(req, res, next) {
  try {
    const message = await znsService.getMessageById(req.params.id);
    if (!message || message.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }
    res.json({ success: true, data: message });
  } catch (error) { next(error); }
}

module.exports = {
  dashboard, getProfile, updateProfile, changePassword,
  listApiKeys, createApiKey, toggleApiKey, deleteApiKey,
  listOAConfigs, regenerateOAKey, sendMessage,
  getOAQuota, getTemplateRatings, getTemplateDetail,
  createCampaign, listCampaigns, getCampaign,
  listMessages, getMessage,
};
