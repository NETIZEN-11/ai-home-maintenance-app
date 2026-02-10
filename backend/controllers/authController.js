const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/errorHandler');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return sendError(res, 400, 'Registration failed', 'All fields are required');
    }

    if (password.length < 6) {
      return sendError(res, 400, 'Registration failed', 'Password must be at least 6 characters');
    }

    // Check if user exists (optimized with select)
    const userExists = await User.findOne({ email }).select('_id').lean();
    if (userExists) {
      return sendError(res, 400, 'Registration failed', 'User already exists with this email');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate token
    const token = generateToken(user._id);

    sendSuccess(res, 201, {
      _id: user._id,
      name: user.name,
      email: user.email,
      token
    }, 'User registered successfully');
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 500, 'Registration failed', error.message);
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return sendError(res, 400, 'Login failed', 'Email and password are required');
    }

    // Find user (optimized with select)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Login failed', 'Invalid email or password');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Login failed', 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user._id);

    sendSuccess(res, 200, {
      _id: user._id,
      name: user.name,
      email: user.email,
      token
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'Login failed', error.message);
  }
};

module.exports = {
  register,
  login
};
