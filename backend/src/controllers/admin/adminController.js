const customerService = require('../../services/customerService');
const oaConfigService = require('../../services/oaConfigService');
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
    const { email, password, fullName, companyName, phone, oaType, systemOaId, oaName, fptAppId, fptSecretKey } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    }
    const customer = await customerService.createCustomer({
      email,
      password,
      fullName,
      companyName,
      phone,
      oaType,
      systemOaId,
      oaName,
      fptAppId,
      fptSecretKey,
    });
    const message = customer.oaError
      ? `Tạo khách hàng thành công, nhưng cấu hình OA chưa kết nối được: ${customer.oaError}`
      : customer.oaConfig
      ? 'Tạo khách hàng và kết nối OA Zalo thành công!'
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

/** GET /api/v1/admin/oa-configs */
async function listOAConfigs(req, res, next) {
  try {
    const { userId, status, isSystem, page = 1, limit = 20 } = req.query;
    const isSystemBool = isSystem !== undefined ? isSystem === 'true' : undefined;
    const result = await oaConfigService.getAllOAConfigs({ userId, status, isSystem: isSystemBool, page: +page, limit: +limit });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/oa-configs/system */
async function listSystemOAConfigs(req, res, next) {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const result = await oaConfigService.getSystemOAConfigs({ status, page: +page, limit: +limit });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/oa-configs/system */
async function createSystemOAConfig(req, res, next) {
  try {
    const { oaName, fptAppId, fptSecretKey } = req.body;
    if (!oaName || !fptAppId || !fptSecretKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin OA hệ thống' });
    }
    const config = await oaConfigService.createOAConfig({
      userId: req.user.id,
      oaName: oaName.trim(),
      fptAppId: fptAppId.trim(),
      fptSecretKey: fptSecretKey.trim(),
      isSystem: true,
    });
    const message = config.connectionWarning
      ? `Thêm OA Hệ thống thành công! (Lưu ý: Chưa thể đồng bộ ngay từ FPT do IP mạng chưa mở Whitelist: ${config.connectionWarning})`
      : 'Tạo OA Hệ thống thành công';
    res.status(201).json({ success: true, data: config, message });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers/:id/assign-system-oa */
async function assignSystemOA(req, res, next) {
  try {
    const targetId = req.body.appConfigId || req.body.oaConfigId;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn Ứng dụng hệ thống cần gán' });
    }
    const result = await oaConfigService.assignSystemOA({ userId: req.params.id, appConfigId: targetId });
    res.json({ success: true, data: result, message: 'Gán Ứng dụng hệ thống cho khách hàng thành công' });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/customers/:id/assign-system-oa/:oaId */
async function unassignSystemOA(req, res, next) {
  try {
    await oaConfigService.unassignSystemOA({ userId: req.params.id, appConfigId: req.params.oaId });
    res.json({ success: true, message: 'Đã hủy gán Ứng dụng hệ thống khỏi khách hàng' });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/oa-configs/:id */
async function getOAConfig(req, res, next) {
  try {
    const config = await oaConfigService.getOAConfigById(req.params.id);
    if (!config) return res.status(404).json({ success: false, message: 'Cấu hình OA không tồn tại' });
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/oa-configs */
async function createOAConfig(req, res, next) {
  try {
    const { userId, oaName, fptAppId, fptSecretKey } = req.body;
    if (!userId || !oaName || !fptAppId || !fptSecretKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    const config = await oaConfigService.createOAConfig({
      userId,
      oaName: oaName.trim(),
      fptAppId: fptAppId.trim(),
      fptSecretKey: fptSecretKey.trim(),
    });
    const message = config.connectionWarning
      ? `Tạo cấu hình OA thành công! (Lưu ý: ${config.connectionWarning})`
      : 'Tạo cấu hình OA thành công';
    res.status(201).json({ success: true, data: config, message });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/oa-configs/:id/sync */
async function syncOAConfig(req, res, next) {
  try {
    const result = await oaConfigService.resyncOAConfig(req.params.id);
    res.json({ success: true, data: result, message: 'Đồng bộ thành công' });
  } catch (error) { next(error); }
}

/** PATCH /api/v1/admin/oa-configs/:id/status */
async function updateOAStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }
    const result = await oaConfigService.updateOAStatus(req.params.id, status);
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
        include: { fptAppConfig: { select: { id: true, oaName: true } } },
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
          fptAppConfig: { select: { oaName: true } },
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

/** POST /api/v1/admin/customers/:id/private-oa */
async function createCustomerPrivateOA(req, res, next) {
  try {
    const { oaName, fptAppId, fptSecretKey } = req.body;
    if (!fptAppId || !fptSecretKey) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập App ID và Secret Key của FPT' });
    }
    const oa = await customerService.createCustomerPrivateOA(req.params.id, {
      oaName: oaName?.trim(),
      fptAppId: fptAppId.trim(),
      fptSecretKey: fptSecretKey.trim(),
    });
    const message = oa.connectionWarning
      ? `Thêm ứng dụng liên kết riêng cho khách hàng thành công! (Lưu ý: ${oa.connectionWarning})`
      : 'Thêm ứng dụng liên kết riêng cho khách hàng thành công';
    res.status(201).json({ success: true, data: oa, message });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/customers/:id/private-oa/:oaId */
async function deleteCustomerPrivateOA(req, res, next) {
  try {
    await customerService.deleteCustomerPrivateOA(req.params.id, req.params.oaId);
    res.json({ success: true, message: 'Đã xóa ứng dụng liên kết riêng khỏi khách hàng' });
  } catch (error) { next(error); }
}

/** POST /api/v1/admin/customers/:id/oas/:oaId/regenerate-key */
async function regenerateCustomerOAKey(req, res, next) {
  try {
    const newKey = await customerService.regenerateOAKey(req.params.id, req.params.oaId);
    res.json({ success: true, data: newKey, message: 'Đã cấp lại API Key ngẫu nhiên mới cho ứng dụng' });
  } catch (error) { next(error); }
}

/** DELETE /api/v1/admin/oa-configs/:id */
async function deleteOAConfig(req, res, next) {
  try {
    await oaConfigService.deleteOAConfig(req.params.id);
    res.json({ success: true, message: 'Đã xóa ứng dụng liên kết thành công' });
  } catch (error) { next(error); }
}

async function updateOAConfig(req, res, next) {
  try {
    const { oaName, fptAppId, fptSecretKey, status } = req.body;
    const config = await oaConfigService.updateOAConfig(req.params.id, { oaName, fptAppId, fptSecretKey, status });
    res.json({ success: true, message: 'Cập nhật ứng dụng liên kết thành công', data: config });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/oa-configs/:id/quota */
async function getOAQuota(req, res, next) {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const quota = await oaConfigService.getOAQuota(req.params.id, forceRefresh);
    res.json({ success: true, data: quota });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/oa-configs/:oaId/templates/:templateId/ratings */
async function getTemplateRatings(req, res, next) {
  try {
    const { from_time, to_time, page } = req.query;
    const ratings = await oaConfigService.getTemplateRatings(req.params.oaId, req.params.templateId, {
      fromTime: from_time,
      toTime: to_time,
      page,
    });
    res.json({ success: true, data: ratings });
  } catch (error) { next(error); }
}

/** GET /api/v1/admin/oa-configs/:oaId/templates/:templateId/detail */
async function getTemplateDetail(req, res, next) {
  try {
    const detail = await oaConfigService.getTemplateLiveDetail(req.params.oaId, req.params.templateId);
    res.json({ success: true, data: detail });
  } catch (error) { next(error); }
}

module.exports = {
  listCustomers, getCustomer, createCustomer, updateStatus, resetPassword, deleteCustomer,
  createCustomerPrivateOA, deleteCustomerPrivateOA, regenerateCustomerOAKey,
  listOAConfigs, getOAConfig, createOAConfig, syncOAConfig, updateOAStatus, deleteOAConfig, updateOAConfig,
  getOAQuota, getTemplateRatings, getTemplateDetail,
  listSystemOAConfigs, createSystemOAConfig, assignSystemOA, unassignSystemOA,
  listTemplates, listMessages, getMessage, dashboard, getSystemLogs,
};

