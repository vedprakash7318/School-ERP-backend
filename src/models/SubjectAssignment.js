import mongoose from 'mongoose';

const subjectAssignmentSchema = new mongoose.Schema(
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
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    periodsPerWeek: { type: Number, default: 5 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.school) ret.schoolId = ret.school.toString();
        if (ret.classRoom) ret.classId = ret.classRoom.toString();
        if (ret.subject) ret.subjectId = ret.subject.toString();
        if (ret.staff) ret.staffId = ret.staff.toString();
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

subjectAssignmentSchema.index({ school: 1, classRoom: 1, subject: 1 }, { unique: true });

const SubjectAssignment = mongoose.model('SubjectAssignment', subjectAssignmentSchema);
export default SubjectAssignment;
