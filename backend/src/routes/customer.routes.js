const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authJwt');
const { authorize } = require('../middlewares/authorize');
const customer = require('../controllers/customer/customerController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/plain',
      'application/octet-stream',
    ];
    const ext = (file.originalname || '').toLowerCase();
    const isAllowedExt = ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv');

    if (isAllowedExt || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file định dạng .xlsx, .xls, .csv'));
    }
  },
});

// All customer routes require JWT + CUSTOMER role
router.use(authenticateToken, authorize('CUSTOMER'));

// Dashboard
router.get('/dashboard', customer.dashboard);

// Profile
router.get('/profile', customer.getProfile);
router.put('/profile', customer.updateProfile);
router.post('/change-password', customer.changePassword);

// API Keys
router.get('/api-keys', customer.listApiKeys);
router.post('/api-keys', customer.createApiKey);
router.patch('/api-keys/:id/toggle', customer.toggleApiKey);
router.delete('/api-keys/:id', customer.deleteApiKey);

// App Configs & Templates
router.get('/app-configs', customer.listAppConfigs);
router.get('/app-configs/:id/quota', customer.getAppQuota);
router.get('/app-configs/:appId/templates/:templateId/ratings', customer.getTemplateRatings);
router.get('/app-configs/:appId/templates/:templateId/detail', customer.getTemplateDetail);
router.post('/app-configs/:id/regenerate-key', customer.regenerateAppKey);

// Send message
router.post('/send-message', customer.sendMessage);

// Campaigns
router.get('/campaigns', customer.listCampaigns);
router.get('/campaigns/:id', customer.getCampaign);
router.post('/campaigns', upload.single('file'), customer.createCampaign);

// Messages
router.get('/messages', customer.listMessages);
router.get('/messages/:id', customer.getMessage);

module.exports = router;
