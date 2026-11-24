import jwt from 'jsonwebtoken';
import { User, SchoolSubscription } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_school_erp_jwt_key_2026_!@#');

    const user = await User.findById(decoded.id).populate('school');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or token invalid.' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact Super Admin.' });
    }

    // If user belongs to a school, check school status
    if (user.school) {
      if (user.school.status === 'BLOCKED') {
        return res.status(403).json({ success: false, message: 'Your school account is blocked. Contact support.' });
      }

      // Check active subscription for school admin / principal
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') {
        const activeSub = await SchoolSubscription.findOne({
          school: user.school._id,
          status: 'ACTIVE',
        })
          .sort({ endDate: -1 })
          .populate('plan');

        const isExpired = activeSub ? new Date(activeSub.endDate) < new Date() : true;
        req.subscription = activeSub;
        req.isSubscriptionExpired = isExpired;
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires role [${roles.join(', ')}]`,
      });
    }
    next();
  };
};

export const checkActiveSubscription = (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }
  if (req.isSubscriptionExpired) {
    return res.status(402).json({
      success: false,
      message: 'School subscription has expired or is inactive. Please renew subscription.',
    });
  }
  next();
};
