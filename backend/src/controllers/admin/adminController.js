const customerService = require('../../services/customerService');
const appConfigService = require('../../services/appConfigService');
const znsService = require('../../services/znsService');
const { prisma } = require('../../config/database');

/** GET /api/v1/admin/customers */
async function listCustomers(req, res, next) {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const result = await customerService.getCustomers({ search, status, page: +page, limit: +limit });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/customers/:id */
async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Khách hàng không tồn tại' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers */
async function createCustomer(req, res, next) {
  try {
    const { email, password, fullName, companyName, phone, appType, systemAppId, appName, fptAppId, fptSecretKey } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    }
    const customer = await customerService.createCustomer({
      email,
      password,
      fullName,
      companyName,
      phone,
      appType,
      systemAppId,
      appName: appName?.trim(),
      fptAppId,
      fptSecretKey,
    });
    const message = customer.appError
      ? `Tạo khách hàng thành công, nhưng cấu hình ứng dụng chưa kết nối được: ${customer.appError}`
      : customer.appConfig
      ? 'Tạo khách hàng và kết nối ứng dụng thành công!'
      : 'Tạo khách hàng thành công!';

    res.status(201).json({ success: true, data: customer, message });
  } catch (error) { next(error); }
}

/** PATCH /api/v1/admin/customers/:id/status */
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const result = await customerService.updateCustomerStatus(req.params.id, status);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers/:id/reset-password */
async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    await customerService.resetCustomerPassword(req.params.id, newPassword);
    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/app-configs */
