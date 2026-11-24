import {
  Subject,
  SubjectAssignment,
} from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Get Subjects with pagination & search
export const getSubjects = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { code: regex }];
    }

    const total = await Subject.countDocuments(query);
    const subjectsDocs = await Subject.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const subjects = await Promise.all(
      subjectsDocs.map(async (subj) => {
        const assignments = await SubjectAssignment.find({ subject: subj._id })
          .populate('classRoom', 'name section')
          .populate('staff', 'name email phone designation')
          .lean();

        return {
          ...subj,
          id: subj._id.toString(),
          assignments: assignments.map((a) => ({ ...a, id: a._id.toString() })),
          _count: { assignments: assignments.length },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: subjects,
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

// Create Subject
export const createSubject = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, code, type, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    const existing = await Subject.findOne({
      school: schoolId,
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Subject with name "${name}" already exists in this school.`,
      });
    }

    const subject = await Subject.create({
      school: schoolId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : '',
      type: type || 'THEORY',
      description: description || '',
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

// Update Subject
export const updateSubject = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const { name, code, type, description } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (type) updateData.type = type;
    if (description !== undefined) updateData.description = description;

    const updated = await Subject.findOneAndUpdate(
      { _id: id, school: schoolId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Subject
export const deleteSubject = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    const subject = await Subject.findOneAndDelete({ _id: id, school: schoolId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Clean up all assignments of this subject
    await SubjectAssignment.deleteMany({ subject: id });

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully and removed from all classes.',
    });
  } catch (error) {
    next(error);
  }
};
