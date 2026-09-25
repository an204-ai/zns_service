const znsService = require('../../services/znsService');
const { prisma } = require('../../config/database');

/** POST /api/v1/zns/send - External API for sending ZNS */
async function send(req, res, next) {
  try {
    const userId = req.user.id;
    const { phone, template_id, template_data, ref_id, callback_url, callback_secret } = req.body;

    if (!phone || !template_id || !template_data) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: phone, template_id, template_data',
      });
    }

    // Find the active App config (using API key's assigned App if present, or user's Apps)
    const activeConfigId = req.appConfigId;
    const appWhere = activeConfigId
      ? { id: activeConfigId, status: 'ACTIVE' }
      : {
          status: 'ACTIVE',
          OR: [
            { userId },
            { isSystem: true, assignments: { some: { userId } } },
          ],
        };

    const template = await prisma.znsTemplate.findFirst({
      where: {
        templateId: template_id,
        status: 'ENABLE',
        fptAppConfig: appWhere,
      },
      include: { fptAppConfig: { select: { id: true } } },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template không tồn tại hoặc không khả dụng' });
    }

    const message = await znsService.queueMessage({
      userId,
      fptAppConfigId: template.fptAppConfig.id,
      templateId: template_id,
      phone,
      templateData: template_data,
      refId: ref_id,
      callbackUrl: callback_url || req.webhookDlrUrl || req.webhookUrl,
      callbackSecret: callback_secret || req.webhookSecret,
    });

    res.status(202).json({
      success: true,
      data: { tracking_id: message.id, status: 'QUEUED' },
    });
  } catch (error) { next(error); }
}

/** GET /api/v1/zns/status/:trackingId */
async function getStatus(req, res, next) {
  try {
    const message = await znsService.getMessageById(req.params.trackingId);
    if (!message || message.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }

    res.json({
      success: true,
      data: {
        tracking_id: message.id,
        phone: message.phone,
        template_id: message.templateId,
        status: message.status,
        message_id: message.messageId,
        error_code: message.errorCode,
        error_message: message.errorMessage,
        sent_at: message.sentAt,
        delivered_at: message.deliveredAt,
      },
    });
  } catch (error) { next(error); }
}

/** GET /api/v1/zns/templates */
async function listTemplates(req, res, next) {
  try {
    const userId = req.user.id;
    // Support filtering by API Key's assigned App config if present
    const activeConfigId = req.appConfigId;
    const appWhere = activeConfigId
      ? { id: activeConfigId, status: 'ACTIVE' }
      : {
          status: 'ACTIVE',
          OR: [
            { userId },
            { isSystem: true, assignments: { some: { userId } } },
          ],
        };

    const templates = await prisma.znsTemplate.findMany({
      where: {
        status: 'ENABLE',
        fptAppConfig: appWhere,
      },
      select: {
        templateId: true,
        templateName: true,
        templateTag: true,
        listParams: true,
        status: true,
        fptAppConfig: { select: { appName: true } },
      },
      orderBy: { templateName: 'asc' },
    });

    res.json({
      success: true,
      data: templates.map(t => ({
        template_id: t.templateId,
        name: t.templateName,
        tag: t.templateTag,
        params: t.listParams,
        status: t.status,
        app_name: t.fptAppConfig?.appName || '',
      })),
    });
  } catch (error) { next(error); }
}

module.exports = { send, getStatus, listTemplates };
