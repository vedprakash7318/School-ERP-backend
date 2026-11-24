import {
  ClassRoom,
  Student,
  SubjectAssignment,
} from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Get classes with pagination & search
export const getClasses = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { section: regex },
        { roomNumber: regex },
      ];
    }

    const total = await ClassRoom.countDocuments(query);
    const classesDocs = await ClassRoom.find(query)
      .sort({ name: 1, section: 1 })
      .skip(skip)
      .limit(limit)
      .populate('classTeacher', 'name email phone designation')
      .lean();

    const classes = await Promise.all(
      classesDocs.map(async (cls) => {
        const [studentCount, assignments] = await Promise.all([
          Student.countDocuments({ classRoom: cls._id }),
          SubjectAssignment.find({ classRoom: cls._id })
            .populate('subject', 'name code type')
            .populate('staff', 'name email phone designation')
            .lean(),
        ]);

        return {
          ...cls,
          id: cls._id.toString(),
          assignments: assignments.map((a) => ({ ...a, id: a._id.toString() })),
          _count: {
            students: studentCount,
            assignments: assignments.length,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: classes,
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

// Create Class
export const createClass = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { name, section, capacity, roomNumber } = req.body;

    if (!name || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class Name and Section are required.',
      });
    }

    const existing = await ClassRoom.findOne({
      school: schoolId,
      name: name.trim(),
      section: section.trim().toUpperCase(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Class "${name}" Section "${section}" already exists.`,
      });
    }

    const newClass = await ClassRoom.create({
      school: schoolId,
      name: name.trim(),
      section: section.trim().toUpperCase(),
      capacity: capacity ? parseInt(capacity) : 40,
      roomNumber: roomNumber ? roomNumber.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass,
    });
  } catch (error) {
    next(error);
  }
};

// Update Class (including assigning Class Teacher)
export const updateClass = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;
    const { name, section, capacity, roomNumber, classTeacherId } = req.body;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name.trim();
    if (section) dataToUpdate.section = section.trim().toUpperCase();
    if (capacity !== undefined) dataToUpdate.capacity = parseInt(capacity);
    if (roomNumber !== undefined) dataToUpdate.roomNumber = roomNumber.trim();
    if (classTeacherId !== undefined) {
      dataToUpdate.classTeacher = classTeacherId || null;
    }

    const updated = await ClassRoom.findOneAndUpdate(
      { _id: id, school: schoolId },
      dataToUpdate,
      { new: true }
    ).populate('classTeacher', 'name email phone designation');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Class
export const deleteClass = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    // Check if class has active students
    const studentCount = await Student.countDocuments({ classRoom: id });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class with ${studentCount} active students. Please reassign students first.`,
      });
    }

    await ClassRoom.findOneAndDelete({ _id: id, school: schoolId });
    await SubjectAssignment.deleteMany({ classRoom: id });

    res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
};
