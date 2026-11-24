import {
  FeeStructure,
  FeePayment,
  Student,
  School,
  AcademicSession,
} from '../models/index.js';
import { getSchoolId } from '../utils/schoolHelper.js';

// Helper to convert number to words for printable fee receipts
export function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  if (!num || isNaN(num)) return '';

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    if (n < 1000) return inWords(Math.floor(n / 100)) + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const rounded = Math.round(num);
  return inWords(rounded) + ' Rupees Only';
}

// 1. Get Fee Structures
export const getFeeStructures = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);

    const activeSession = await AcademicSession.findOne({ school: schoolId, isActive: true });

    const structures = await FeeStructure.find({ school: schoolId })
      .populate('academicSession', 'name isActive')
      .sort({ className: 1 });

    res.status(200).json({
      success: true,
      data: structures,
      activeSession,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create or Update Fee Structure
export const saveFeeStructure = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { className, academicSessionId, billingCycle, heads } = req.body;

    if (!className || !academicSessionId || !heads || heads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Class Name, Academic Session, and at least one Fee Head are required.',
      });
    }

    let totalAnnualFee = 0;
    const formattedHeads = heads.map((h) => {
      const amt = parseFloat(h.amount) || 0;
      const freq = parseInt(h.frequency) || 1;
      totalAnnualFee += amt * freq;
      return {
        name: h.name.trim(),
        amount: amt,
        frequency: freq,
      };
    });

    const structure = await FeeStructure.findOneAndUpdate(
      {
        school: schoolId,
        academicSession: academicSessionId,
        className: className.trim(),
      },
      {
        billingCycle: billingCycle || 'MONTHLY',
        totalAnnualFee,
        heads: formattedHeads,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('academicSession', 'name isActive');

    res.status(200).json({
      success: true,
      message: 'Fee structure saved successfully!',
      data: structure,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Delete Fee Structure
export const deleteFeeStructure = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { id } = req.params;

    await FeeStructure.findOneAndDelete({ _id: id, school: schoolId });
    res.status(200).json({ success: true, message: 'Fee structure deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 4. Collect Fee & Generate Printable Receipt
export const collectFee = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId, amountPaid, paymentMode, transactionRef, remarks, academicSessionId } = req.body;

    if (!studentId || !amountPaid || parseFloat(amountPaid) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid Student and Amount Paid are required.',
      });
    }

    const [student, school] = await Promise.all([
      Student.findOne({ _id: studentId, school: schoolId }).populate('classRoom'),
      School.findById(schoolId),
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Generate unique Receipt No: [PREFIX]-REC-[YEAR]-[0001]
    const year = new Date().getFullYear();
    const count = await FeePayment.countDocuments({ school: schoolId });
    const receiptNo = `${school.admissionPrefix || 'DPS'}-REC-${year}-${String(count + 1).padStart(4, '0')}`;

    const payment = await FeePayment.create({
      school: schoolId,
      student: studentId,
      academicSession: academicSessionId || student.academicSession,
      receiptNo,
      amountPaid: parseFloat(amountPaid),
      paymentMode: paymentMode || 'CASH',
      paymentDate: new Date(),
      transactionRef: transactionRef || '',
      remarks: remarks || '',
    });

    const populatedPayment = await FeePayment.findById(payment._id)
      .populate({
        path: 'student',
        populate: { path: 'classRoom', select: 'name section' },
      })
      .populate('academicSession', 'name');

    const paymentData = populatedPayment.toObject();
    paymentData.amountInWords = numberToWords(paymentData.amountPaid);
    paymentData.school = {
      name: school.name,
      logo: school.logo,
      address: school.address,
      phone: school.phone,
      email: school.email,
    };

    res.status(201).json({
      success: true,
      message: 'Fee collected successfully!',
      data: paymentData,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get Fee Receipts with server-side pagination, search & filters
export const getFeeReceipts = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const paymentMode = req.query.paymentMode || '';

    const skip = (page - 1) * limit;

    const query = { school: schoolId };
    if (paymentMode) query.paymentMode = paymentMode;

    if (search) {
      const regex = new RegExp(search, 'i');
      const matchingStudents = await Student.find({
        school: schoolId,
        $or: [
          { firstName: regex },
          { lastName: regex },
          { admissionNo: regex },
        ],
      }).select('_id');

      const studentIds = matchingStudents.map((s) => s._id);

      query.$or = [
        { receiptNo: regex },
        { transactionRef: regex },
        { student: { $in: studentIds } },
      ];
    }

    const total = await FeePayment.countDocuments(query);
    const payments = await FeePayment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'student',
        select: 'firstName lastName admissionNo rollNo',
        populate: { path: 'classRoom', select: 'name section' },
      })
      .populate('academicSession', 'name');

    const dataWithWords = payments.map((p) => {
      const obj = p.toObject();
      obj.amountInWords = numberToWords(obj.amountPaid);
      return obj;
    });

    res.status(200).json({
      success: true,
      data: dataWithWords,
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

// 6. Get Single Receipt Details for Printing
export const getReceiptDetails = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { receiptNo } = req.params;

    const [payment, school] = await Promise.all([
      FeePayment.findOne({ school: schoolId, receiptNo })
        .populate({
          path: 'student',
          populate: { path: 'classRoom', select: 'name section' },
        })
        .populate('academicSession', 'name'),
      School.findById(schoolId).select('name logo address phone email code'),
    ]);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Fee receipt not found' });
    }

    const receipt = payment.toObject();
    receipt.amountInWords = numberToWords(receipt.amountPaid);
    receipt.school = school;

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

// 7. Get Student Fee Ledger
export const getStudentFeeLedger = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { studentId } = req.params;

    const [student, payments, school] = await Promise.all([
      Student.findOne({ _id: studentId, school: schoolId })
        .populate('classRoom')
        .populate('academicSession'),
      FeePayment.find({ school: schoolId, student: studentId }).sort({ paymentDate: -1 }),
      School.findById(schoolId).select('name logo phone email address admissionPrefix'),
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Determine applicable fee structure
    let feeStructure = null;
    if (student.classRoom && student.academicSession) {
      feeStructure = await FeeStructure.findOne({
        school: schoolId,
        academicSession: student.academicSession._id,
        className: student.classRoom.name,
      });
    }

    const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalAnnualFee = feeStructure ? feeStructure.totalAnnualFee : 0;
    const balanceDue = Math.max(0, totalAnnualFee - totalPaid);

    res.status(200).json({
      success: true,
      data: {
        student,
        school,
        feeStructure,
        payments: payments.map((p) => {
          const obj = p.toObject();
          obj.amountInWords = numberToWords(obj.amountPaid);
          return obj;
        }),
        summary: {
          totalAnnualFee,
          totalPaid,
          balanceDue,
          isFullyPaid: balanceDue === 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
