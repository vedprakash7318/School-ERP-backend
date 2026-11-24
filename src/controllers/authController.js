import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, SchoolSubscription } from '../models/index.js';

const getRoleTitle = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator';
    case 'SCHOOL_ADMIN':
      return 'School Owner / Director';
    case 'PRINCIPAL':
      return 'Principal & Academic Head';
    case 'STAFF':
      return 'Teaching Staff';
    default:
      return role;
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('school');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'Your account is blocked. Please contact support.' });
    }

    if (user.school && user.school.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'Your school is currently blocked by Super Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Determine subscription validity for school admins
    let subscriptionInfo = null;
    let isSubscriptionActive = true;

    if ((user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') && user.school) {
      const activeSub = await SchoolSubscription.findOne({
        school: user.school._id,
        status: 'ACTIVE',
      })
        .sort({ endDate: -1 })
        .populate('plan');

      if (!activeSub || new Date(activeSub.endDate) < new Date()) {
        isSubscriptionActive = false;
      }
      subscriptionInfo = activeSub || null;
    }

    const token = jwt.sign(
      {
        id: user.id || user._id,
        email: user.email,
        role: user.role,
        schoolId: user.school ? (user.school.id || user.school._id) : null,
      },
      process.env.JWT_SECRET || 'super_secret_school_erp_jwt_key_2026_!@#',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleTitle: getRoleTitle(user.role),
        phone: user.phone,
        status: user.status,
        school: user.school
          ? {
              id: user.school.id || user.school._id,
              name: user.school.name,
              code: user.school.code,
              email: user.school.email,
              phone: user.school.phone,
              status: user.school.status,
            }
          : null,
        subscription: subscriptionInfo,
        isSubscriptionActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleTitle: getRoleTitle(user.role),
        phone: user.phone,
        status: user.status,
        school: user.school
          ? {
              id: user.school.id || user.school._id,
              name: user.school.name,
              code: user.school.code,
              email: user.school.email,
              phone: user.school.phone,
              status: user.school.status,
            }
          : null,
        subscription: req.subscription || null,
        isSubscriptionActive: !req.isSubscriptionExpired,
      },
    });
  } catch (error) {
    next(error);
  }
};
