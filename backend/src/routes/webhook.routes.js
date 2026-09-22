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

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook DLR error:', error.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
