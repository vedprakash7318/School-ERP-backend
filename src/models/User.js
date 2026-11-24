import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'STAFF'],
      default: 'SCHOOL_ADMIN',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED', 'INACTIVE'],
      default: 'ACTIVE',
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.school) {
          ret.schoolId = ret.school._id ? ret.school._id.toString() : ret.school.toString();
        }
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

userSchema.virtual('schoolId').get(function () {
  if (!this.school) return null;
  return this.school._id ? this.school._id.toString() : this.school.toString();
});

const User = mongoose.model('User', userSchema);
export default User;
