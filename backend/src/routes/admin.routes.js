const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authJwt');
const { authorize } = require('../middlewares/authorize');
const admin = require('../controllers/admin/adminController');

// All admin routes require JWT + ADMIN role
router.use(authenticateToken, authorize('ADMIN'));

// Dashboard
router.get('/dashboard', admin.dashboard);

// Customer management
router.get('/customers', admin.listCustomers);
router.get('/customers/:id', admin.getCustomer);
router.post('/customers', admin.createCustomer);
router.patch('/customers/:id/status', admin.updateStatus);
router.post('/customers/:id/reset-password', admin.resetPassword);
router.delete('/customers/:id', admin.deleteCustomer);

// Customer App assignment
router.get('/customers/:id/available-apps', admin.getAvailableAppsForCustomer);
router.post('/customers/:id/assign-app', admin.assignAppToCustomer);
router.delete('/customers/:id/unassign-app/:appId', admin.unassignAppFromCustomer);
router.post('/customers/:id/private-app', admin.createCustomerPrivateApp);
router.delete('/customers/:id/private-app/:appId', admin.deleteCustomerPrivateApp);
router.post('/customers/:id/apps/:appId/regenerate-key', admin.regenerateCustomerAppKey);
router.put('/customers/:id/api-keys/:keyId/webhook', admin.updateCustomerApiKeyWebhook);

// App Config management
router.get('/app-configs/system', admin.listSystemAppConfigs);
router.post('/app-configs/system', admin.createSystemAppConfig);
router.get('/app-configs', admin.listAppConfigs);
router.get('/app-configs/:id', admin.getAppConfig);
router.get('/app-configs/:id/quota', admin.getAppQuota);
router.get('/app-configs/:appId/templates/:templateId/ratings', admin.getTemplateRatings);
router.get('/app-configs/:appId/templates/:templateId/detail', admin.getTemplateDetail);
router.post('/app-configs', admin.createAppConfig);
router.put('/app-configs/:id', admin.updateAppConfig);
router.delete('/app-configs/:id', admin.deleteAppConfig);
router.post('/app-configs/:id/sync', admin.syncAppConfig);
router.patch('/app-configs/:id/status', admin.updateAppStatus);

// Templates
router.get('/templates', admin.listTemplates);

// Messages
router.get('/messages', admin.listMessages);
router.get('/messages/:id', admin.getMessage);

// System logs
router.get('/system-logs', admin.getSystemLogs);

module.exports = router;
