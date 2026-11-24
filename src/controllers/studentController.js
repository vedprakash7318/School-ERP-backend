import {
  Student,
  ClassRoom,
  AcademicSession,
  FeePayment,
  FeeStructure,
  School,
} from '../models/index.js';
import { numberToWords } from './feeController.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Get Students list with server-side pagination, search, class filter, session filter, and status filter
export const getStudents = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const classId = req.query.classId || '';
    const sessionId = req.query.sessionId || '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (classId) query.classRoom = classId;
    if (sessionId) query.academicSession = sessionId;
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'DELETED' };
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { admissionNo: regex },
        { rollNo: regex },
        { parentName: regex },
        { parentPhone: regex },
      ];
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ classRoom: 1, rollNo: 1 })
      .skip(skip)
      .limit(limit)
      .populate('classRoom', 'name section')
      .populate('academicSession', 'name');

    res.status(200).json({
      success: true,
      data: students,
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

// Create Student (Admin Direct Admission)
export const createStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      classId,
      academicSessionId,
      admissionNo,
      rollNo,
      firstName,
      lastName,
      gender,
      dob,
      bloodGroup,
      category,
      nationality,
      photo,
      parentName,
      fatherOccupation,
      motherName,
      motherOccupation,
      parentPhone,
      secondaryPhone,
      email,
      address,
      previousSchool,
      previousBoard,
      previousMarks,
      hasTC,
      healthNotes,
      documentsChecked,
      declarationAccepted,
      status,
    } = req.body;

    if (!classId || !admissionNo || !rollNo || !firstName || !lastName || !parentName || !parentPhone) {
      return res.status(400).json({
        success: false,
        message: 'Class, Admission No, Roll No, First/Last Name, Parent Name, and Parent Phone are required.',
      });
    }

    // Check admissionNo uniqueness
    const existingAdm = await Student.findOne({
      school: schoolId,
      admissionNo: admissionNo.trim(),
    });
    if (existingAdm) {
      return res.status(400).json({
        success: false,
        message: `Student with Admission No "${admissionNo}" already exists in this school.`,
      });
    }

    // Check rollNo uniqueness in this class
    const existingRoll = await Student.findOne({
      school: schoolId,
      classRoom: classId,
      rollNo: rollNo.trim(),
    });
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        message: `Roll No "${rollNo}" is already allocated to another student in this class.`,
      });
    }

    // If no academic session provided, use active session
    let targetSessionId = academicSessionId;
    if (!targetSessionId) {
      const activeSess = await AcademicSession.findOne({ school: schoolId, isActive: true });
      if (activeSess) targetSessionId = activeSess._id;
    }

    const student = await Student.create({
      school: schoolId,
      classRoom: classId,
      academicSession: targetSessionId || null,
      admissionNo: admissionNo.trim(),
      rollNo: rollNo.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: gender || 'MALE',
      dob: dob ? new Date(dob) : null,
      bloodGroup: bloodGroup || '',
      category: category || 'GENERAL',
      nationality: nationality || 'Indian',
      photo: photo || null,
      parentName: parentName.trim(),
      fatherOccupation: fatherOccupation || '',
      motherName: motherName || '',
      motherOccupation: motherOccupation || '',
      parentPhone: parentPhone.trim(),
      secondaryPhone: secondaryPhone || '',
      email: email ? email.toLowerCase().trim() : '',
      address: address || '',
      previousSchool: previousSchool || '',
      previousBoard: previousBoard || '',
      previousMarks: previousMarks || '',
      hasTC: Boolean(hasTC),
      healthNotes: healthNotes || '',
      documentsChecked: typeof documentsChecked === 'object' ? JSON.stringify(documentsChecked) : documentsChecked || '[]',
      declarationAccepted: declarationAccepted !== undefined ? Boolean(declarationAccepted) : true,
      status: status || 'ACTIVE',
    });

    const populated = await Student.findById(student._id)
      .populate('classRoom', 'name section')
      .populate('academicSession', 'name');

    res.status(201).json({
      success: true,
      message: 'Student admitted successfully!',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Update Student
export const updateStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.classId) {
      updateData.classRoom = updateData.classId;
      delete updateData.classId;
    }
    if (updateData.academicSessionId) {
      updateData.academicSession = updateData.academicSessionId;
      delete updateData.academicSessionId;
    }
    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob);
    }
    if (typeof updateData.documentsChecked === 'object') {
      updateData.documentsChecked = JSON.stringify(updateData.documentsChecked);
    }

    const updated = await Student.findOneAndUpdate(
      { _id: id, school: schoolId },
      updateData,
      { new: true }
    )
      .populate('classRoom', 'name section')
      .populate('academicSession', 'name');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Student details updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Student
export const deleteStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const student = await Student.findOneAndDelete({ _id: id, school: schoolId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Clean up fee payments
    await FeePayment.deleteMany({ student: id });

    res.status(200).json({ success: true, message: 'Student and related fee records deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 1-Click Approve Pending Admission
export const approveStudent = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const student = await Student.findOneAndUpdate(
      { _id: id, school: schoolId, status: 'PENDING' },
      { status: 'ACTIVE' },
      { new: true }
    )
      .populate('classRoom', 'name section')
      .populate('academicSession', 'name');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Pending student record not found' });
    }

    res.status(200).json({
      success: true,
      message: `Admission approved! Student ${student.firstName} ${student.lastName} is now ACTIVE.`,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// Get Full Student 4-Tab Profile (Overview, Fees Ledger, Academics, ID Card)
export const getStudentProfile = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const [student, payments, school] = await Promise.all([
      Student.findOne({ _id: id, school: schoolId })
        .populate('classRoom')
        .populate('academicSession'),
      FeePayment.find({ school: schoolId, student: id }).sort({ paymentDate: -1 }),
      School.findById(schoolId).select('name logo phone email address admissionPrefix code'),
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Determine applicable fee structure
    let feeStructure = null;
    if (student.classRoom && student.academicSession) {
      feeStructure = await FeeStructure.findOne({
        school: schoolId,
        academicSession: student.academicSession._id,
        className: student.classRoom.name,
      });
    }

    const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalAnnualFee = feeStructure ? feeStructure.totalAnnualFee : 0;
    const balanceDue = Math.max(0, totalAnnualFee - totalPaid);

    res.status(200).json({
      success: true,
      data: {
        student,
        school,
        feeStructure,
        payments: payments.map((p) => {
          const obj = p.toObject();
          obj.amountInWords = numberToWords(obj.amountPaid);
          return obj;
        }),
        ledger: {
          totalAnnualFee,
          totalPaid,
          balanceDue,
          isFullyPaid: balanceDue === 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
