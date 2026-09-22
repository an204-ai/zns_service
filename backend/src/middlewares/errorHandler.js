/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại trong hệ thống',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy dữ liệu',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
    : err.message;

  res.status(statusCode).json({ success: false, message });
}

module.exports = { errorHandler };
