import {
  Student,
  Staff,
  StaffApplication,
  ClassRoom,
  Subject,
  AcademicSession,
  SchoolSubscription,
  FeePayment,
} from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// School Admin Mobile App Dashboard Stats
export const getSchoolDashboardStats = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);

    // Start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      pendingAdmissions,
      totalStaff,
      pendingStaff,
      totalClasses,
      totalSubjects,
      activeSession,
      activeSubscription,
      todayPayments,
    ] = await Promise.all([
      Student.countDocuments({ school: schoolId, status: 'ACTIVE' }),
      Student.countDocuments({ school: schoolId, status: 'PENDING' }),
      Staff.countDocuments({ school: schoolId, status: 'ACTIVE' }),
      StaffApplication.countDocuments({ school: schoolId, status: 'PENDING' }),
      ClassRoom.countDocuments({ school: schoolId }),
      Subject.countDocuments({ school: schoolId }),
      AcademicSession.findOne({ school: schoolId, isActive: true }),
      SchoolSubscription.findOne({ school: schoolId, status: 'ACTIVE' })
        .sort({ endDate: -1 })
        .populate('plan'),
      FeePayment.find({
        school: schoolId,
        paymentDate: { $gte: startOfToday },
      }),
    ]);

    const todayFeeCollection = todayPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    // Recent 5 students added
    const recentStudents = await Student.find({ school: schoolId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('classRoom');

    // Class distribution with student count
    const classesDocs = await ClassRoom.find({ school: schoolId })
      .populate('classTeacher', 'name')
      .limit(6)
      .lean();

    const classes = await Promise.all(
      classesDocs.map(async (cls) => {
        const studentCount = await Student.countDocuments({ classRoom: cls._id });
        return {
          ...cls,
          id: cls._id.toString(),
          _count: { students: studentCount },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        pendingAdmissions,
        totalStaff,
        pendingStaff,
        totalClasses,
        totalSubjects,
        activeSession,
        subscription: activeSubscription,
        todayFeeCollection,
        todayTransactionsCount: todayPayments.length,
        recentStudents,
        classes,
      },
    });
  } catch (error) {
    next(error);
  }
};
