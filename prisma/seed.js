import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Create Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@erp.com' },
    update: {},
    create: {
      name: 'Super Administrator',
      email: 'superadmin@erp.com',
      password: superAdminPassword,
      phone: '+919876543210',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Super Admin created: superadmin@erp.com / admin123');

  // 2. Create Subscription Plans
  const plansData = [
    {
      name: 'Daily Pass',
      billingCycle: 'DAILY',
      price: 99,
      durationDays: 1,
      description: '1 Day full access pass for quick testing and review',
      maxStudents: 50,
      maxStaff: 10,
    },
    {
      name: 'Weekly Starter',
      billingCycle: 'WEEKLY',
      price: 499,
      durationDays: 7,
      description: '7 Days trial subscription with standard features',
      maxStudents: 200,
      maxStaff: 20,
    },
    {
      name: 'Monthly Standard',
      billingCycle: 'MONTHLY',
      price: 1499,
      durationDays: 30,
      description: 'Monthly active school plan with full management suite',
      maxStudents: 500,
      maxStaff: 50,
    },
    {
      name: 'Quarterly Growth',
      billingCycle: 'QUARTERLY',
      price: 3999,
      durationDays: 90,
      description: '3 Months term pack with priority support and unlimited sections',
      maxStudents: 1000,
      maxStaff: 100,
    },
    {
      name: 'Annual Enterprise',
      billingCycle: 'YEARLY',
      price: 12999,
      durationDays: 365,
      description: 'Full 1-Year academic session subscription with all modules',
      maxStudents: 5000,
      maxStaff: 500,
    },
  ];

  const createdPlans = [];
  for (const plan of plansData) {
    const p = await prisma.subscriptionPlan.create({ data: plan });
    createdPlans.push(p);
  }
  console.log(`✅ Created ${createdPlans.length} subscription plans`);

  // 3. Create Demo School: Delhi Public Academy
  const schoolPhone = '+919811223344';
  const demoSchool = await prisma.school.create({
    data: {
      name: 'Delhi Public Academy',
      slug: 'dps-delhi',
      code: 'DPSDELHI',
      admissionPrefix: 'DPS',
      email: 'info@delhipublicacademy.edu',
      phone: schoolPhone,
      address: 'Sector 14, Institutional Area, Rohini',
      city: 'New Delhi',
      state: 'Delhi',
      status: 'ACTIVE',
    },
  });

  // 4. Create Principal User (Password: 'school123')
  const principalPassword = await bcrypt.hash('school123', 10);
  await prisma.user.create({
    data: {
      name: 'Dr. Rajesh Sharma (Principal)',
      email: 'schooladmin@dps.com',
      password: principalPassword,
      phone: schoolPhone,
      role: 'PRINCIPAL',
      status: 'ACTIVE',
      schoolId: demoSchool.id,
    },
  });

  // Assign Yearly subscription to this demo school
  const yearlyPlan = createdPlans.find((p) => p.billingCycle === 'YEARLY') || createdPlans[0];
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 365);

  await prisma.schoolSubscription.create({
    data: {
      schoolId: demoSchool.id,
      planId: yearlyPlan.id,
      startDate,
      endDate,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      amountPaid: yearlyPlan.price,
      notes: 'Initial Annual Enterprise License',
    },
  });

  // 5. Academic Sessions (2025-2026 is Active)
  const activeSession = await prisma.academicSession.create({
    data: {
      schoolId: demoSchool.id,
      name: '2025-2026',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isActive: true,
    },
  });

  const prevSession = await prisma.academicSession.create({
    data: {
      schoolId: demoSchool.id,
      name: '2024-2025',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      isActive: false,
    },
  });
  console.log('✅ Academic Sessions created (Active: 2025-2026)');

  // 6. Departments & Designations
  const depts = ['Academics', 'Administration', 'Sports', 'Accounts'];
  for (const d of depts) {
    await prisma.department.create({ data: { schoolId: demoSchool.id, name: d } });
  }

  const designations = ['Principal', 'Senior PGT Teacher', 'TGT Teacher', 'Accountant', 'Lab Assistant'];
  for (const des of designations) {
    await prisma.designation.create({ data: { schoolId: demoSchool.id, name: des } });
  }

  // 7. Staff Members
  const teacher1 = await prisma.staff.create({
    data: {
      schoolId: demoSchool.id,
      employeeCode: 'EMP-2025-001',
      name: 'Anjali Verma',
      email: 'anjali.verma@dps.com',
      phone: '+919988776655',
      designation: 'Senior PGT Teacher',
      department: 'Academics',
      qualification: 'M.Sc Mathematics, B.Ed',
      salary: 48000,
      status: 'ACTIVE',
    },
  });

  const teacher2 = await prisma.staff.create({
    data: {
      schoolId: demoSchool.id,
      employeeCode: 'EMP-2025-002',
      name: 'Vikram Malhotra',
      email: 'vikram.m@dps.com',
      phone: '+919911223344',
      designation: 'Senior PGT Teacher',
      department: 'Academics',
      qualification: 'M.Sc Physics, B.Ed',
      salary: 47000,
      status: 'ACTIVE',
    },
  });

  const teacher3 = await prisma.staff.create({
    data: {
      schoolId: demoSchool.id,
      employeeCode: 'EMP-2025-003',
      name: 'Sunita Nair',
      email: 'sunita.nair@dps.com',
      phone: '+919822334455',
      designation: 'TGT Teacher',
      department: 'Academics',
      qualification: 'M.A English, B.Ed',
      salary: 45000,
      status: 'ACTIVE',
    },
  });

  // 8. Classes (with class teacher allocation)
  const class10A = await prisma.classRoom.create({
    data: {
      schoolId: demoSchool.id,
      name: 'Class 10',
      section: 'A',
      capacity: 45,
      roomNumber: 'Room 101',
      classTeacherId: teacher1.id,
    },
  });

  const class10B = await prisma.classRoom.create({
    data: {
      schoolId: demoSchool.id,
      name: 'Class 10',
      section: 'B',
      capacity: 45,
      roomNumber: 'Room 102',
      classTeacherId: teacher2.id,
    },
  });

  const class9A = await prisma.classRoom.create({
    data: {
      schoolId: demoSchool.id,
      name: 'Class 9',
      section: 'A',
      capacity: 40,
      roomNumber: 'Room 201',
      classTeacherId: teacher3.id,
    },
  });

  // 9. Curriculum Subjects
  const mathSub = await prisma.subject.create({
    data: {
      schoolId: demoSchool.id,
      name: 'Mathematics',
      code: 'MATH101',
      type: 'THEORY',
      description: 'Core secondary mathematics and geometry syllabus',
    },
  });

  const sciSub = await prisma.subject.create({
    data: {
      schoolId: demoSchool.id,
      name: 'Science & Physics',
      code: 'SCI102',
      type: 'BOTH',
      description: 'Physics, chemistry, and experimental lab practicals',
    },
  });

  const engSub = await prisma.subject.create({
    data: {
      schoolId: demoSchool.id,
      name: 'English Communicative',
      code: 'ENG103',
      type: 'THEORY',
      description: 'Literature, grammar, and communicative English',
    },
  });

  // 10. Subject Assignments
  await prisma.subjectAssignment.create({
    data: {
      schoolId: demoSchool.id,
      classId: class10A.id,
      subjectId: mathSub.id,
      staffId: teacher1.id,
      periodsPerWeek: 6,
    },
  });

  await prisma.subjectAssignment.create({
    data: {
      schoolId: demoSchool.id,
      classId: class10A.id,
      subjectId: sciSub.id,
      staffId: teacher2.id,
      periodsPerWeek: 5,
    },
  });

  await prisma.subjectAssignment.create({
    data: {
      schoolId: demoSchool.id,
      classId: class10A.id,
      subjectId: engSub.id,
      staffId: teacher3.id,
      periodsPerWeek: 4,
    },
  });

  // 11. Fee Structures (Class 10 and Class 9)
  const fee10 = await prisma.feeStructure.create({
    data: {
      schoolId: demoSchool.id,
      className: 'Class 10',
      academicSessionId: activeSession.id,
      billingCycle: 'MONTHLY',
      totalAnnualFee: 42000,
      heads: {
        create: [
          { name: 'Tuition Fee (Monthly)', amount: 2800, frequency: 12 },
          { name: 'Exam & Term Fee', amount: 2400, frequency: 1 },
          { name: 'Computer & Science Lab Fee', amount: 1250, frequency: 4 },
          { name: 'Library & Sports Amenities', amount: 1000, frequency: 1 },
        ],
      },
    },
  });

  const fee9 = await prisma.feeStructure.create({
    data: {
      schoolId: demoSchool.id,
      className: 'Class 9',
      academicSessionId: activeSession.id,
      billingCycle: 'MONTHLY',
      totalAnnualFee: 38000,
      heads: {
        create: [
          { name: 'Tuition Fee (Monthly)', amount: 2500, frequency: 12 },
          { name: 'Exam & Term Fee', amount: 2000, frequency: 1 },
          { name: 'Computer & Lab Fee', amount: 1500, frequency: 4 },
        ],
      },
    },
  });
  console.log('✅ Fee Structures created with multiple billing heads');

  // 12. Students Enrolled
  const students = [
    {
      admissionNo: 'DPS-2025-001',
      rollNo: '101',
      firstName: 'Aarav',
      lastName: 'Patel',
      gender: 'MALE',
      parentName: 'Ramesh Patel',
      fatherOccupation: 'Civil Engineer',
      motherName: 'Meena Patel',
      motherOccupation: 'Homemaker',
      parentPhone: '+919876501122',
      address: 'House 42, Rohini Sector 14, New Delhi',
      bloodGroup: 'B+',
      category: 'GENERAL',
      status: 'ACTIVE',
    },
    {
      admissionNo: 'DPS-2025-002',
      rollNo: '102',
      firstName: 'Diya',
      lastName: 'Kapoor',
      gender: 'FEMALE',
      parentName: 'Sanjay Kapoor',
      fatherOccupation: 'Chartered Accountant',
      motherName: 'Pooja Kapoor',
      motherOccupation: 'Professor',
      parentPhone: '+919876503344',
      address: 'Flat 302, Green Enclave, Prashant Vihar',
      bloodGroup: 'O+',
      category: 'GENERAL',
      status: 'ACTIVE',
    },
    {
      admissionNo: 'DPS-2025-003',
      rollNo: '103',
      firstName: 'Kabir',
      lastName: 'Mehta',
      gender: 'MALE',
      parentName: 'Amit Mehta',
      fatherOccupation: 'Businessman',
      motherName: 'Kiran Mehta',
      parentPhone: '+919876505566',
      address: 'Plot 15, Model Town, Delhi',
      bloodGroup: 'A+',
      category: 'OBC',
      status: 'ACTIVE',
    },
    {
      admissionNo: 'DPS-2025-004',
      rollNo: '104',
      firstName: 'Riya',
      lastName: 'Sharma',
      gender: 'FEMALE',
      parentName: 'Praveen Sharma',
      fatherOccupation: 'Government Officer',
      motherName: 'Anita Sharma',
      parentPhone: '+919876507788',
      address: 'B-12, Sector 9, Rohini',
      bloodGroup: 'AB+',
      category: 'GENERAL',
      status: 'ACTIVE',
    },
  ];

  const createdStudents = [];
  for (const s of students) {
    const st = await prisma.student.create({
      data: {
        schoolId: demoSchool.id,
        classId: class10A.id,
        academicSessionId: activeSession.id,
        ...s,
      },
    });
    createdStudents.push(st);
  }

  // 1 Pending Online Admission for review
  await prisma.student.create({
    data: {
      schoolId: demoSchool.id,
      classId: class10A.id,
      academicSessionId: activeSession.id,
      admissionNo: 'DPS-2025-005',
      rollNo: '105',
      firstName: 'Vivaan',
      lastName: 'Gupta',
      gender: 'MALE',
      parentName: 'Neeraj Gupta',
      fatherOccupation: 'Software Architect',
      motherName: 'Shalini Gupta',
      parentPhone: '+919876509900',
      address: 'C-44, Pitampura, New Delhi',
      bloodGroup: 'O-',
      status: 'PENDING', // Public Online Admission pending verification
      previousSchool: 'Modern School, Delhi',
      previousBoard: 'CBSE',
      previousMarks: '92.4%',
      hasTC: true,
      declarationAccepted: true,
    },
  });

  // 13. Fee Payments / Receipts
  await prisma.feePayment.create({
    data: {
      schoolId: demoSchool.id,
      studentId: createdStudents[0].id,
      academicSessionId: activeSession.id,
      receiptNo: 'DPS-REC-2025-0001',
      amountPaid: 8400,
      paymentMode: 'UPI',
      transactionRef: 'UPI-982187212009',
      remarks: 'Q1 Tuition & Lab Fee paid via GPay',
    },
  });

  await prisma.feePayment.create({
    data: {
      schoolId: demoSchool.id,
      studentId: createdStudents[1].id,
      academicSessionId: activeSession.id,
      receiptNo: 'DPS-REC-2025-0002',
      amountPaid: 11200,
      paymentMode: 'BANK_TRANSFER',
      transactionRef: 'NEFT-AXIS-009218',
      remarks: 'Term 1 fees full settlement',
    },
  });
  console.log('✅ Demo fee receipts generated');

  // 14. Pending Staff Self-Onboarding Application
  await prisma.staffApplication.create({
    data: {
      schoolId: demoSchool.id,
      name: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@gmail.com',
      phone: '+919833445566',
      gender: 'MALE',
      dob: new Date('1992-06-15'),
      maritalStatus: 'MARRIED',
      fatherHusbandName: 'Arun Deshmukh',
      address: 'H-52, Prashant Vihar, Rohini',
      aadharNo: '9822-1100-4499',
      panNo: 'ABCDE1234F',
      bankName: 'State Bank of India',
      accountNo: '30992144882',
      ifscCode: 'SBIN0001234',
      highestQualification: 'M.Com, B.Ed, UGC NET',
      subjectsTaught: 'Commerce, Accountancy & Economics',
      experienceYears: '6 Years',
      employmentType: 'FULL_TIME',
      expectedSalary: 45000,
      status: 'PENDING',
    },
  });
  console.log('✅ Pending staff application created');

  console.log('\n🎉 ALL SEEDING FINISHED SUCCESSFULLY!');
  console.log('👉 Super Admin: superadmin@erp.com / admin123');
  console.log(`👉 School: Delhi Public Academy (Slug: dps-delhi, Code: DPSDELHI)`);
  console.log(`👉 School Principal: schooladmin@dps.com / school123`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
