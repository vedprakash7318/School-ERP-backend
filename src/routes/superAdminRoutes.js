import express from 'express';
import {
  getAllSchools,
  createSchool,
  toggleSchoolStatus,
  deleteSchool,
  updateSchoolAdmin,
  getSuperAdminDashboardStats,
} from '../controllers/superAdminController.js';
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  assignSubscription,
  getSubscriptionHistory,
} from '../controllers/subscriptionController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply super admin protection to all routes
router.use(authenticate, authorize('SUPER_ADMIN'));

// Dashboard stats
router.get('/stats', getSuperAdminDashboardStats);

// School & School Admin management
router.get('/schools', getAllSchools);
router.post('/schools', createSchool);
router.patch('/schools/:id/status', toggleSchoolStatus);
router.put('/schools/:id/admin', updateSchoolAdmin);
router.delete('/schools/:id', deleteSchool);

// Subscription plans management (Daily, Weekly, Monthly, Quarterly, Yearly)
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Assign subscriptions & history
router.post('/subscriptions/assign', assignSubscription);
router.get('/subscriptions/history', getSubscriptionHistory);

export default router;
