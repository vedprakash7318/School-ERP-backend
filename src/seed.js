import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import {
  User,
  School,
  AcademicSession,
  SubscriptionPlan,
  SchoolSubscription,
  ClassRoom,
  Staff,
  StaffApplication,
  Subject,
  SubjectAssignment,
  Student,
  FeeStructure,
  FeePayment,
  Department,
  Designation,
} from './models/index.js';

dotenv.config();

async function seed() {
  console.log('🌱 Connecting to MongoDB database...');
  await connectDB();

  // Clear all existing collections to guarantee 100% clean state
  await Promise.all([
    User.deleteMany({}),
    School.deleteMany({}),
    AcademicSession.deleteMany({}),
    SubscriptionPlan.deleteMany({}),
    SchoolSubscription.deleteMany({}),
    ClassRoom.deleteMany({}),
    Staff.deleteMany({}),
    StaffApplication.deleteMany({}),
    Subject.deleteMany({}),
    SubjectAssignment.deleteMany({}),
    Student.deleteMany({}),
    FeeStructure.deleteMany({}),
    FeePayment.deleteMany({}),
    Department.deleteMany({}),
    Designation.deleteMany({}),
  ]);

  console.log('🧹 Cleaned all collections. Database is fresh and empty.');

  // 1. Create Super Admin Account
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await User.create({
    name: 'Super Administrator',
    email: 'superadmin@erp.com',
    password: superAdminPassword,
    phone: '9999999999',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    school: null,
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 2. Pre-configure the 5 Multi-Cycle Subscription Plans (Daily, Weekly, Monthly, Quarterly, Yearly)
  const plans = await SubscriptionPlan.insertMany([
    {
      name: 'Trial Daily Pass',
      billingCycle: 'DAILY',
      price: 99,
      durationDays: 1,
      description: 'Single day evaluation license with full feature access.',
      maxStudents: 50,
      maxStaff: 10,
      isActive: true,
    },
    {
      name: 'Weekly Growth Starter',
      billingCycle: 'WEEKLY',
      price: 499,
      durationDays: 7,
      description: 'Weekly flexible plan for fast-growing preschools & tutorials.',
      maxStudents: 150,
      maxStaff: 20,
      isActive: true,
    },
    {
      name: 'Monthly Pro School',
      billingCycle: 'MONTHLY',
      price: 1999,
      durationDays: 30,
      description: 'Ideal monthly subscription for primary & middle schools.',
      maxStudents: 500,
      maxStaff: 50,
      isActive: true,
    },
    {
      name: 'Quarterly Academic Term',
      billingCycle: 'QUARTERLY',
      price: 4999,
      durationDays: 90,
      description: 'Covers a full academic quarter with discounted billing.',
      maxStudents: 1000,
      maxStaff: 80,
      isActive: true,
    },
    {
      name: 'Annual Enterprise Campus',
      billingCycle: 'YEARLY',
      price: 14999,
      durationDays: 365,
      description: 'Comprehensive 365-day license with unlimited academic reports.',
      maxStudents: 5000,
      maxStaff: 250,
      isActive: true,
    },
  ]);
  console.log(`✅ Pre-configured ${plans.length} Multi-Cycle Subscription Plans.`);

  console.log('\n======================================================');
  console.log('  SUPER ADMIN DATABASE INITIALIZED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Super Admin Credentials:');
  console.log('  Portal URL: http://localhost:5173/login');
  console.log('  Email:      superadmin@erp.com');
  console.log('  Password:   admin123');
  console.log('  Role:       SUPER_ADMIN');
  console.log('------------------------------------------------------');
  console.log('Status:');
  console.log('  • Schools:           0 (Clean - create your own via Super Admin)');
  console.log('  • School Owners:     0 (Will be created when you add a school)');
  console.log('  • Principals:        0 (Appointed by Owner via School App)');
  console.log('  • Students:          0');
  console.log('  • Staff:             0');
  console.log('  • Classes:           0');
  console.log('  • Subscription Plans: 5 ready (Daily, Weekly, Monthly, Quarterly, Yearly)');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Initialization failed:', err);
  process.exit(1);
});
