import bcrypt from 'bcryptjs';
import {
  Staff,
  StaffApplication,
  User,
  Department,
  Designation,
  SubjectAssignment,
  ClassRoom,
} from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// 1. Get Approved Staff list with server-side pagination, search & status filter
export const getStaffList = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (status) query.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { employeeCode: regex },
        { email: regex },
        { phone: regex },
        { designation: regex },
        { department: regex },
      ];
    }

    const total = await Staff.countDocuments(query);
    const staffDocs = await Staff.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const staff = await Promise.all(
      staffDocs.map(async (member) => {
        const [assignments, classesTaught] = await Promise.all([
          SubjectAssignment.find({ staff: member._id })
            .populate('classRoom', 'name section')
            .populate('subject', 'name code')
            .lean(),
          ClassRoom.find({ classTeacher: member._id }).select('name section').lean(),
        ]);

        return {
          ...member,
          id: member._id.toString(),
          assignments: assignments.map((a) => ({ ...a, id: a._id.toString() })),
          classesTaught: classesTaught.map((c) => ({ ...c, id: c._id.toString() })),
        };
      })
    );

    res.status(200).json({
      success: true,
      data: staff,
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

// 2. Create Staff Directly
export const createStaff = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      name,
      email,
      phone,
      designation,
      department,
      qualification,
      joiningDate,
      status,
      salary,
      photo,
      aadharNo,
      panNo,
      bankName,
      accountNo,
      ifscCode,
      pfUan,
      employeeCode,
    } = req.body;

    if (!name || !phone || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Name, Phone number, and Designation are required.',
      });
    }

    // Auto-generate employeeCode if not provided: EMP-YYYY-XXXX
    let code = employeeCode ? employeeCode.trim() : null;
    if (!code) {
      const year = new Date().getFullYear();
      const count = await Staff.countDocuments({ school: schoolId });
      code = `EMP-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    const staffMember = await Staff.create({
      school: schoolId,
      employeeCode: code,
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : '',
      phone: phone.trim(),
      designation: designation.trim(),
      department: department ? department.trim() : '',
      qualification: qualification ? qualification.trim() : '',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      status: status || 'ACTIVE',
      salary: salary ? parseFloat(salary) : 0,
      photo: photo || null,
      aadharNo: aadharNo || '',
      panNo: panNo || '',
      bankName: bankName || '',
      accountNo: accountNo || '',
      ifscCode: ifscCode || '',
      pfUan: pfUan || '',
    });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: staffMember,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update Staff Details
export const updateStaff = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.email) updateData.email = updateData.email.toLowerCase().trim();
    if (updateData.salary !== undefined) updateData.salary = parseFloat(updateData.salary);
    if (updateData.joiningDate) updateData.joiningDate = new Date(updateData.joiningDate);

    const updated = await Staff.findOneAndUpdate(
      { _id: id, school: schoolId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Staff Member
export const deleteStaff = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const staff = await Staff.findOneAndDelete({ _id: id, school: schoolId });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Clean up assignments & class teacher pointers
    await Promise.all([
      SubjectAssignment.deleteMany({ staff: id }),
      ClassRoom.updateMany({ classTeacher: id }, { classTeacher: null }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully and all assignments cleared.',
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get Staff Applications (Pending Self-Onboarding)
export const getStaffApplications = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status || 'PENDING';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (status) query.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { subjectsTaught: regex },
      ];
    }

    const total = await StaffApplication.countDocuments(query);
    const applications = await StaffApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: applications,
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

// 6. 1-Click Approve Staff Application -> Creates Staff Record & User Login Account
export const approveStaffApplication = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const { designation, department, salary } = req.body;

    const app = await StaffApplication.findOne({ _id: id, school: schoolId, status: 'PENDING' });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Pending staff application not found' });
    }

    // 1. Generate Employee Code: EMP-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await Staff.countDocuments({ school: schoolId });
    const employeeCode = `EMP-${year}-${String(count + 1).padStart(3, '0')}`;

    // 2. Create Staff Record
    const staff = await Staff.create({
      school: schoolId,
      employeeCode,
      name: app.name,
      email: app.email,
      phone: app.phone,
      designation: designation || app.subjectsTaught || 'Teacher',
      department: department || 'Academics',
      qualification: app.highestQualification || '',
      joiningDate: new Date(),
      status: 'ACTIVE',
      salary: salary ? parseFloat(salary) : (app.expectedSalary || 0),
      photo: app.photo || null,
      aadharNo: app.aadharNo || '',
      panNo: app.panNo || '',
      bankName: app.bankName || '',
      accountNo: app.accountNo || '',
      ifscCode: app.ifscCode || '',
      pfUan: app.pfUan || '',
    });

    // 3. Create or update User Account for Login (Default password = phone number)
    const existingUser = await User.findOne({ email: app.email.toLowerCase().trim() });
    let createdUser = null;

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(app.phone.trim(), 10);
      createdUser = await User.create({
        name: app.name,
        email: app.email.toLowerCase().trim(),
        password: hashedPassword,
        phone: app.phone.trim(),
        role: 'STAFF',
        status: 'ACTIVE',
        school: schoolId,
      });
    }

    // 4. Update Application status to APPROVED
    app.status = 'APPROVED';
    await app.save();

    res.status(200).json({
      success: true,
      message: `Staff application approved successfully! Employee Code: ${employeeCode}. User login enabled with password: ${app.phone}`,
      data: {
        staff,
        userAccountCreated: Boolean(createdUser),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 7. Reject Staff Application
export const rejectStaffApplication = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const { remarks } = req.body;

    const app = await StaffApplication.findOneAndUpdate(
      { _id: id, school: schoolId },
      { status: 'REJECTED', remarks: remarks || 'Application not shortlisted.' },
      { new: true }
    );

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff application has been rejected.',
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

// 8. Get Designations & Departments
export const getDesignationsAndDepartments = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);

    const [designations, departments] = await Promise.all([
      Designation.find({ school: schoolId }).sort({ name: 1 }),
      Department.find({ school: schoolId }).sort({ name: 1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        designations,
        departments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 9. Create Designation
export const createDesignation = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Designation name is required' });
    }

    const designation = await Designation.findOneAndUpdate(
      { school: schoolId, name: name.trim() },
      { name: name.trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, message: 'Designation created', data: designation });
  } catch (error) {
    next(error);
  }
};

// 10. Create Department
export const createDepartment = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const department = await Department.findOneAndUpdate(
      { school: schoolId, name: name.trim() },
      { name: name.trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, message: 'Department created', data: department });
  } catch (error) {
    next(error);
  }
};
