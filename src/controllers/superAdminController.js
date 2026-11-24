import bcrypt from 'bcryptjs';
import {
  School,
  User,
  AcademicSession,
  SubscriptionPlan,
  SchoolSubscription,
  Student,
  Staff,
  ClassRoom,
} from '../models/index.js';

// Super Admin: List all schools with server-side pagination, search & status filter
export const getAllSchools = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { slug: regex },
        { code: regex },
        { email: regex },
        { phone: regex },
        { city: regex },
      ];
    }

    const total = await School.countDocuments(query);
    const schools = await School.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Populate related metrics for each school
    const schoolsWithDetails = await Promise.all(
      schools.map(async (school) => {
        const [users, subscription, activeSession, studentCount, staffCount, classCount] =
          await Promise.all([
            User.find({
              school: school._id,
              role: { $in: ['PRINCIPAL', 'SCHOOL_ADMIN'] },
            })
              .select('id name email phone status role')
              .lean(),
            SchoolSubscription.findOne({ school: school._id })
              .sort({ createdAt: -1 })
              .populate('plan')
              .lean(),
            AcademicSession.findOne({ school: school._id, isActive: true }).lean(),
            Student.countDocuments({ school: school._id }),
            Staff.countDocuments({ school: school._id }),
            ClassRoom.countDocuments({ school: school._id }),
          ]);

        return {
          ...school,
          id: school._id.toString(),
          users: users.map((u) => ({ ...u, id: u._id.toString() })),
          subscriptions: subscription ? [{ ...subscription, id: subscription._id.toString() }] : [],
          sessions: activeSession ? [{ ...activeSession, id: activeSession._id.toString() }] : [],
          _count: {
            students: studentCount,
            staffMembers: staffCount,
            classes: classCount,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: schoolsWithDetails,
      pagination: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Create a new School, Auto-generate School Owner Account & optional Principal Account
export const createSchool = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      code,
      admissionPrefix,
      email,
      phone,
      logo,
      address,
      city,
      state,
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerPassword,
      adminName,
      adminEmail,
      adminPassword,
      principalName,
      principalEmail,
      principalPhone,
      planId,
    } = req.body;

    if (!name || !slug || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, Slug, Email, and Phone number are required.',
      });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    // Auto-generate school code if not provided (School Code is Optional)
    let schoolCode = code && code.trim() ? code.toUpperCase().trim() : null;
    if (!schoolCode) {
      const initials = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'SCH';
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      schoolCode = `${initials}${randSuffix}`;
    }

    // Check code, slug or email uniqueness
    const uniquenessConditions = [
      { slug: cleanSlug },
      { email: email.toLowerCase().trim() },
    ];
    if (schoolCode) {
      uniquenessConditions.push({ code: schoolCode });
    }

    const existingSchool = await School.findOne({ $or: uniquenessConditions });
    if (existingSchool) {
      return res.status(400).json({
        success: false,
        message: 'A school with this slug, code, or official email already exists.',
      });
    }

    // Determine School Owner credentials
    const finalOwnerEmail = (ownerEmail || adminEmail || email).toLowerCase().trim();
    const existingOwner = await User.findOne({ email: finalOwnerEmail });
    if (existingOwner) {
      return res.status(400).json({
        success: false,
        message: 'A user account with this email already exists.',
      });
    }

    const finalOwnerName = ownerName || adminName || `${name} Owner`;
    const finalOwnerPhone = (ownerPhone || phone).trim();
    const initialOwnerPassword = (ownerPassword && ownerPassword.trim()) || (adminPassword && adminPassword.trim()) || finalOwnerPhone;
    const hashedOwnerPassword = await bcrypt.hash(initialOwnerPassword, 10);

    // Fetch plan details if planId provided
    let plan = null;
    if (planId) {
      plan = await SubscriptionPlan.findById(planId);
    }

    // 1. Create School
    const newSchool = await School.create({
      name: name.trim(),
      slug: cleanSlug,
      code: schoolCode,
      admissionPrefix: admissionPrefix ? admissionPrefix.toUpperCase().trim() : 'DPS',
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      logo: logo || null,
      address: address || '',
      city: city || '',
      state: state || '',
      status: 'ACTIVE',
    });

    // 2. Create School Owner Account (Role: SCHOOL_ADMIN)
    const ownerUser = await User.create({
      name: finalOwnerName,
      email: finalOwnerEmail,
      password: hashedOwnerPassword,
      phone: finalOwnerPhone,
      role: 'SCHOOL_ADMIN', // School Owner / Director / Management
      status: 'ACTIVE',
      school: newSchool._id,
    });

    // 3. Optional: Create Principal Account if specified separately
    let principalUser = null;
    if (principalEmail && principalEmail.toLowerCase().trim() !== finalOwnerEmail) {
      const princEmailClean = principalEmail.toLowerCase().trim();
      const existingPrinc = await User.findOne({ email: princEmailClean });
      if (!existingPrinc) {
        const princPhone = (principalPhone || phone).trim();
        const hashedPrincPassword = await bcrypt.hash(princPhone, 10);
        principalUser = await User.create({
          name: principalName || `${name} Principal`,
          email: princEmailClean,
          password: hashedPrincPassword,
          phone: princPhone,
          role: 'PRINCIPAL', // Principal & Academic Head
          status: 'ACTIVE',
          school: newSchool._id,
        });
      }
    }

    // 4. Create Default Active Academic Session (e.g. 2025-2026)
    const currentYear = new Date().getFullYear();
    await AcademicSession.create({
      school: newSchool._id,
      name: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear + 1}-03-31`),
      isActive: true,
    });

    // 5. Assign subscription if plan specified
    let subscription = null;
    if (plan) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (plan.durationDays || 30));

      subscription = await SchoolSubscription.create({
        school: newSchool._id,
        plan: plan._id,
        startDate,
        endDate,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        amountPaid: plan.price,
        notes: `Initial ${plan.billingCycle} subscription upon creation`,
      });
    }

    res.status(201).json({
      success: true,
      message: `School created successfully! School Owner password is set to: ${initialOwnerPassword}`,
      data: {
        school: newSchool,
        ownerUser: {
          id: ownerUser.id || ownerUser._id,
          name: ownerUser.name,
          email: ownerUser.email,
          phone: ownerUser.phone,
          role: ownerUser.role,
        },
        principalUser: principalUser
          ? {
              id: principalUser.id || principalUser._id,
              name: principalUser.name,
              email: principalUser.email,
              phone: principalUser.phone,
              role: principalUser.role,
            }
          : null,
        initialPassword: initialOwnerPassword,
        subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Toggle School Status (ACTIVE <-> SUSPENDED / BLOCKED)
export const toggleSchoolStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'BLOCKED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const school = await School.findByIdAndUpdate(id, { status }, { new: true });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    await User.updateMany({ school: id }, { status });

    res.status(200).json({
      success: true,
      message: `School has been marked as ${status} successfully`,
      data: school,
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Delete School
export const deleteSchool = async (req, res, next) => {
  try {
    const { id } = req.params;

    await School.findByIdAndDelete(id);
    await Promise.all([
      User.deleteMany({ school: id }),
      AcademicSession.deleteMany({ school: id }),
      SchoolSubscription.deleteMany({ school: id }),
      Student.deleteMany({ school: id }),
      Staff.deleteMany({ school: id }),
      ClassRoom.deleteMany({ school: id }),
    ]);

    res.status(200).json({
      success: true,
      message: 'School and all associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin: Update School Admin credentials
export const updateSchoolAdmin = async (req, res, next) => {
  try {
    const { id } = req.params; // schoolId
    const { name, email, phone, password, status } = req.body;

    const admin = await User.findOne({
      school: id,
      role: { $in: ['PRINCIPAL', 'SCHOOL_ADMIN'] },
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'School admin not found' });
    }

    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase().trim();
    if (phone) admin.phone = phone.trim();
    if (status) admin.status = status;
    if (password && password.trim().length > 0) {
      admin.password = await bcrypt.hash(password.trim(), 10);
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'School admin details updated successfully',
      data: {
        id: admin.id || admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        status: admin.status,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Super Admin Dashboard Metrics
export const getSuperAdminDashboardStats = async (req, res, next) => {
  try {
    const [
      totalSchools,
      activeSchools,
      suspendedSchools,
      totalStudents,
      totalStaff,
      plans,
      activeSubscriptions,
    ] = await Promise.all([
      School.countDocuments(),
      School.countDocuments({ status: 'ACTIVE' }),
      School.countDocuments({ status: { $in: ['SUSPENDED', 'BLOCKED'] } }),
      Student.countDocuments(),
      Staff.countDocuments(),
      SubscriptionPlan.countDocuments(),
      SchoolSubscription.countDocuments({
        status: 'ACTIVE',
        endDate: { $gte: new Date() },
      }),
    ]);

    const recentSchoolsDocs = await School.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentSchools = await Promise.all(
      recentSchoolsDocs.map(async (school) => {
        const [sub, studentCount, staffCount] = await Promise.all([
          SchoolSubscription.findOne({ school: school._id })
            .sort({ createdAt: -1 })
            .populate('plan')
            .lean(),
          Student.countDocuments({ school: school._id }),
          Staff.countDocuments({ school: school._id }),
        ]);

        return {
          ...school,
          id: school._id.toString(),
          subscriptions: sub ? [sub] : [],
          _count: { students: studentCount, staffMembers: staffCount },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalSchools,
        activeSchools,
        suspendedSchools,
        totalStudents,
        totalStaff,
        totalPlans: plans,
        activeSubscriptions,
        recentSchools,
      },
    });
  } catch (error) {
    next(error);
  }
};
