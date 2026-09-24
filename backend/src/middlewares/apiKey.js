const { prisma } = require('../config/database');
const { hashApiKey } = require('../utils/crypto');

/**
 * Authenticate API Key from x-api-key header
 * Used by external systems (CRM, ERP) to call ZNS APIs
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key không được cung cấp. Vui lòng thêm header x-api-key',
    });
  }

  try {
    const apiKeyHash = hashApiKey(apiKey);

    const keyRecord = await prisma.apiKey.findFirst({
      where: { apiKeyHash },
      include: {
        user: {
          select: { id: true, email: true, role: true, status: true },
        },
      },
    });

    if (!keyRecord) {
      return res.status(401).json({ success: false, message: 'API Key không hợp lệ' });
    }

    if (!keyRecord.isActive) {
      return res.status(403).json({ success: false, message: 'API Key đã bị vô hiệu hoá' });
    }

    if (keyRecord.user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá' });
    }

    // Update last used timestamp (non-blocking)
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    req.user = keyRecord.user;
    req.apiKeyId = keyRecord.id;
    req.appConfigId = keyRecord.appConfigId;
    req.webhookUrl = keyRecord.webhookUrl;
    req.webhookDlrUrl = keyRecord.webhookDlrUrl || keyRecord.webhookUrl;
    req.webhookRatingUrl = keyRecord.webhookRatingUrl;
    req.webhookSecret = keyRecord.webhookSecret;
    next();
  } catch (error) {
    console.error('API Key auth error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác thực API Key' });
  }
}

module.exports = { authenticateApiKey };
