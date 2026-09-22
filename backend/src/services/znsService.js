const { prisma } = require('../config/database');
const { getChannel, EXCHANGES } = require('../config/rabbitmq');
const { v4: uuidv4 } = require('uuid');

/**
 * Queue a single ZNS message for sending
 */
async function queueMessage({ userId, fptOaConfigId, templateId, phone, templateData, refId, callbackUrl, campaignId }) {
  // Validate template exists and is active
  const template = await prisma.znsTemplate.findFirst({
    where: {
      fptOaConfigId,
      templateId,
      status: 'ENABLE',
    },
  });

  if (!template) {
    throw Object.assign(new Error('Template không tồn tại hoặc đã bị khoá'), { statusCode: 400 });
  }

  // Validate OA config (owned by user OR active system OA assigned/shared)
  const oaConfig = await prisma.fptOaConfig.findFirst({
    where: {
      id: fptOaConfigId,
      status: 'ACTIVE',
      OR: [
        { userId },
        { isSystem: true, assignments: { some: { userId } } },
      ],
    },
  });

  if (!oaConfig) {
    throw Object.assign(new Error('Cấu hình OA không hợp lệ hoặc đã bị vô hiệu hoá'), { statusCode: 400 });
  }

  // Create message record
  const message = await prisma.message.create({
    data: {
      userId,
      fptOaConfigId,
      templateId,
      phone,
      templateData,
      refId: refId || uuidv4(),
      callbackUrl,
      campaignId,
      status: 'QUEUED',
    },
  });

  // Push to RabbitMQ
  const channel = getChannel();
  if (channel) {
    channel.publish(
      EXCHANGES.ZNS,
      'zns_send',
      Buffer.from(JSON.stringify({
        messageId: message.id,
        oaConfigId: fptOaConfigId,
        phone,
        templateId,
        templateData,
        refId: message.refId,
        callbackUrl,
      })),
      { persistent: true }
    );
  }

  return message;
}

/**
 * Queue multiple messages (batch) for a campaign
 */
async function queueBatchMessages({ userId, fptOaConfigId, templateId, records, campaignId }) {
  const messages = [];

  for (const record of records) {
    try {
      const msg = await queueMessage({
        userId,
        fptOaConfigId,
        templateId,
        phone: record.phone,
        templateData: record.templateData,
        refId: record.refId,
        campaignId,
      });
      messages.push(msg);
    } catch (error) {
      // Log failed records but continue
      messages.push({ phone: record.phone, error: error.message });
    }
  }

  return messages;
}

/**
 * Handle DLR webhook from FPT
 */
async function handleDLR({ msgId, type, status, sentTime, receivedTime, error, errorInfo }) {
  const message = await prisma.message.findFirst({
    where: { fptMessageId: msgId },
  });

  if (!message) {
    console.warn(`DLR for unknown message: ${msgId}`);
    return null;
  }

  const newStatus = status === 1 ? 'SUCCESS' : 'FAILED';

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: {
      status: newStatus,
      errorCode: error || null,
      errorMessage: errorInfo || null,
      deliveredAt: receivedTime ? new Date(receivedTime) : new Date(),
    },
  });

  // Update campaign counters if part of a campaign
  if (message.campaignId) {
    const incrementField = newStatus === 'SUCCESS' ? 'successCount' : 'failedCount';
    await prisma.campaign.update({
      where: { id: message.campaignId },
      data: {
        [incrementField]: { increment: 1 },
      },
    });

    // Check if campaign is completed
    const campaign = await prisma.campaign.findUnique({ where: { id: message.campaignId } });
    if (campaign && (campaign.successCount + campaign.failedCount >= campaign.totalMessages)) {
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { status: 'COMPLETED' },
      });
    }
  }

  // Queue callback if customer provided callback_url
  if (message.callbackUrl) {
    const channel = getChannel();
    if (channel) {
      const { QUEUES } = require('../config/rabbitmq');
      channel.sendToQueue(
        QUEUES.ZNS_CALLBACK,
        Buffer.from(JSON.stringify({
          callbackUrl: message.callbackUrl,
          data: {
            tracking_id: message.id,
            phone: message.phone,
            status: newStatus,
            fpt_message_id: msgId,
            error_code: error || null,
            error_info: errorInfo || null,
            delivered_at: updated.deliveredAt,
          },
        })),
        { persistent: true }
      );
    }
  }

  return updated;
}

/**
 * Get messages with filtering and pagination
 */
async function getMessages({ userId, status, phone, templateId, fptOaConfigId, campaignId, fromDate, toDate, page = 1, limit = 20 }) {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (phone) where.phone = { contains: phone };
  if (templateId) where.templateId = templateId;
  if (fptOaConfigId) where.fptOaConfigId = fptOaConfigId;
  if (campaignId) where.campaignId = campaignId;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  const [data, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, companyName: true } },
        fptOaConfig: { select: { id: true, oaName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get message by ID
 */
async function getMessageById(id) {
  return prisma.message.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, companyName: true, email: true } },
      fptOaConfig: { select: { id: true, oaName: true, oaId: true } },
      campaign: { select: { id: true, name: true } },
    },
  });
}

/**
 * Get message stats
 */
async function getMessageStats({ userId, fromDate, toDate }) {
  const where = {};
  if (userId) where.userId = userId;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  const [total, success, failed, queued] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.count({ where: { ...where, status: 'SUCCESS' } }),
    prisma.message.count({ where: { ...where, status: 'FAILED' } }),
    prisma.message.count({ where: { ...where, status: 'QUEUED' } }),
  ]);

  return { total, success, failed, queued, sent: total - queued };
}

/**
 * Get daily message stats for charts
 */
async function getDailyStats({ userId, days = 8 }) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));
  fromDate.setHours(0, 0, 0, 0);

  const where = { createdAt: { gte: fromDate } };
  if (userId) where.userId = userId;

  const messages = await prisma.message.findMany({
    where,
    select: { createdAt: true, status: true },
  });

  // Group by date
  const dailyMap = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const key = date.toISOString().split('T')[0];
    dailyMap[key] = { date: key, total: 0, success: 0, failed: 0 };
  }

  for (const msg of messages) {
    const key = msg.createdAt.toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].total++;
      if (msg.status === 'SUCCESS') dailyMap[key].success++;
      if (msg.status === 'FAILED') dailyMap[key].failed++;
    }
  }

  return Object.values(dailyMap);
}

module.exports = {
  queueMessage,
  queueBatchMessages,
  handleDLR,
  getMessages,
  getMessageById,
  getMessageStats,
  getDailyStats,
};
