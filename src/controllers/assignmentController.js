import {
  SubjectAssignment,
  ClassRoom,
  Subject,
  Staff,
} from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Get Subject Assignments with pagination & filter
export const getAssignments = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const classId = req.query.classId || '';
    const staffId = req.query.staffId || '';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (classId) query.classRoom = classId;
    if (staffId) query.staff = staffId;

    const total = await SubjectAssignment.countDocuments(query);
    const assignments = await SubjectAssignment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('classRoom', 'name section')
      .populate('subject', 'name code type')
      .populate('staff', 'name email phone designation');

    res.status(200).json({
      success: true,
      data: assignments,
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

// Assign Subject to Class & Teacher (Staff)
export const assignSubject = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { classId, subjectId, staffId, periodsPerWeek } = req.body;

    if (!classId || !subjectId || !staffId) {
      return res.status(400).json({
        success: false,
        message: 'Class, Subject, and Staff (Teacher) are required.',
      });
    }

    const assignment = await SubjectAssignment.findOneAndUpdate(
      {
        school: schoolId,
        classRoom: classId,
        subject: subjectId,
      },
      {
        staff: staffId,
        periodsPerWeek: periodsPerWeek ? parseInt(periodsPerWeek) : 5,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('classRoom', 'name section')
      .populate('subject', 'name code type')
      .populate('staff', 'name email phone designation');

    res.status(200).json({
      success: true,
      message: 'Subject and Teacher assigned to class successfully!',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// Remove Subject Assignment from Class
export const removeAssignment = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const assignment = await SubjectAssignment.findOneAndDelete({ _id: id, school: schoolId });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Subject assignment removed from class successfully',
    });
  } catch (error) {
    next(error);
  }
};
