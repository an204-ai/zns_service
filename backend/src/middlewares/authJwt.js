const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { redis } = require('../config/redis');

/**
 * Authenticate JWT access token from Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token xác thực không được cung cấp' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // Check if token is blacklisted
    redis.get(`bl:${token}`).then((blacklisted) => {
      if (blacklisted) {
        return res.status(401).json({ success: false, message: 'Token đã bị thu hồi' });
      }
      req.user = decoded;
      next();
    }).catch(() => {
      req.user = decoded;
      next();
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ success: false, message: 'Token không hợp lệ' });
  }
}

/**
 * Generate access and refresh tokens
 */
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/**
 * Blacklist a token (on logout)
 */
async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.set(`bl:${token}`, '1', 'EX', ttl);
      }
    }
  } catch (error) {
    // Silently fail - token may already be expired
  }
}

module.exports = {
  authenticateToken,
  generateTokens,
  verifyRefreshToken,
  blacklistToken,
};
