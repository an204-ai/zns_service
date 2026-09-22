const { prisma } = require('../config/database');
const { getChannel, QUEUES } = require('../config/rabbitmq');
const { decrypt } = require('../utils/crypto');
const fptAdapter = require('../services/fptAdapter');
const axios = require('axios');

/**
 * Start the ZNS Worker consumer
 */
async function startWorker() {
  const channel = getChannel();
  if (!channel) {
    console.error('❌ Cannot start worker - RabbitMQ channel not available');
    return;
  }

  console.log('🔄 ZNS Worker started - waiting for messages...');

  // Consume ZNS send queue
  channel.consume(QUEUES.ZNS_SEND, async (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch (e) {
      console.error('Invalid message payload:', e.message);
      channel.ack(msg);
      return;
    }

    const { messageId, oaConfigId, phone, templateId, templateData, refId, callbackUrl } = payload;

    try {
      // Get FPT credentials
      const oaConfig = await prisma.fptOaConfig.findUnique({ where: { id: oaConfigId } });
      if (!oaConfig || oaConfig.status !== 'ACTIVE') {
        throw new Error('OA config inactive or not found');
      }

      const secretKey = decrypt(oaConfig.fptSecretKeyEncrypted);

      // Call FPT API
      const result = await fptAdapter.sendMessage({
        appId: oaConfig.fptAppId,
        secretKey,
        phone,
        templateId,
        templateData,
        refId,
      });

      if (result.code === 1 && result.data?.message_id) {
        // Update message as SENT
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'SENT',
            fptMessageId: result.data.message_id,
            sentAt: new Date(),
          },
        });

        // Update campaign sent count
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (message?.campaignId) {
          await prisma.campaign.update({
            where: { id: message.campaignId },
            data: { sentCount: { increment: 1 } },
          });
        }

        console.log(`✅ Message ${messageId} sent -> FPT ID: ${result.data.message_id}`);
      } else {
        // FPT returned error
        throw new Error(`FPT error: code=${result.code}, message=${result.message}`);
      }

      channel.ack(msg);
    } catch (error) {
      console.error(`❌ Message ${messageId} failed:`, error.message);

      // Check retry count
      const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);

      if (retryCount < 3) {
        // Retry with delay
        const delay = Math.pow(3, retryCount) * 1000; // 1s, 3s, 9s
        setTimeout(() => {
          channel.publish('', QUEUES.ZNS_SEND, msg.content, {
            persistent: true,
            headers: { 'x-retry-count': retryCount + 1 },
          });
        }, delay);

        await prisma.message.update({
          where: { id: messageId },
          data: { retryCount: retryCount + 1 },
        });

        console.log(`🔄 Message ${messageId} retry ${retryCount + 1}/3 in ${delay}ms`);
      } else {
        // Max retries reached - mark as failed
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'FAILED',
            errorCode: 'MAX_RETRY',
            errorMessage: error.message,
          },
        });

        // Update campaign failed count
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (message?.campaignId) {
          await prisma.campaign.update({
            where: { id: message.campaignId },
            data: { failedCount: { increment: 1 } },
          });
        }

        console.error(`💀 Message ${messageId} moved to DLQ after 3 retries`);
      }

      channel.ack(msg);
    }
  });

  // Consume callback queue
  channel.consume(QUEUES.ZNS_CALLBACK, async (msg) => {
    if (!msg) return;

    try {
      const { callbackUrl, data } = JSON.parse(msg.content.toString());
      await axios.post(callbackUrl, data, { timeout: 10000 });
      console.log(`📤 Callback sent to ${callbackUrl}`);
    } catch (error) {
      console.error('Callback delivery error:', error.message);
    }

    channel.ack(msg);
  });
}

module.exports = { startWorker };
