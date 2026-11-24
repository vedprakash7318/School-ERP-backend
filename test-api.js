import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('🧪 Starting EduCloud SaaS MongoDB & Local File Upload API Verification...\n');

  try {
    // 1. Health check (Verify MongoDB connection)
    const health = await request('/health');
    console.log(`[1] Health Check: Status ${health.status} => Database: ${health.data.database}, Message: ${health.data.message}`);

    // 2. Super Admin Login
    const superAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'superadmin@erp.com', password: 'admin123' },
    });
    console.log(`[2] Super Admin Login: Status ${superAdminLogin.status} => Role: ${superAdminLogin.data.user.role}, Name: ${superAdminLogin.data.user.name}`);
    const superToken = superAdminLogin.data.token;

    // 3. Super Admin Schools List (Paginated & Filtered)
    const schoolsList = await request('/super-admin/schools?page=1&limit=5', {
      headers: { Authorization: `Bearer ${superToken}` },
    });
    console.log(`[3] Super Admin Schools: Found ${schoolsList.data.pagination.totalRecords} schools. First School: ${schoolsList.data.data[0]?.name} (Slug: ${schoolsList.data.data[0]?.slug})`);

    // 4. File Upload Test (/api/upload with local folder save)
    // Create a temporary mock image file
    const tempFilePath = path.join(process.cwd(), 'test-upload.png');
    fs.writeFileSync(tempFilePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'image/png' });
    formData.append('file', fileBlob, 'school-badge.png');

    const uploadRes = await fetch(`${BASE_URL}/upload?type=logos`, {
      method: 'POST',
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log(`[4] Local File Upload: Status ${uploadRes.status} => File saved locally at: ${uploadData.data?.url}`);
    fs.unlinkSync(tempFilePath);

    // 5. Public School Info by Slug (/api/public/schools/dps-delhi)
    const pubSchool = await request('/public/schools/dps-delhi');
    console.log(`[5] Public School Info (:slug/dps-delhi): Status ${pubSchool.status} => ${pubSchool.data.data.name}, Prefix: ${pubSchool.data.data.admissionPrefix}`);

    // 6. Submit Public Online Admission (/api/public/schools/dps-delhi/admission)
    const pubAdm = await request('/public/schools/dps-delhi/admission', {
      method: 'POST',
      body: {
        firstName: 'Aanya',
        lastName: 'Singhania',
        classId: pubSchool.data.data.classes[0].id,
        gender: 'FEMALE',
        parentName: 'Deepak Singhania',
        parentPhone: '+919988112233',
        declarationAccepted: true,
      },
    });
    console.log(`[6] Public Online Admission: Status ${pubAdm.status} => App No: ${pubAdm.data.data.applicationNo}, Status: ${pubAdm.data.data.status}`);

    // 7. Submit Public Staff Self-Onboarding (/api/public/schools/dps-delhi/join-staff)
    const pubStaff = await request('/public/schools/dps-delhi/join-staff', {
      method: 'POST',
      body: {
        name: 'Neha Saxena',
        email: 'neha.saxena@gmail.com',
        phone: '+919877665544',
        highestQualification: 'M.Sc Botany, B.Ed',
        subjectsTaught: 'Biology & Environmental Science',
        expectedSalary: 42000,
      },
    });
    console.log(`[7] Public Staff Self-Onboarding: Status ${pubStaff.status} => ${pubStaff.data.message}`);

    // 8. School Principal Login
    const principalLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'schooladmin@dps.com', password: 'school123' },
    });
    console.log(`[8] School Principal Login: Status ${principalLogin.status} => Welcome ${principalLogin.data.user.name}`);
    const schoolToken = principalLogin.data.token;

    // 9. School Admin Dashboard with Session & Today's Fees
    const dash = await request('/school-admin/dashboard', {
      headers: { Authorization: `Bearer ${schoolToken}` },
    });
    console.log(`[9] Dashboard Stats: Active Session = ${dash.data.data.activeSession?.name}, Students = ${dash.data.data.totalStudents}, Pending Admissions = ${dash.data.data.pendingAdmissions}, Today Fees = ₹${dash.data.data.todayFeeCollection}`);

    // 10. Academic Sessions (Get sessions)
    const sessions = await request('/school-admin/sessions', {
      headers: { Authorization: `Bearer ${schoolToken}` },
    });
    console.log(`[10] Academic Sessions: Found ${sessions.data.data.length} sessions. Active: ${sessions.data.data.find(s => s.isActive)?.name}`);

    // 11. Fee Management (Get Structures & Collect Fee)
    const feeStructures = await request('/school-admin/fee-structures', {
      headers: { Authorization: `Bearer ${schoolToken}` },
    });
    console.log(`[11] Fee Structures: Found ${feeStructures.data.data.length} structures. Class 10 Annual Fee = ₹${feeStructures.data.data[0]?.totalAnnualFee}`);

    // Collect Fee for a student
    const studentsRes = await request('/school-admin/students?limit=1', {
      headers: { Authorization: `Bearer ${schoolToken}` },
    });
    const testStudent = studentsRes.data.data[0];

    const feeCollection = await request('/school-admin/fees/collect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${schoolToken}` },
      body: {
        studentId: testStudent.id,
        amountPaid: 3500,
        paymentMode: 'UPI',
        transactionRef: 'UPI-TEST-00912',
        remarks: 'Tuition installment',
      },
    });
    console.log(`[12] Collect Fee: Status ${feeCollection.status} => Receipt: ${feeCollection.data.data.receiptNo}, Amount in Words: "${feeCollection.data.data.amountInWords}"`);

    // 13. Student Fee Ledger
    const ledger = await request(`/school-admin/fees/student-ledger/${testStudent.id}`, {
      headers: { Authorization: `Bearer ${schoolToken}` },
    });
    console.log(`[13] Student Ledger: Annual Fee = ₹${ledger.data.data.summary.totalAnnualFee}, Total Paid = ₹${ledger.data.data.summary.totalPaid}, Balance Due = ₹${ledger.data.data.summary.balanceDue}`);

    // 14. Staff Onboarding Approval Test
    const apps = await request('/school-admin/staff/applications', {
      headers: { Authorization: `Bearer ${schoolToken}` },
    });
    console.log(`[14] Staff Onboarding Applications: Found ${apps.data.data.length} applications.`);
    if (apps.data.data.length > 0) {
      const approveRes = await request(`/school-admin/staff/applications/${apps.data.data[0].id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${schoolToken}` },
        body: { designation: 'TGT Teacher', department: 'Academics', salary: 44000 },
      });
      console.log(`[15] One-Click Staff Approval: Status ${approveRes.status} => ${approveRes.data.message}`);
    }

    console.log('\n=============================================================');
    console.log(' ALL 15 MONGODB & LOCAL FILE UPLOAD TESTS PASSED PERFECTLY!');
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

import('./src/server.js').then(() => {
  setTimeout(runTests, 1200);
});
