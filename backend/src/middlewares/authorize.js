/**
 * Role-based authorization middleware
 * Usage: authorize('ADMIN') or authorize('ADMIN', 'CUSTOMER')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập chức năng này' });
    }

    next();
  };
}

module.exports = { authorize };
