import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    employeeCode: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    qualification: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'],
      default: 'ACTIVE',
    },
    salary: { type: Number, default: 0 },
    photo: { type: String, default: null }, // e.g. /uploads/staff/photo.jpg or Base64
    aadharNo: { type: String, trim: true },
    panNo: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNo: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    pfUan: { type: String, trim: true },
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

staffSchema.index({ school: 1, employeeCode: 1 }, { unique: true, sparse: true });

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
