import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    type: {
      type: String,
      enum: ['THEORY', 'PRACTICAL', 'BOTH'],
      default: 'THEORY',
    },
    description: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.school) ret.schoolId = ret.school.toString();
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

subjectSchema.index({ school: 1, name: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
