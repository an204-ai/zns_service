const express = require('express');
const router = express.Router();
const { login, refresh, logout, getMe, updateProfile, changePassword } = require('../controllers/auth/authController');
const { authenticateToken } = require('../middlewares/authJwt');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
