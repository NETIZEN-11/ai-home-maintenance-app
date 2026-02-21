const rateLimit = require('express-rate-limit');

// General rate limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests',
    details: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { generalLimiter };
