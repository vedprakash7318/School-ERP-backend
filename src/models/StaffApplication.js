import mongoose from 'mongoose';

const staffApplicationSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    gender: { type: String },
    dob: { type: Date },
    maritalStatus: { type: String },
    fatherHusbandName: { type: String },
    address: { type: String },
    aadharNo: { type: String, trim: true },
    panNo: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNo: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    pfUan: { type: String, trim: true },
    highestQualification: { type: String },
    subjectsTaught: { type: String },
    experienceYears: { type: String },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
      default: 'FULL_TIME',
    },
    expectedSalary: { type: Number, default: 0 },
    photo: { type: String, default: null }, // e.g. /uploads/staff/applicant.jpg
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    remarks: { type: String },
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

staffApplicationSchema.index({ school: 1, email: 1 });
staffApplicationSchema.index({ school: 1, status: 1 });

const StaffApplication = mongoose.model('StaffApplication', staffApplicationSchema);
export default StaffApplication;
