import mongoose from 'mongoose';

const classRoomSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    name: { type: String, required: true, trim: true }, // e.g. "Class 10", "Grade 5", "Nursery"
    section: { type: String, required: true, uppercase: true, trim: true }, // e.g. "A", "B", "C"
    capacity: { type: Number, default: 40 },
    roomNumber: { type: String, trim: true },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.school) ret.schoolId = ret.school.toString();
        if (ret.classTeacher) ret.classTeacherId = ret.classTeacher.toString();
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

classRoomSchema.index({ school: 1, name: 1, section: 1 }, { unique: true });

const ClassRoom = mongoose.model('ClassRoom', classRoomSchema);
export default ClassRoom;
