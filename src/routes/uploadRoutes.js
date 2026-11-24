import express from 'express';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * POST /api/upload
 * Supports ?type=logos | students | staff | documents
 * Form-data field: 'file' or 'image'
 */
router.post('/', (req, res) => {
  const uploadHandler = upload.single('file');

  uploadHandler(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please provide a file in form-data field "file".',
      });
    }

    const type = req.query.type || req.body.type || 'documents';
    const relativeUrl = `/uploads/${type}/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: relativeUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  });
});

export default router;
