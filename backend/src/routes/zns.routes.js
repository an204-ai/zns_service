const express = require('express');
const router = express.Router();
const { authenticateApiKey } = require('../middlewares/apiKey');
const { apiKeyLimiter } = require('../middlewares/rateLimiter');
const zns = require('../controllers/zns/znsController');

// All ZNS API routes require API Key auth + rate limiting
router.use(authenticateApiKey, apiKeyLimiter);

router.post('/send', zns.send);
router.get('/status/:trackingId', zns.getStatus);
router.get('/templates', zns.listTemplates);

module.exports = router;
