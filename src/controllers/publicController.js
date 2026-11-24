import {
  School,
  AcademicSession,
  ClassRoom,
  Student,
  StaffApplication,
} from '../models/index.js';

// Get public school branding & config by slug (for :slug/login, :slug/admission, :slug/join-staff)
export const getPublicSchoolBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const school = await School.findOne({ slug: slug.toLowerCase().trim() }).lean();

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found with this URL' });
    }

    if (school.status === 'SUSPENDED' || school.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'This school portal is currently suspended. Please contact administration.',
      });
    }

    const [activeSession, classes] = await Promise.all([
      AcademicSession.findOne({ school: school._id, isActive: true })
        .select('name isActive')
        .lean(),
      ClassRoom.find({ school: school._id })
        .select('name section')
        .sort({ name: 1, section: 1 })
        .lean(),
    ]);

    const publicData = {
      id: school._id.toString(),
      name: school.name,
      slug: school.slug,
      code: school.code,
      admissionPrefix: school.admissionPrefix,
      logo: school.logo,
      email: school.email,
      phone: school.phone,
      address: school.address,
      city: school.city,
      state: school.state,
      status: school.status,
      sessions: activeSession ? [{ ...activeSession, id: activeSession._id.toString() }] : [],
      classes: classes.map((c) => ({ ...c, id: c._id.toString() })),
    };

    res.status(200).json({ success: true, data: publicData });
  } catch (error) {
    next(error);
  }
};

// Public Online Student Admission Form Submission (/:slug/admission)
export const submitPublicAdmission = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const {
      firstName,
      lastName,
      classId,
      gender,
      dob,
      bloodGroup,
      category,
      nationality,
      photo,
      parentName,
      fatherOccupation,
      motherName,
      motherOccupation,
      parentPhone,
      secondaryPhone,
      email,
      address,
      previousSchool,
      previousBoard,
      previousMarks,
      hasTC,
      healthNotes,
      documentsChecked,
      declarationAccepted,
    } = req.body;

    const school = await School.findOne({ slug: slug.toLowerCase().trim() });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (!firstName || !lastName || !classId || !parentName || !parentPhone) {
      return res.status(400).json({
        success: false,
        message: 'First Name, Last Name, Class, Parent Name, and Parent Phone are required.',
      });
    }

    const activeSession = await AcademicSession.findOne({ school: school._id, isActive: true });

    // Generate Temporary Admission No: [PREFIX]-PENDING-[YEAR]-[COUNT]
    const year = new Date().getFullYear();
    const count = await Student.countDocuments({ school: school._id });
    const tempAdmissionNo = `${school.admissionPrefix || 'DPS'}-APP-${year}-${String(count + 1).padStart(4, '0')}`;
    const tempRollNo = `P-${String(count + 1).padStart(3, '0')}`;

    const newStudent = await Student.create({
      school: school._id,
      classRoom: classId,
      academicSession: activeSession ? activeSession._id : null,
      admissionNo: tempAdmissionNo,
      rollNo: tempRollNo,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender: gender || 'MALE',
      dob: dob ? new Date(dob) : null,
      bloodGroup: bloodGroup || '',
      category: category || 'GENERAL',
      nationality: nationality || 'Indian',
      photo: photo || null,
      parentName: parentName.trim(),
      fatherOccupation: fatherOccupation || '',
      motherName: motherName || '',
      motherOccupation: motherOccupation || '',
      parentPhone: parentPhone.trim(),
      secondaryPhone: secondaryPhone || '',
      email: email ? email.toLowerCase().trim() : '',
      address: address || '',
      previousSchool: previousSchool || '',
      previousBoard: previousBoard || '',
      previousMarks: previousMarks || '',
      hasTC: Boolean(hasTC),
      healthNotes: healthNotes || '',
      documentsChecked: typeof documentsChecked === 'object' ? JSON.stringify(documentsChecked) : documentsChecked || '[]',
      declarationAccepted: declarationAccepted !== undefined ? Boolean(declarationAccepted) : true,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Admission application submitted successfully! Your application is under review by the school administration.',
      data: {
        applicationNo: tempAdmissionNo,
        studentName: `${newStudent.firstName} ${newStudent.lastName}`,
        status: newStudent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Public Online Staff Self-Onboarding Form Submission (/:slug/join-staff)
export const submitPublicStaffApplication = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const {
      name,
      email,
      phone,
      gender,
      dob,
      maritalStatus,
      fatherHusbandName,
      address,
      aadharNo,
      panNo,
      bankName,
      accountNo,
      ifscCode,
      pfUan,
      highestQualification,
      subjectsTaught,
      experienceYears,
      employmentType,
      expectedSalary,
      photo,
    } = req.body;

    const school = await School.findOne({ slug: slug.toLowerCase().trim() });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email address, and Phone number are required.',
      });
    }

    // Check if an application with this email already exists
    const existing = await StaffApplication.findOne({
      school: school._id,
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email address has already been submitted for this school.',
      });
    }

    const application = await StaffApplication.create({
      school: school._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      gender: gender || 'MALE',
      dob: dob ? new Date(dob) : null,
      maritalStatus: maritalStatus || 'SINGLE',
      fatherHusbandName: fatherHusbandName || '',
      address: address || '',
      aadharNo: aadharNo || '',
      panNo: panNo || '',
      bankName: bankName || '',
      accountNo: accountNo || '',
      ifscCode: ifscCode || '',
      pfUan: pfUan || '',
      highestQualification: highestQualification || '',
      subjectsTaught: subjectsTaught || '',
      experienceYears: experienceYears || '0',
      employmentType: employmentType || 'FULL_TIME',
      expectedSalary: expectedSalary ? parseFloat(expectedSalary) : 0,
      photo: photo || null,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Staff application submitted successfully! The school principal/admin will review your credentials.',
      data: {
        applicationId: application._id,
        name: application.name,
        email: application.email,
        status: application.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
