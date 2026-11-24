import mongoose from 'mongoose';

const feePaymentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      default: null,
    },
    receiptNo: { type: String, required: true, trim: true },
    amountPaid: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'],
      default: 'CASH',
    },
    paymentDate: { type: Date, default: Date.now },
    transactionRef: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.school) ret.schoolId = ret.school.toString();
        if (ret.student) ret.studentId = ret.student.toString();
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

feePaymentSchema.index({ school: 1, receiptNo: 1 }, { unique: true });

const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
export default FeePayment;
