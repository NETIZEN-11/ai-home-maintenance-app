// Standardized error response format
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
  }
}

const sendError = (res, statusCode, message, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details })
  });
};

const sendSuccess = (res, statusCode, data, message = null) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

module.exports = { AppError, sendError, sendSuccess };