async function listAppConfigs(req, res, next) {
  try {
    const { userId, status, isSystem, type, search, page = 1, limit = 50 } = req.query;
    const isSystemBool = isSystem !== undefined ? isSystem === 'true' : undefined;
    const result = await appConfigService.getAllAppConfigs({
      userId,
      status,
      isSystem: isSystemBool,
      type,
      search,
      page: +page,
      limit: +limit,
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/app-configs/system */
async function listSystemAppConfigs(req, res, next) {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const result = await appConfigService.getSystemAppConfigs({ status, page: +page, limit: +limit });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/app-configs/system */
async function createSystemAppConfig(req, res, next) {
  try {
    const { appName, fptAppId, fptSecretKey } = req.body;
    const finalName = appName?.trim();
    if (!finalName || !fptAppId || !fptSecretKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin ứng dụng hệ thống' });
    }
    const config = await appConfigService.createAppConfig({
      userId: req.user.id,
      appName: finalName,
      fptAppId: fptAppId.trim(),
      fptSecretKey: fptSecretKey.trim(),
      isSystem: true,
    });
    const message = config.connectionWarning
      ? `Thêm ứng dụng Hệ thống thành công! (Lưu ý: Chưa thể đồng bộ ngay từ FPT do IP mạng chưa mở Whitelist: ${config.connectionWarning})`
      : 'Tạo ứng dụng Hệ thống thành công';
    res.status(201).json({ success: true, data: config, message });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/customers/:id/available-apps */
async function getAvailableAppsForCustomer(req, res, next) {
  try {
    const data = await appConfigService.getAvailableAppsForCustomer(req.params.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers/:id/assign-app */
async function assignAppToCustomer(req, res, next) {
  try {
    const targetId = req.body.appConfigId;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ứng dụng cần gán' });
    }
    const result = await appConfigService.assignAppToCustomer({ userId: req.params.id, appConfigId: targetId });
    res.json({ success: true, data: result, message: 'Gán ứng dụng cho khách hàng thành công' });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/customers/:id/unassign-app/:appId */
async function unassignAppFromCustomer(req, res, next) {
  try {
    await appConfigService.unassignAppFromCustomer({ userId: req.params.id, appConfigId: req.params.appId });
    res.json({ success: true, message: 'Đã hủy gán ứng dụng khỏi khách hàng' });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/app-configs/:id */
async function getAppConfig(req, res, next) {
  try {
    const config = await appConfigService.getAppConfigById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Cấu hình ứng dụng không tồn tại' });
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/app-configs */
async function createAppConfig(req, res, next) {
  try {
    const { userId, appName, fptAppId, fptSecretKey, isSystem } = req.body;
    const finalName = appName?.trim();
    if (!finalName || !fptAppId || !fptSecretKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const isSys = isSystem === true || isSystem === 'true';
    const config = await appConfigService.createAppConfig({
      userId: isSys ? null : (userId || null),
      appName: finalName,
      fptAppId: fptAppId.trim(),
      fptSecretKey: fptSecretKey.trim(),
      isSystem: isSys,
    });
    const message = config.connectionWarning
      ? `Thêm ứng dụng thành công! (Lưu ý: Chưa thể đồng bộ ngay từ FPT: ${config.connectionWarning})`
      : 'Thêm ứng dụng thành công';
    res.status(201).json({ success: true, data: config, message });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/app-configs/:id/sync */
async function syncAppConfig(req, res, next) {
  try {
    const result = await appConfigService.resyncAppConfig(req.params.id);
    res.json({ success: true, data: result, message: 'Đồng bộ thành công' });
  } catch (error) { next(error); }
}

/** PATCH /api/v1/admin/app-configs/:id/status */
async function updateAppStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const result = await appConfigService.updateAppStatus(req.params.id, status);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/templates */
async function listTemplates(req, res, next) {
  try {
    const { appConfigId, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (appConfigId) where.fptAppConfigId = appConfigId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.znsTemplate.findMany({
        where,
        include: { fptAppConfig: { select: { id: true, appName: true } } },
        orderBy: { templateName: 'asc' },
        skip: (+page - 1) * +limit,
        take: +limit,
      }),
      prisma.znsTemplate.count({ where }),
    ]);

    res.json({ success: true, data, total, page: +page, totalPages: Math.ceil(total / +limit) });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/messages */
async function listMessages(req, res, next) {
  try {
    const { userId, status, phone, templateId, fptAppConfigId, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const result = await znsService.getMessages({
      userId, status, phone, templateId: templateId ? +templateId : undefined,
      fptAppConfigId, fromDate, toDate, page: +page, limit: +limit
    });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/messages/:id */
async function getMessage(req, res, next) {
  try {
    const message = await znsService.getMessageById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    res.json({ success: true, data: message });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/dashboard */
async function dashboard(req, res, next) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCustomers, activeCustomers, todayStats, dailyStats, recentMessages] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE' } }),
      znsService.getMessageStats({ fromDate: today.toISOString() }),
      znsService.getDailyStats({ days: 30 }),
      prisma.message.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, companyName: true } },
          fptAppConfig: { select: { appName: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        todayStats,
        dailyStats,
        recentMessages,
      },
    });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/system-logs */
async function getSystemLogs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [data, total] = await Promise.all([
      prisma.systemLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (+page - 1) * +limit,
        take: +limit,
      }),
      prisma.systemLog.count(),
    ]);
    res.json({ success: true, data, total, page: +page, totalPages: Math.ceil(total / +limit) });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/customers/:id */
async function deleteCustomer(req, res, next) {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    res.json({ success: true, data: result, message: 'Đã xóa tài khoản khách hàng thành công' });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers/:id/private-app */
async function createCustomerPrivateApp(req, res, next) {
  try {
    const { appName, fptAppId, fptSecretKey } = req.body;
    if (!fptAppId || !fptSecretKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập App ID và Secret Key của FPT' });
    }
    const finalName = appName?.trim();
    const app = await customerService.createCustomerPrivateApp(req.params.id, {
      appName: finalName,
      fptAppId: fptAppId.trim(),
      fptSecretKey: fptSecretKey.trim(),
    });
    const message = app.connectionWarning
      ? `Thêm ứng dụng liên kết riêng cho khách hàng thành công! (Lưu ý: ${app.connectionWarning})`
      : 'Thêm ứng dụng liên kết riêng cho khách hàng thành công';
    res.status(201).json({ success: true, data: app, message });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/customers/:id/private-app/:appId */
async function deleteCustomerPrivateApp(req, res, next) {
  try {
    await customerService.deleteCustomerPrivateApp(req.params.id, req.params.appId);
    res.json({ success: true, message: 'Đã xóa ứng dụng liên kết riêng khỏi khách hàng' });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers/:id/apps/:appId/regenerate-key */
async function regenerateCustomerAppKey(req, res, next) {
  try {
    const newKey = await customerService.regenerateAppKey(req.params.id, req.params.appId);
    res.json({ success: true, data: newKey, message: 'Đã cấp lại API Key ngẫu nhiên mới cho ứng dụng' });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/app-configs/:id */
async function deleteAppConfig(req, res, next) {
  try {
    await appConfigService.deleteAppConfig(req.params.id);
    res.json({ success: true, message: 'Đã xóa ứng dụng liên kết thành công' });
  } catch (error) { next(error); }
}

/** PUT /api/v1/admin/app-configs/:id */
async function updateAppConfig(req, res, next) {
  try {
    const { appName, fptAppId, fptSecretKey, status } = req.body;
    const config = await appConfigService.updateAppConfig(req.params.id, {
      appName,
      fptAppId,
      fptSecretKey,
      status,
    });
    res.json({ success: true, message: 'Cập nhật ứng dụng liên kết thành công', data: config });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/app-configs/:id/quota */
async function getAppQuota(req, res, next) {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const quota = await appConfigService.getAppQuota(req.params.id, forceRefresh);
    res.json({ success: true, data: quota });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/app-configs/:appId/templates/:templateId/ratings */
async function getTemplateRatings(req, res, next) {
  try {
    const { from_time, to_time, page } = req.query;
    const ratings = await appConfigService.getTemplateRatings(req.params.appId, req.params.templateId, {
      fromTime: from_time,
      toTime: to_time,
      page,
    });
    res.json({ success: true, data: ratings });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/app-configs/:appId/templates/:templateId/detail */
async function getTemplateDetail(req, res, next) {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const detail = await appConfigService.getTemplateLiveDetail(req.params.appId, req.params.templateId, forceRefresh);
    res.json({ success: true, data: detail });
  } catch (error) { next(error); }
}

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateStatus,
  resetPassword,
  deleteCustomer,
  createCustomerPrivateApp,
  deleteCustomerPrivateApp,
  regenerateCustomerAppKey,
  listAppConfigs,
  getAppConfig,
  createAppConfig,
  syncAppConfig,
  updateAppStatus,
  deleteAppConfig,
  updateAppConfig,
  getAppQuota,
  getTemplateRatings,
  getTemplateDetail,
  listSystemAppConfigs,
  createSystemAppConfig,
  getAvailableAppsForCustomer,
  assignAppToCustomer,
  unassignAppFromCustomer,
  listTemplates,
  listMessages,
  getMessage,
  dashboard,
  getSystemLogs,
};
