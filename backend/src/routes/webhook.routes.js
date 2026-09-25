const express = require('express');
const router = express.Router();
const znsService = require('../services/znsService');

/**
 * POST /api/v1/webhook/fpt-dlr
 * Receives DLR (Delivery Report) callbacks from FPT ZBS
 */
router.post('/fpt-dlr', async (req, res) => {
  try {
    const { msg_id, type, status, sent_time, received_time, error, error_info } = req.body;

    if (!msg_id) {
      return res.status(400).json({ success: false, message: 'Missing msg_id' });
    }

    const updated = await znsService.handleDLR({
      msgId: msg_id,
      type,
      status,
      sentTime: sent_time,
      receivedTime: received_time,
      error,
      errorInfo: error_info,
    });

    // Emit via WebSocket if available
    const { getIO } = require('../sockets/socketServer');
    const io = getIO();
    if (io && updated) {
      io.to(`user:${updated.userId}`).emit('message:status', {
        messageId: updated.id,
        status: updated.status,
        errorCode: updated.errorCode,
        errorMessage: updated.errorMessage,
        deliveredAt: updated.deliveredAt,
      });

      // Emit campaign update if applicable
      if (updated.campaignId) {
        io.to(`user:${updated.userId}`).emit('campaign:update', {
          campaignId: updated.campaignId,
        });
      }
    }

    // Tự động forward Webhook DLR sang máy chủ khách hàng
    let targetDlrUrl = updated?.callbackUrl;
    let targetSecret = updated?.callbackSecret;

    if (updated?.userId && updated?.fptAppConfigId) {
      const { prisma } = require('../config/database');
      const keyRec = await prisma.apiKey.findFirst({
        where: { userId: updated.userId, appConfigId: updated.fptAppConfigId },
        select: { webhookDlrUrl: true, webhookUrl: true, webhookSecret: true },
      });
      if (!targetDlrUrl) {
        targetDlrUrl = keyRec?.webhookDlrUrl || keyRec?.webhookUrl;
      }
      if (!targetSecret) {
        targetSecret = keyRec?.webhookSecret;
      }
    }

    if (targetDlrUrl) {
      const { getChannel, QUEUES } = require('../config/rabbitmq');
      const channel = getChannel();
      if (channel) {
        channel.sendToQueue(
          QUEUES.ZNS_CALLBACK,
          Buffer.from(JSON.stringify({
            callbackUrl: targetDlrUrl,
            secret: targetSecret || null,
            data: {
              event: 'zns.dlr_status',
              tracking_id: updated.id,
              ref_id: updated.refId,
              phone: updated.phone,
              status: updated.status,
              message_id: msg_id,
              error_code: error || null,
              error_info: error_info || null,
              sent_time: sent_time || null,
              delivered_at: updated.deliveredAt,
            },
          })),
          { persistent: true }
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook DLR error:', error.message);
    res.status(500).json({ success: false });
  }
});

/**
 * POST /api/v1/webhook/fpt-rating
 * Receives Rating & Feedback callbacks from FPT ZBS (Section 8.2)
 */
router.post('/fpt-rating', async (req, res) => {
  try {
    const { msg_id, ref_id, phone, rate, feedbacks, note, time } = req.body;

    if (!msg_id && !ref_id) {
      return res.status(400).json({ success: false, message: 'Missing msg_id or ref_id' });
    }

    const { prisma } = require('../config/database');
    const message = await prisma.message.findFirst({
      where: {
        OR: [
          msg_id ? { messageId: msg_id } : null,
          ref_id ? { refId: ref_id } : null,
          ref_id ? { id: ref_id } : null,
        ].filter(Boolean),
      },
    });

    if (!message) {
      console.warn(`[Rating Webhook] Không tìm thấy tin nhắn: msg_id=${msg_id}, ref_id=${ref_id}`);
      return res.json({ success: true, message: 'Message not found, ignored' });
    }

    // 1. Cập nhật thông tin đánh giá vào CSDL
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        rating: rate !== undefined && rate !== null ? Number(rate) : null,
        ratingFeedbacks: Array.isArray(feedbacks) ? feedbacks : (feedbacks ? [feedbacks] : null),
        ratingNote: note || null,
        ratedAt: time ? new Date(time) : new Date(),
      },
    });

    // 2. Bắn sự kiện thời gian thực qua WebSocket
    const { getIO } = require('../sockets/socketServer');
    const io = getIO();
    if (io) {
      io.to(`user:${message.userId}`).emit('message:rating', {
        messageId: message.id,
        message_id: msg_id,
        phone: phone || message.phone,
        rating: updated.rating,
        ratingFeedbacks: updated.ratingFeedbacks,
        ratingNote: updated.ratingNote,
        ratedAt: updated.ratedAt,
      });
    }

    // Tạm thời chưa forward Webhook đánh giá cho khách (chờ liên hệ FPT bổ sung sau)
    // Dữ liệu đánh giá vẫn được lưu đầy đủ vào CSDL và phát WebSocket cho người dùng nội bộ
    res.json({ success: true, message: 'Rating saved successfully' });
  } catch (error) {
    console.error('Webhook Rating error:', error.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
