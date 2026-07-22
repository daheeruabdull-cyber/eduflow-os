const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = 'eduflow_saas_secret_key_12345';

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper Middleware to verify JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ==================== AUTHENTICATION ENDPOINTS ====================

// unified single sign-in gateway
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Login identifier is required.' });
  }

  const cleanId = identifier.trim();

  // 1. SaaS Super-Admin Bypass
  if (cleanId.toLowerCase() === 'superadmin' && (password === 'password123' || !password)) {
    const token = jwt.sign({ id: 'superadmin', role: 'superadmin' }, JWT_SECRET, { expiresIn: '4h' });
    return res.status(200).json({ token, role: 'superadmin' });
  }

  // 1b. Demo Credentials Fallback Gateway (password123)
  if (password === 'password123' || !password || password === 'admin' || password === 'teacher' || password === 'parent' || password === 'student') {
    const idLower = cleanId.toLowerCase();
    
    // Principal / Admin Demo
    if (idLower === 'demo@eduflow.com' || idLower === 'admin' || idLower === 'principal@apexschool.ng' || idLower.includes('admin') || idLower.includes('principal')) {
      const token = jwt.sign({ id: 'school_demo', role: 'admin', schoolId: 'school_demo' }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({ token, role: 'admin', schoolId: 'school_demo', schoolName: 'EDULITE ACADEMY, LAGOS' });
    }
    
    // Form Master / Teacher Demo
    if (idLower === 'teacher@eduflow.com' || idLower === 'teacher' || idLower.includes('teacher')) {
      const token = jwt.sign({ id: 'teacher_1', role: 'teacher', schoolId: 'school_demo' }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({ token, role: 'teacher', schoolId: 'school_demo', email: 'teacher@eduflow.com' });
    }

    // Parent Demo
    if (idLower === 'parent@eduflow.com' || idLower === 'parent' || idLower === 'parent.tobi@gmail.com' || idLower.includes('parent')) {
      const token = jwt.sign({ id: 'parent@eduflow.com', role: 'parent', children: [1] }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({ token, role: 'parent', email: 'parent@eduflow.com', children: [1] });
    }

    // Student Demo
    if (idLower === 'tobi@eduflow.com' || idLower === 'student' || idLower === '2026/g10a/001' || idLower.includes('student') || idLower.includes('2026/')) {
      const token = jwt.sign({ id: 1, role: 'student', schoolId: 'school_demo', studentId: 1 }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({ token, role: 'student', schoolId: 'school_demo', studentId: 1, studentName: 'Adebayo Tobi' });
    }
  }

  // 2. Parent Portal Sign-In
  const parentQuery = db.prepare("SELECT * FROM parents WHERE email = ?");
  const parent = parentQuery.get(cleanId.toLowerCase());
  if (parent) {
    if (bcrypt.compareSync(password || '', parent.password)) {
      const childrenIds = JSON.parse(parent.children);
      const token = jwt.sign({ id: parent.email, role: 'parent', children: childrenIds }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({ token, role: 'parent', email: parent.email, children: childrenIds });
    } else {
      return res.status(401).json({ error: 'Incorrect passcode entered.' });
    }
  }

  // 3. School Admin Sign-In (check email or school ID)
  const schoolQuery = db.prepare("SELECT * FROM schools WHERE id = ? OR email = ?");
  const school = schoolQuery.get(cleanId, cleanId.toLowerCase());
  if (school) {
    if (bcrypt.compareSync(password || '', school.password)) {
      const token = jwt.sign({ id: school.id, role: 'admin', schoolId: school.id }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({ token, role: 'admin', schoolId: school.id, schoolName: school.name });
    } else {
      return res.status(401).json({ error: 'Incorrect portal access credentials.' });
    }
  }

  // 4. Student Sign-In (by Roll Number lookup)
  const studentQuery = db.prepare("SELECT * FROM students WHERE LOWER(roll) = ?");
  const student = studentQuery.get(cleanId.toLowerCase());
  if (student) {
    const token = jwt.sign({ id: student.id, role: 'student', schoolId: student.schoolId, studentId: student.id }, JWT_SECRET, { expiresIn: '4h' });
    return res.status(200).json({ token, role: 'student', schoolId: student.schoolId, studentId: student.id, studentName: student.name });
  }

  return res.status(401).json({ error: 'Account credentials not matched in system directory.' });
});

// ==================== 4-STAGE NIGERIAN ONBOARDING ENGINE ENDPOINTS ====================

// Step 1: Provision Campus Tenant Endpoint
app.post('/api/v1/onboard/provision', (req, res) => {
  const { schoolName, subdomainSlug, category, state, lga, adminName, adminPhone, adminEmail } = req.body;
  if (!schoolName || !subdomainSlug) {
    return res.status(400).json({ error: 'School name and subdomain slug are required.' });
  }

  const slug = subdomainSlug.toLowerCase().replace(/[^\w]/g, '');
  const domainUrl = `${slug}.eduflow.ng`;

  // Auto-seeded Nigerian academic defaults
  const defaults = {
    terms: ["First Term (Harmattan)", "Second Term (Spring)", "Third Term (Summer)"],
    scoringWeights: { ca: 40, exam: 60 },
    gradingScales: {
      secondary: [
        { grade: 'A1', min: 75, max: 100, remark: 'Excellent' },
        { grade: 'B2', min: 70, max: 74, remark: 'Very Good' },
        { grade: 'B3', min: 65, max: 69, remark: 'Good' },
        { grade: 'C4', min: 60, max: 64, remark: 'Credit' },
        { grade: 'C5', min: 55, max: 59, remark: 'Credit' },
        { grade: 'C6', min: 50, max: 54, remark: 'Credit' },
        { grade: 'D7', min: 45, max: 49, remark: 'Pass' },
        { grade: 'E8', min: 40, max: 44, remark: 'Pass' },
        { grade: 'F9', min: 0, max: 39, remark: 'Fail' }
      ]
    }
  };

  return res.status(201).json({
    status: 'success',
    tenant: {
      id: `school_${slug}`,
      name: schoolName,
      subdomain: domainUrl,
      category: category || 'All-Through',
      location: `${lga}, ${state} State, Nigeria`,
      adminName,
      adminPhone,
      adminEmail,
      defaults
    }
  });
});

// Step 2: Validate CSV Endpoint
app.post('/api/v1/onboard/validate-csv', (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: 'Rows array required for validation.' });
  }

  const validated = rows.map((r, idx) => {
    let phone = (r.phone || '').trim().replace(/\s+/g, '');
    let status = 'valid';
    let statusText = '✓ Valid';

    if (phone.startsWith('0') && phone.length === 11) {
      phone = '+234' + phone.substring(1);
      status = 'reformatted';
      statusText = '🔄 Reformatted (+234)';
    } else if (!phone.startsWith('+234') || phone.length < 13) {
      status = 'error';
      statusText = '⚠️ Invalid Phone Format';
    }

    return {
      rowNum: idx + 1,
      name: r.name || `Student #${idx+1}`,
      class: r.class || 'SSS 1 Science',
      phone,
      status,
      statusText
    };
  });

  return res.status(200).json({ status: 'success', rows: validated });
});

// Step 4: Complete Onboarding & Launch Endpoint
app.post('/api/v1/onboard/complete', (req, res) => {
  const payload = req.body;
  
  // Simulated WhatsApp & SMS broadcast trigger
  console.log(`[WhatsApp Broadcast Engine] Dispatched magic login links to ${payload.validatedRows ? payload.validatedRows.length : 0} contacts for ${payload.schoolName || 'Campus'}`);

  return res.status(200).json({
    status: 'success',
    message: 'Onboarding completed and Nigerian academic defaults initialized successfully.',
    dashboardUrl: '/dashboard.html?role=admin'
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

// ==================== UNIVERSAL DATABASE REST APIS ====================

// GET: Compiles all SQLite data into a single schema matching original db.json structures
app.get('/api/db', (req, res) => {
  try {
    const schools = db.prepare("SELECT * FROM schools").all();
    const students = db.prepare("SELECT * FROM students").all();
    const attendanceRows = db.prepare("SELECT * FROM attendance").all();
    const payments = db.prepare("SELECT * FROM payments").all();
    const timetableRows = db.prepare("SELECT * FROM timetable").all();
    const notifications = db.prepare("SELECT * FROM notifications").all();
    const teachers = db.prepare("SELECT * FROM teachers").all();

    // Decode JSON fields
    schools.forEach(s => {
      s.classes = s.classes ? JSON.parse(s.classes) : [];
      s.config = s.config ? JSON.parse(s.config) : {};
    });

    students.forEach(st => {
      st.grades = st.grades ? JSON.parse(st.grades) : {};
      st.fees = st.fees ? JSON.parse(st.fees) : {};
    });

    const attendance = {};
    attendanceRows.forEach(a => {
      attendance[a.date] = JSON.parse(a.records);
    });

    const timetable = {};
    timetableRows.forEach(t => {
      timetable[t.class] = JSON.parse(t.data);
    });

    const mergedDB = { schools, students, attendance, payments, timetable, notifications, teachers };
    res.status(200).json(mergedDB);
  } catch (err) {
    res.status(500).json({ error: "Failed to compile database structures.", details: err.message });
  }
});

// POST: Accepts a unified DB state object and syncs it back to SQLite tables
app.post('/api/db', (req, res) => {
  try {
    const newDB = req.body;
    if (!newDB) return res.status(400).json({ error: "Empty database payload." });

    // Sync Schools
    if (Array.isArray(newDB.schools)) {
      const upsertSchool = db.prepare(`
        INSERT INTO schools (id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat, password, logo, phone, address, registrar, paymentMethod, paymentProof, state, lga, classes, config)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, email=excluded.email, type=excluded.type, kycStatus=excluded.kycStatus, 
          subscriptionStatus=excluded.subscriptionStatus, plan=excluded.plan, reportCardFormat=excluded.reportCardFormat,
          logo=excluded.logo, phone=excluded.phone, address=excluded.address, registrar=excluded.registrar,
          paymentMethod=excluded.paymentMethod, paymentProof=excluded.paymentProof, state=excluded.state, lga=excluded.lga,
          classes=excluded.classes, config=excluded.config
      `);
      newDB.schools.forEach(s => {
        // Enforce default hashed password if not present
        let pwd = s.password || '';
        if (pwd && !pwd.startsWith('$2a$')) {
          pwd = bcrypt.hashSync(pwd, 10);
        }
        upsertSchool.run(
          s.id, s.name, s.email, s.type, s.kycStatus, s.subscriptionStatus, s.plan, s.reportCardFormat,
          pwd, s.logo || '', s.phone || '', s.address || '', s.registrar || '', s.paymentMethod || '',
          s.paymentProof || '', s.state || '', s.lga || '',
          JSON.stringify(s.classes || []), JSON.stringify(s.config || {})
        );
      });
    }

    // Sync Students
    if (Array.isArray(newDB.students)) {
      // Clear students to match the payload list
      db.exec("DELETE FROM students");
      const insertStudent = db.prepare(`
        INSERT INTO students (id, schoolId, name, class, roll, grades, fees)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      newDB.students.forEach(st => {
        insertStudent.run(
          st.id, st.schoolId, st.name, st.class, st.roll,
          JSON.stringify(st.grades || {}), JSON.stringify(st.fees || {})
        );
      });
    }

    // Sync Attendance
    if (newDB.attendance) {
      db.exec("DELETE FROM attendance");
      const insertAttendance = db.prepare(`
        INSERT INTO attendance (schoolId, date, records)
        VALUES (?, ?, ?)
      `);
      Object.keys(newDB.attendance).forEach(date => {
        // Assume default schoolId matching first student or standard school
        insertAttendance.run("school_demo", date, JSON.stringify(newDB.attendance[date]));
      });
    }

    // Sync Payments
    if (Array.isArray(newDB.payments)) {
      db.exec("DELETE FROM payments");
      const insertPayment = db.prepare(`
        INSERT INTO payments (id, schoolId, studentId, studentName, item, amount, date, reference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      newDB.payments.forEach(p => {
        insertPayment.run(p.id, p.schoolId, p.studentId, p.studentName, p.item, p.amount, p.date, p.reference, p.status);
      });
    }

    // Sync Timetable
    if (newDB.timetable) {
      db.exec("DELETE FROM timetable");
      const insertTimetable = db.prepare(`
        INSERT INTO timetable (schoolId, class, data)
        VALUES (?, ?, ?)
      `);
      Object.keys(newDB.timetable).forEach(cls => {
        insertTimetable.run("school_demo", cls, JSON.stringify(newDB.timetable[cls]));
      });
    }

    // Sync Notifications
    if (Array.isArray(newDB.notifications)) {
      db.exec("DELETE FROM notifications");
      const insertNotification = db.prepare(`
        INSERT INTO notifications (id, schoolId, recipient, channel, destination, type, message, date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      newDB.notifications.forEach(n => {
        insertNotification.run(n.id, n.schoolId, n.recipient, n.channel, n.destination, n.type, n.message, n.date, n.status);
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to sync database modifications.", details: err.message });
  }
});

// Endpoint to fetch child list for a logged-in parent
app.get('/api/parent/children', authenticateToken, (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Unprivileged access' });
  }
  try {
    const placeholders = req.user.children.map(() => '?').join(',');
    const query = db.prepare(`SELECT * FROM students WHERE id IN (${placeholders})`);
    const children = query.all(...req.user.children);
    children.forEach(c => {
      c.grades = c.grades ? JSON.parse(c.grades) : {};
      c.fees = c.fees ? JSON.parse(c.fees) : {};
    });
    res.status(200).json(children);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve child registries.', details: err.message });
  }
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`Eduflow Full-Stack Express Server running on http://localhost:${PORT}`);
});
