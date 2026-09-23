const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/database');
const { generateTokens, verifyRefreshToken, blacklistToken } = require('../../middlewares/authJwt');

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const loginInput = email.trim();
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: loginInput, mode: 'insensitive' },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Automatically set secure flag if accessed via HTTPS (domain) or false if HTTP (IP/localhost)
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          companyName: user.companyName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token không được cung cấp' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Tài khoản không hợp lệ' });
    }

    const tokens = generateTokens(user);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
  }
}

/**
 * POST /api/v1/auth/logout
 */
async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await blacklistToken(token);
    }

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Đăng xuất thành công' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        companyName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const { fullName, companyName, phone } = req.body;
    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Họ tên không được để trống' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName: fullName.trim(),
        companyName: companyName ? companyName.trim() : null,
        phone: phone ? phone.trim() : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        companyName: true,
        phone: true,
        role: true,
      },
    });

    res.json({ success: true, data: updated, message: 'Cập nhật hồ sơ thành công' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, refresh, logout, getMe, updateProfile, changePassword };
