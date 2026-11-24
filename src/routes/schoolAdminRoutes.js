import express from 'express';
import { authenticate, authorize, checkActiveSubscription } from '../middleware/authMiddleware.js';
import { getSchoolDashboardStats } from '../controllers/schoolDashboardController.js';

// Academic Sessions
import {
  getSessions,
  createSession,
  activateSession,
  deleteSession,
} from '../controllers/academicSessionController.js';

// Fee Management
import {
  getFeeStructures,
  saveFeeStructure,
  deleteFeeStructure,
  collectFee,
  getFeeReceipts,
  getReceiptDetails,
  getStudentFeeLedger,
} from '../controllers/feeController.js';

// Staff & HR
import {
  getStaffList,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffApplications,
  approveStaffApplication,
  rejectStaffApplication,
  getDesignationsAndDepartments,
  createDesignation,
  createDepartment,
} from '../controllers/staffController.js';

// Classes & Subjects
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
} from '../controllers/classController.js';
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subjectController.js';
import {
  getAssignments,
  assignSubject,
  removeAssignment,
} from '../controllers/assignmentController.js';

// Students
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  approveStudent,
  getStudentProfile,
} from '../controllers/studentController.js';

// Settings & Branding
import {
  getSchoolSettings,
  updateSchoolSettings,
  changeAdminPassword,
  getSchoolUsers,
  createSchoolUser,
} from '../controllers/schoolSettingsController.js';

const router = express.Router();

// Apply School Admin / Principal authentication
router.use(authenticate, authorize('PRINCIPAL', 'SCHOOL_ADMIN', 'SUPER_ADMIN'));

// Dashboard stats (always accessible)
router.get('/dashboard', getSchoolDashboardStats);

// Settings & Profile
router.get('/settings', getSchoolSettings);
router.put('/settings', updateSchoolSettings);
router.put('/settings/password', changeAdminPassword);
router.get('/settings/users', getSchoolUsers);
router.post('/settings/users', createSchoolUser);

// Academic Sessions
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.patch('/sessions/:id/activate', activateSession);
router.delete('/sessions/:id', deleteSession);

// Protected by active subscription check for operational writes
router.use(checkActiveSubscription);

// Student management
router.get('/students', getStudents);
router.post('/students', createStudent);
router.get('/students/:id/profile', getStudentProfile);
router.put('/students/:id', updateStudent);
router.patch('/students/:id/approve', approveStudent);
router.delete('/students/:id', deleteStudent);

// Fee structures & accounting
router.get('/fee-structures', getFeeStructures);
router.post('/fee-structures', saveFeeStructure);
router.delete('/fee-structures/:id', deleteFeeStructure);
router.post('/fees/collect', collectFee);
router.get('/fees/receipts', getFeeReceipts);
router.get('/fees/receipts/:id', getReceiptDetails);
router.get('/fees/student-ledger/:studentId', getStudentFeeLedger);

// Staff & HR
router.get('/staff', getStaffList);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);
router.get('/staff/applications', getStaffApplications);
router.post('/staff/applications/:id/approve', approveStaffApplication);
router.post('/staff/applications/:id/reject', rejectStaffApplication);
router.get('/designations', getDesignationsAndDepartments);
router.post('/designations', createDesignation);
router.post('/departments', createDepartment);

// Classes
router.get('/classes', getClasses);
router.post('/classes', createClass);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);

// Subjects
router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

// Subject assignments
router.get('/assignments', getAssignments);
router.post('/assignments', assignSubject);
router.delete('/assignments/:id', removeAssignment);

export default router;
