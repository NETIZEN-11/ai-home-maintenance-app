require('dotenv').config({ override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const logger = require('./middleware/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sendError } = require('./utils/errorHandler');

const authRoutes = require('./routes/authRoutes');
const applianceRoutes = require('./routes/applianceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Environment validation
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error(' Missing required environment variables: MONGO_URI, JWT_SECRET');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error(' JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

// Warn about Gemini API key but don't exit
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-') || process.env.GEMINI_API_KEY.includes('Demo')) {
  console.warn('WARNING: Gemini API key not configured - AI features will use mock responses');
  console.warn('Get your API key from: https://makersuite.google.com/app/apikey');
}

// CORS configuration - allow all origins in development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8081',
  'http://10.0.2.2:5000', // Android emulator
  'http://127.0.0.1:8081',
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/, // Local network IPs
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/, // Private network IPs
  // Render deployment domains
  /^https:\/\/.*\.onrender\.com$/,
  /\.render\.com$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Compression
app.use(compression());

// Logger middleware
app.use(logger);

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(30000);
  next();
});

// Rate limiter
app.use(generalLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  sendError(res, 404, 'Route not found', `${req.method} ${req.path} does not exist`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  
  if (err.name === 'ValidationError') {
    return sendError(res, 400, 'Validation error', err.message);
  }
  
  if (err.name === 'CastError') {
    return sendError(res, 400, 'Invalid ID format', err.message);
  }
  
  if (err.code === 11000) {
    return sendError(res, 400, 'Duplicate field', 'This value already exists');
  }
  
  sendError(res, 500, 'Internal server error', process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message);
});

// Database connection with retry logic
const connectDB = async (attempt = 1) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true
    });
    console.log('MongoDB connected');
  } catch (error) {
    if (attempt < 5) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying connection in ${delay}ms (attempt ${attempt}/5)...`);
      setTimeout(() => connectDB(attempt + 1), delay);
    } else {
      console.error('MongoDB connection failed after 5 attempts');
      process.exit(1);
    }
  }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
