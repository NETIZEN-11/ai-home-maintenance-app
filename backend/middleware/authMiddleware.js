const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/errorHandler');

// User cache to reduce database queries
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Not authorized', 'No token provided. Please login again.');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check cache first
      const cached = userCache.get(decoded.id);
      if (cached && cached.expiresAt > Date.now()) {
        req.user = cached.user;
        return next();
      }

      // Fetch from database
      const user = await User.findById(decoded.id).select('-password').lean();
      
      if (!user) {
        return sendError(res, 401, 'Not authorized', 'User not found. Please login again.');
      }

      // Cache the user
      userCache.set(decoded.id, {
        user,
        expiresAt: Date.now() + CACHE_TTL
      });

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return sendError(res, 401, 'Not authorized', 'Invalid or expired token. Please login again.');
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendError(res, 500, 'Server error', error.message);
  }
};

module.exports = { protect };
