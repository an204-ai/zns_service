const customerService = require('../../services/customerService');
const apiKeyService = require('../../services/apiKeyService');
const appConfigService = require('../../services/appConfigService');
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

    const [todayStats, monthStats, dailyStatsRaw, recentMessages, appConfigs] = await Promise.all([
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
          fptAppConfig: { select: { appName: true } },
        },
      }),
      prisma.fptAppConfig.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { userId },
            { isSystem: true, assignments: { some: { userId } } },
          ],
        },
        select: { id: true, appName: true, isSystem: true },
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
        appConfigs,
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

/** PUT /api/v1/customer/api-keys/:id/webhook */
async function updateApiKeyWebhook(req, res, next) {
  try {
    const { webhookUrl, webhookDlrUrl, webhookRatingUrl } = req.body;
    const result = await apiKeyService.updateCustomerApiKeyWebhook(req.params.id, req.user.id, {
      webhookUrl,
      webhookDlrUrl: webhookDlrUrl !== undefined ? webhookDlrUrl : webhookUrl,
      webhookRatingUrl,
    });
    res.json({
      success: true,
      message: 'Cập nhật Webhook URL thành công',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/customer/app-configs */
async function listAppConfigs(req, res, next) {
  try {
    const configs = await prisma.fptAppConfig.findMany({
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

    // Don't expose encrypted secret key; attach dedicated API key for each App
    const sanitized = await Promise.all(configs.map(async (c) => {
      const appTitle = c.appName || 'Ứng dụng Zalo';
      const apiKey = await apiKeyService.getOrCreateApiKeyForApp(req.user.id, c.id, `Khóa API - ${appTitle}`);
      return {
        id: c.id,
        appName: c.appName,
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

/** POST /api/v1/customer/app-configs/:id/regenerate-key */
async function regenerateAppKey(req, res, next) {
  return res.status(403).json({
    success: false,
    message: 'Chức năng cấp lại API Key chỉ được thực hiện bởi Quản trị viên hệ thống. Vui lòng liên hệ Admin để được hỗ trợ.',
  });
}

async function verifyCustomerAppAccess(userId, appConfigId) {
  return prisma.fptAppConfig.findFirst({
    where: {
      id: appConfigId,
      status: 'ACTIVE',
      OR: [
        { userId },
        { isSystem: true, assignments: { some: { userId } } },
      ],
    },
  });
}

/** GET /api/v1/customer/app-configs/:id/quota */
async function getAppQuota(req, res, next) {
  try {
    const app = await verifyCustomerAppAccess(req.user.id, req.params.id);
    if (!app) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Ứng dụng này' });

    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const quota = await appConfigService.getAppQuota(req.params.id, forceRefresh);
    res.json({ success: true, data: quota });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/app-configs/:appId/templates/:templateId/ratings */
async function getTemplateRatings(req, res, next) {
  try {
    const app = await verifyCustomerAppAccess(req.user.id, req.params.appId);
    if (!app) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Ứng dụng này' });

    const { from_time, to_time, page } = req.query;
    const ratings = await appConfigService.getTemplateRatings(req.params.appId, req.params.templateId, {
      fromTime: from_time,
      toTime: to_time,
      page,
    });
    res.json({ success: true, data: ratings });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/app-configs/:appId/templates/:templateId/detail */
async function getTemplateDetail(req, res, next) {
  try {
    const app = await verifyCustomerAppAccess(req.user.id, req.params.appId);
    if (!app) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập Ứng dụng này' });

    const forceRefresh = req.query.refresh === 'true';
    const detail = await appConfigService.getTemplateLiveDetail(req.params.appId, req.params.templateId, forceRefresh);
    res.json({ success: true, data: detail });
  } catch (error) { next(error); }
}

/** POST /api/v1/customer/send-message */
async function sendMessage(req, res, next) {
  try {
    const { fptAppConfigId, templateId, phone, templateData, refId, callbackUrl } = req.body;

    if (!fptAppConfigId || !templateId || !phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các trường bắt buộc' });
    }

    const app = await verifyCustomerAppAccess(req.user.id, fptAppConfigId);
    if (!app) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền sử dụng Ứng dụng này' });
    }

    const message = await znsService.queueMessage({
      userId: req.user.id,
      fptAppConfigId,
      templateId: Number(templateId),
      phone,
      templateData: templateData || {},
      refId,
      callbackUrl,
    });

    res.status(202).json({
      success: true,
      data: { trackingId: message.id, status: message.status },
      message: 'Đã đưa tin nhắn vào hàng đợi gửi thành công',
    });
  } catch (error) { next(error); }
}

/** POST /api/v1/customer/campaigns */
async function createCampaign(req, res, next) {
  try {
    const { name, fptAppConfigId, templateId } = req.body;
    if (!name || !fptAppConfigId || !templateId) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chiến dịch, ứng dụng và mẫu tin' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên file danh sách người nhận (.xlsx, .xls, .csv)' });
    }

    const app = await verifyCustomerAppAccess(req.user.id, fptAppConfigId);
    if (!app) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền sử dụng Ứng dụng này' });
    }

    let rows = [];
    const originalName = (req.file.originalname || '').toLowerCase();

    if (originalName.endsWith('.csv')) {
      const csvContent = req.file.buffer.toString('utf-8');
      const workbook = XLSX.read(csvContent, { type: 'string', raw: false });
      const firstSheet = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
    } else {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheet = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
    }

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'File danh sách trống hoặc không đúng định dạng' });
    }

    const campaign = await campaignService.createCampaignFromExcel({
      userId: req.user.id,
      name,
      fptAppConfigId,
      templateId: Number(templateId),
      rows,
    });

    res.status(201).json({ success: true, data: campaign, message: 'Tạo chiến dịch gửi tin thành công!' });
  } catch (error) { next(error); }
}

/** GET /api/v1/customer/campaigns */
async function listCampaigns(req, res, next) {
  try {
    const { page = 1, limit = 15 } = req.query;
    const result = await campaignService.getCampaigns({
      userId: req.user.id,
      page: +page,
      limit: +limit,
    });
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
    const { status, phone, templateId, fptAppConfigId, hasRating, rating, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const result = await znsService.getMessages({
      userId: req.user.id, status, phone, templateId: templateId ? +templateId : undefined,
      fptAppConfigId, hasRating, rating: rating ? +rating : undefined, fromDate, toDate, page: +page, limit: +limit
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
  dashboard,
  getProfile,
  updateProfile,
  changePassword,
  listApiKeys,
  createApiKey,
  toggleApiKey,
  deleteApiKey,
  updateApiKeyWebhook,
  listAppConfigs,
  regenerateAppKey,
  sendMessage,
  getAppQuota,
  getTemplateRatings,
  getTemplateDetail,
  createCampaign,
  listCampaigns,
  getCampaign,
  listMessages,
  getMessage,
};
