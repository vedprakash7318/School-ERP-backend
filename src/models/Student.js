import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    classRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassRoom',
      required: true,
    },
    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      default: null,
    },
    admissionNo: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      default: 'MALE',
    },
    dob: { type: Date },
    bloodGroup: { type: String, trim: true },
    category: { type: String, default: 'GENERAL' },
    nationality: { type: String, default: 'Indian' },
    photo: { type: String, default: null }, // e.g. /uploads/students/xyz.jpg or Base64
    parentName: { type: String, required: true, trim: true },
    fatherOccupation: { type: String, trim: true },
    motherName: { type: String, trim: true },
    motherOccupation: { type: String, trim: true },
    parentPhone: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    previousSchool: { type: String, trim: true },
    previousBoard: { type: String, trim: true },
    previousMarks: { type: String, trim: true },
    hasTC: { type: Boolean, default: false },
    healthNotes: { type: String, trim: true },
    documentsChecked: { type: String, default: '[]' },
    declarationAccepted: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'INACTIVE', 'TRANSFERRED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.school) ret.schoolId = ret.school.toString();
        if (ret.classRoom) ret.classId = ret.classRoom.toString();
        if (ret.academicSession) ret.academicSessionId = ret.academicSession.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

studentSchema.index({ school: 1, admissionNo: 1 }, { unique: true });
studentSchema.index({ school: 1, classRoom: 1, rollNo: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);
export default Student;
