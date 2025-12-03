import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// backend/middleware/auth.js - Add logging
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('No token provided for route:', req.originalUrl);
      return res.status(401).json({ 
        message: 'You are not logged in. Please log in to get access.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('Auth check for user:', decoded.userId, 'route:', req.originalUrl);

    // Check if user still exists
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      console.log('User not found for token');
      return res.status(401).json({ 
        message: 'The user belonging to this token no longer exists.' 
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token. Please log in again.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Your token has expired. Please log in again.' 
      });
    }

    res.status(500).json({ 
      message: 'Authentication error',
      error: error.message 
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};