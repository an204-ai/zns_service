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
router.post('/customers/:id/assign-system-oa', admin.assignSystemOA);
router.delete('/customers/:id/assign-system-oa/:oaId', admin.unassignSystemOA);
router.post('/customers/:id/private-oa', admin.createCustomerPrivateOA);
router.delete('/customers/:id/private-oa/:oaId', admin.deleteCustomerPrivateOA);
router.post('/customers/:id/oas/:oaId/regenerate-key', admin.regenerateCustomerOAKey);

// OA Config management
router.get('/oa-configs/system', admin.listSystemOAConfigs);
router.post('/oa-configs/system', admin.createSystemOAConfig);
router.get('/oa-configs', admin.listOAConfigs);
router.get('/oa-configs/:id', admin.getOAConfig);
router.get('/oa-configs/:id/quota', admin.getOAQuota);
router.get('/oa-configs/:oaId/templates/:templateId/ratings', admin.getTemplateRatings);
router.get('/oa-configs/:oaId/templates/:templateId/detail', admin.getTemplateDetail);
router.post('/oa-configs', admin.createOAConfig);
router.put('/oa-configs/:id', admin.updateOAConfig);
router.delete('/oa-configs/:id', admin.deleteOAConfig);
router.post('/oa-configs/:id/sync', admin.syncOAConfig);
router.patch('/oa-configs/:id/status', admin.updateOAStatus);

// Templates
router.get('/templates', admin.listTemplates);

// Messages
router.get('/messages', admin.listMessages);
router.get('/messages/:id', admin.getMessage);

// System logs
router.get('/system-logs', admin.getSystemLogs);

module.exports = router;
