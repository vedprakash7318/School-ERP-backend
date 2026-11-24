import { AcademicSession, Student, FeePayment } from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Get all Academic Sessions for current school
export const getSessions = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);

    const sessionsDocs = await AcademicSession.find({ school: schoolId })
      .sort({ startDate: -1 })
      .lean();

    const sessions = await Promise.all(
      sessionsDocs.map(async (sess) => {
        const [studentCount, paymentCount] = await Promise.all([
          Student.countDocuments({ academicSession: sess._id }),
          FeePayment.countDocuments({ academicSession: sess._id }),
        ]);

        return {
          ...sess,
          id: sess._id.toString(),
          _count: {
            students: studentCount,
            feePayments: paymentCount,
          },
        };
      })
    );

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

// Create a new Academic Session (e.g. 2026-2027)
export const createSession = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, startDate, endDate, setAsActive } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Session Name, Start Date, and End Date are required.',
      });
    }

    const existing = await AcademicSession.findOne({
      school: schoolId,
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Academic Session "${name}" already exists for this school.`,
      });
    }

    if (setAsActive) {
      // Deactivate all previous sessions
      await AcademicSession.updateMany({ school: schoolId }, { isActive: false });
    }

    const newSession = await AcademicSession.create({
      school: schoolId,
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: Boolean(setAsActive),
    });

    res.status(201).json({
      success: true,
      message: 'Academic session created successfully',
      data: newSession,
    });
  } catch (error) {
    next(error);
  }
};

// One-Click Active Session Switcher
export const activateSession = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const session = await AcademicSession.findOne({ _id: id, school: schoolId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Academic session not found' });
    }

    // 1. Deactivate all sessions in this school
    await AcademicSession.updateMany({ school: schoolId }, { isActive: false });

    // 2. Activate requested session
    session.isActive = true;
    await session.save();

    res.status(200).json({
      success: true,
      message: `Session "${session.name}" is now the active academic session`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Session
export const deleteSession = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const session = await AcademicSession.findOne({ _id: id, school: schoolId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Academic session not found' });
    }

    if (session.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the currently active session. Please activate another session first.',
      });
    }

    await AcademicSession.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Academic session deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
