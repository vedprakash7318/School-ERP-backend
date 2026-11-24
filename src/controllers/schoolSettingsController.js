import bcrypt from 'bcryptjs';
import { School, SchoolSubscription, User } from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Get Global School Settings & Branding
export const getSchoolSettings = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const subscription = await SchoolSubscription.findOne({
      school: schoolId,
      status: 'ACTIVE',
    })
      .sort({ endDate: -1 })
      .populate('plan');

    const schoolData = school.toObject();
    schoolData.subscriptions = subscription ? [subscription] : [];

    res.status(200).json({ success: true, data: schoolData });
  } catch (error) {
    next(error);
  }
};

// Update School Settings & Branding (Logo URL/Base64, Name, Phone, Email, Admission Prefix)
export const updateSchoolSettings = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, email, phone, address, city, state, admissionPrefix, logo } = req.body;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name.trim();
    if (email) dataToUpdate.email = email.toLowerCase().trim();
    if (phone) dataToUpdate.phone = phone.trim();
    if (address !== undefined) dataToUpdate.address = address;
    if (city !== undefined) dataToUpdate.city = city;
    if (state !== undefined) dataToUpdate.state = state;
    if (admissionPrefix) dataToUpdate.admissionPrefix = admissionPrefix.trim().toUpperCase();
    if (logo !== undefined) dataToUpdate.logo = logo; // Local upload URL (/uploads/logos/xyz.png) or Base64

    const updated = await School.findByIdAndUpdate(schoolId, dataToUpdate, { new: true });

    res.status(200).json({
      success: true,
      message: 'School branding and profile updated successfully!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Change School Admin / Principal Password
export const changeAdminPassword = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and New password are required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    user.password = await bcrypt.hash(newPassword.trim(), 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully! Please use new password for future logins.',
    });
  } catch (error) {
    next(error);
  }
};

// Get all users under this school (Owner, Principal, Staff)
export const getSchoolUsers = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const users = await User.find({ school: schoolId })
      .select('id name email phone role status createdAt')
      .sort({ role: 1, createdAt: 1 });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// Create a new User under this school (e.g. Owner creates Principal or Staff account)
export const createSchoolUser = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, email, phone, role, password } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email, and Role (PRINCIPAL or STAFF) are required.',
      });
    }

    if (!['PRINCIPAL', 'STAFF'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Only PRINCIPAL and STAFF roles can be created.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this email already exists.',
      });
    }

    const initialPassword = password && password.trim() ? password.trim() : (phone ? phone.trim() : 'school123');
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const newUser = await User.create({
      school: schoolId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      role,
      status: 'ACTIVE',
    });

    res.status(201).json({
      success: true,
      message: `${role === 'PRINCIPAL' ? 'Principal' : 'Staff'} account created successfully! Password: ${initialPassword}`,
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
