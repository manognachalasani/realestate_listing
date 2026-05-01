const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Token extraction
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized — no token provided');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted (optional enhancement)
    // For advanced security, you could check a blacklist here
    
    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.status(401);
      throw new Error('User belonging to this token no longer exists');
    }

    if (!req.user.isActive) {
      res.status(401);
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    // Check if password was changed after token was issued
    if (req.user.passwordChangedAt && decoded.iat) {
      const passwordChangedTimestamp = parseInt(
        req.user.passwordChangedAt.getTime() / 1000,
        10
      );
      
      if (passwordChangedTimestamp > decoded.iat) {
        res.status(401);
        throw new Error('Password recently changed. Please log in again.');
      }
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      res.status(401);
      throw new Error('Invalid token. Please log in again.');
    }
    if (err.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error('Your token has expired. Please log in again.');
    }
    // Re-throw other errors (like the ones we explicitly created)
    throw err;
  }
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      // Check if user is active even for optional auth
      if (req.user && !req.user.isActive) {
        req.user = undefined; // Treat deactivated accounts as unauthenticated
      }
    } catch (e) {
      // Silently ignore invalid token in optional auth
      // Log it for monitoring purposes
      console.debug('Optional auth: Invalid token encountered');
    }
  }
  
  next();
});

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Authentication required for this action');
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Access denied. Required role: ${roles.join(' or ')}`);
    }
    
    next();
  };
};

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// Optional: Add refresh token functionality
const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

module.exports = { 
  protect, 
  optionalAuth, 
  requireRole, 
  generateToken,
  generateRefreshToken 
};