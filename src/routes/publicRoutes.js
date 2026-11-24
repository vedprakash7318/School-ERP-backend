import express from 'express';
import {
  getPublicSchoolBySlug,
  submitPublicAdmission,
  submitPublicStaffApplication,
} from '../controllers/publicController.js';

const router = express.Router();

// Publicly accessible tenant endpoints
router.get('/schools/:slug', getPublicSchoolBySlug);
router.post('/schools/:slug/admission', submitPublicAdmission);
router.post('/schools/:slug/join-staff', submitPublicStaffApplication);

export default router;
