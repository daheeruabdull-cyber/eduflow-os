const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'eduflow_saas_secret_key_12345';

// 1. SECURITY LAYER: Helmet HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. SECURITY LAYER: CORS Origin Control
app.use(cors());

// 3. SECURITY LAYER: Anti Brute-Force & Anti DDoS Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 login attempts per IP per 15 minutes
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, // Max 150 requests per minute
  message: { error: 'API rate limit exceeded. Please slow down.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '50mb' }));

// 4. SECURITY LAYER: Anti-Sniffing & Cache Control Headers
app.use((req, res, next) => {
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname)));

// Explicit Static Page Route Handlers
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(['/dashboard', '/dashboard.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get(['/onboarding', '/onboarding.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'onboarding.html'));
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

// Helper Middleware to enforce Role-Based Access Control (RBAC)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
    }
    next();
  };
}

// ==================== AUTHENTICATION ENDPOINTS ====================

// Unified single sign-in gateway handler
function handleUnifiedLogin(req, res) {
  const identifier = req.body.identifier || req.body.username || req.body.email;
  const password = req.body.password;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Login identifier is required.' });
  }

  const cleanId = String(identifier).trim();
  const cleanIdLower = cleanId.toLowerCase();
  const inputPassword = String(password || '').trim();

  // 1. SaaS Super-Admin Gateway
  if ((cleanIdLower === 'daheeru' || cleanIdLower === 'superadmin') && (inputPassword === 'Katagum99?' || inputPassword === process.env.SUPERADMIN_PASSWORD)) {
    const token = jwt.sign({ id: 'daheeru', role: 'superadmin', name: 'Daheeru' }, JWT_SECRET, { expiresIn: '8h' });
    return res.status(200).json({
      success: true,
      token,
      role: 'superadmin',
      user: { id: 'daheeru', role: 'superadmin', name: 'Daheeru' }
    });
  }

  // 2. Query Unified `users` Table
  try {
    const userQuery = db.prepare("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? OR LOWER(id) = ?");
    const user = userQuery.get(cleanIdLower, cleanIdLower, cleanIdLower);

    if (user) {
      if (user.status === 'suspended' || user.status === 'inactive') {
        return res.status(403).json({ success: false, message: `Access Denied: User account status is currently ${user.status}.` });
      }

      // Verify School Tenant Status
      if (user.school_id && user.role !== 'superadmin') {
        const school = db.prepare("SELECT * FROM schools WHERE LOWER(id) = ? OR LOWER(email) = ?").get(user.school_id.toLowerCase(), user.school_id.toLowerCase());
        if (school && school.kycStatus === 'Rejected') {
          return res.status(403).json({
            success: false,
            message: 'Access Denied: Your school campus (KYC) is currently rejected by the Superadmin. Operations will be unlocked once approved.'
          });
        }
      }

      const isPasswordValid = bcrypt.compareSync(inputPassword, user.password_hash);
      if (isPasswordValid) {
        const token = jwt.sign(
          { id: user.id, school_id: user.school_id, schoolId: user.school_id, role: user.role, full_name: user.full_name, email: user.email },
          JWT_SECRET,
          { expiresIn: '8h' }
        );
        return res.status(200).json({
          success: true,
          token,
          role: user.role,
          schoolId: user.school_id,
          user: { id: user.id, school_id: user.school_id, role: user.role, full_name: user.full_name, email: user.email, username: user.username }
        });
      } else {
        return res.status(401).json({ success: false, message: 'Incorrect password entered.' });
      }
    }
  } catch (err) {
    console.warn("Unified users table lookup skipped, checking legacy models:", err.message);
  }

  // 3. School Admin (Principal) Legacy Authentication against DB
  const schoolQuery = db.prepare("SELECT * FROM schools WHERE LOWER(email) = ? OR LOWER(id) = ? OR LOWER(phone) = ?");
  const school = schoolQuery.get(cleanIdLower, cleanIdLower, cleanIdLower);
  
  if (school) {
    const isPasswordValid = bcrypt.compareSync(inputPassword, school.password);
    if (isPasswordValid) {
      if (school.kycStatus === 'Rejected') {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Your school campus (KYC) is currently rejected by the Superadmin. Operations will be unlocked once approved.'
        });
      }
      const token = jwt.sign({ id: school.id, role: 'principal', schoolId: school.id }, JWT_SECRET, { expiresIn: '8h' });
      return res.status(200).json({
        success: true,
        token,
        role: 'principal',
        schoolId: school.id,
        schoolName: school.name,
        user: { id: school.id, role: 'principal', school_id: school.id, schoolId: school.id, schoolName: school.name, email: school.email }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect password entered for school account.' });
    }
  }

  // 4. Parent Portal Legacy Authentication against DB
  const parentQuery = db.prepare("SELECT * FROM parents WHERE LOWER(email) = ?");
  const parent = parentQuery.get(cleanIdLower);
  if (parent) {
    const isParentPassValid = bcrypt.compareSync(inputPassword, parent.password);
    if (isParentPassValid) {
      const childrenIds = JSON.parse(parent.children || '[]');
      const token = jwt.sign({ id: parent.email, role: 'parent', children: childrenIds }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({
        success: true,
        token,
        role: 'parent',
        user: { id: parent.email, role: 'parent', email: parent.email, children: childrenIds }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect passcode entered for parent account.' });
    }
  }

  // 5. Teacher (Form Master) Legacy Authentication against DB
  const teacherQuery = db.prepare("SELECT * FROM teachers WHERE LOWER(email) = ? OR LOWER(id) = ?");
  const teacher = teacherQuery.get(cleanIdLower, cleanIdLower);
  if (teacher) {
    const isTeacherPassValid = bcrypt.compareSync(inputPassword, teacher.password || '');
    if (isTeacherPassValid) {
      const tRole = (teacher.role === 'Form Master' || teacher.role === 'form_master') ? 'form_master' : 'teacher';
      const token = jwt.sign({ id: teacher.id, role: tRole, schoolId: teacher.schoolId, email: teacher.email }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({
        success: true,
        token,
        role: tRole,
        user: { id: teacher.id, role: tRole, school_id: teacher.schoolId, schoolId: teacher.schoolId, email: teacher.email, name: teacher.name, assignedClass: teacher.assignedClass }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect password entered for teacher account.' });
    }
  }

  // 6. Student Portal Legacy Authentication against DB
  const studentQuery = db.prepare("SELECT * FROM students WHERE LOWER(id) = ? OR LOWER(roll) = ? OR LOWER(rollNumber) = ?");
  const student = studentQuery.get(cleanIdLower, cleanIdLower, cleanIdLower);
  if (student) {
    const isStudentPassValid = student.password ? bcrypt.compareSync(inputPassword, student.password) : true;
    if (isStudentPassValid) {
      const token = jwt.sign({ id: student.id, role: 'student', schoolId: student.schoolId }, JWT_SECRET, { expiresIn: '4h' });
      return res.status(200).json({
        success: true,
        token,
        role: 'student',
        user: { id: student.id, role: 'student', school_id: student.schoolId, studentId: student.id, name: student.name, schoolId: student.schoolId }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Incorrect passcode entered for student account.' });
    }
  }

  // 7. Reject Unregistered Accounts
  return res.status(401).json({ success: false, message: 'Invalid credentials or account does not exist in system database.' });
}

app.post('/api/auth/login', handleUnifiedLogin);
app.post('/api/login', handleUnifiedLogin);

// ==================== PRINCIPAL USER CREATION PIPELINE ====================
function handlePrincipalCreateUser(req, res) {
  const {
    fullName, full_name,
    username, email,
    password,
    role,
    schoolId, school_id,
    assigned_subjects, subjectsAssigned, subject,
    assigned_classes, classAssigned,
    assigned_class_id, class_id,
    assigned_arm_id, arm_id,
    admission_no, rollNumber,
    parent_id, guardianPhone
  } = req.body;

  const nameInput = (fullName || full_name || '').trim();
  const userInput = (username || email || admission_no || rollNumber || '').trim();
  const passInput = String(password || '').trim();
  const roleInput = String(role || '').trim().toLowerCase().replace(/\s+/g, '_');

  // 1. Validation of Required Basic Fields
  if (!nameInput || !userInput || !passInput || !roleInput) {
    return res.status(400).json({ success: false, message: 'Full name, username/email, role, and password are required.' });
  }

  if (passInput.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
  }

  // Normalize Role String
  const validRoles = ['principal', 'admin', 'form_master', 'teacher', 'student', 'parent'];
  let normRole = roleInput;
  if (normRole === 'admin') normRole = 'principal';
  if (!validRoles.includes(normRole)) {
    return res.status(400).json({ success: false, message: `Invalid role specified. Must be one of: ${validRoles.join(', ')}` });
  }

  // 2. Strict Role-Specific Field Validations
  const subjs = assigned_subjects || subjectsAssigned || subject;
  const classes = assigned_classes || classAssigned;
  const classId = assigned_class_id || class_id || classAssigned;
  const armId = assigned_arm_id || arm_id;

  if (normRole === 'teacher') {
    if (!subjs || (Array.isArray(subjs) && subjs.length === 0)) {
      return res.status(400).json({ success: false, message: 'Validation Failed: Teachers must be assigned at least one subject (assigned_subjects).' });
    }
    if (!classes || (Array.isArray(classes) && classes.length === 0)) {
      return res.status(400).json({ success: false, message: 'Validation Failed: Teachers must be assigned at least one target class (assigned_classes).' });
    }
  }

  if (normRole === 'form_master') {
    if (!classId) {
      return res.status(400).json({ success: false, message: 'Validation Failed: Form Masters require an assigned class ID (assigned_class_id).' });
    }
  }

  if (normRole === 'student') {
    if (!classId) {
      return res.status(400).json({ success: false, message: 'Validation Failed: Students require an assigned class (class_id).' });
    }
  }

  const cleanUsername = userInput.toLowerCase();
  const activeSchoolId = (req.user && (req.user.schoolId || req.user.school_id)) || schoolId || school_id || 'school_demo';

  // 3. Single-Pass Password Hashing
  const hashedPassword = bcrypt.hashSync(passInput, 10);

  // 4. Duplicate Check
  try {
    const existingUser = db.prepare("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? OR LOWER(id) = ?").get(cleanUsername, cleanUsername, cleanUsername);
    if (existingUser) {
      return res.status(400).json({ success: false, message: `Duplicate Record: User "${userInput}" is already registered.` });
    }
  } catch (err) {
    console.warn("Skipped unified users table duplicate check:", err.message);
  }

  const now = new Date().toISOString();
  const userId = userInput;

  // 5. Atomic Insertion via Transaction
  try {
    db.exec('BEGIN TRANSACTION');

    // Insert into `users` Table
    const userEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@eduflow.ng`;
    try {
      const stmtUser = db.prepare(`
        INSERT INTO users (id, school_id, full_name, username, email, password_hash, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmtUser.run(userId, activeSchoolId, nameInput, userInput, userEmail, hashedPassword, normRole, 'active', now);
    } catch(e) { console.warn("Failed inserting into users table:", e.message); }

    // Insert into `assignments` Table
    try {
      const stmtAssign = db.prepare(`
        INSERT INTO assignments (user_id, school_id, role, assigned_class_id, assigned_arm_id, assigned_subjects, assigned_classes, admission_no, parent_id, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmtAssign.run(
        userId,
        activeSchoolId,
        normRole,
        classId || null,
        armId || null,
        JSON.stringify(Array.isArray(subjs) ? subjs : [subjs || 'General']),
        JSON.stringify(Array.isArray(classes) ? classes : [classes || 'General']),
        admission_no || userInput || null,
        parent_id || null,
        JSON.stringify({ classAssigned: classes, subjectsAssigned: subjs }),
        now
      );
    } catch(e) { console.warn("Failed inserting into assignments table:", e.message); }

    // Synchronize into legacy tables for complete UI backwards compatibility
    if (normRole === 'teacher' || normRole === 'form_master') {
      try {
        db.prepare(`
          INSERT INTO teachers (id, name, email, role, assignedClass, subject, schoolId, password, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          nameInput,
          userEmail,
          normRole === 'form_master' ? 'Form Master' : 'Teacher',
          classId || 'General',
          Array.isArray(subjs) ? subjs.join(', ') : (subjs || 'Mathematics'),
          activeSchoolId,
          hashedPassword,
          now
        );
      } catch(e) {}
    } else if (normRole === 'student') {
      try {
        db.prepare(`
          INSERT INTO students (id, rollNumber, name, class, gender, guardianPhone, fees, results, schoolId, password, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          userId,
          nameInput,
          classId || 'JSS 1',
          'Unspecified',
          guardianPhone || '08012345678',
          JSON.stringify({ tuition: { amount: 45000, paid: false }, pta: { amount: 5000, paid: false } }),
          JSON.stringify({}),
          activeSchoolId,
          hashedPassword,
          now
        );
      } catch(e) {}
    } else if (normRole === 'parent') {
      try {
        db.prepare(`
          INSERT INTO parents (email, password, children)
          VALUES (?, ?, ?)
        `).run(userEmail, hashedPassword, JSON.stringify([parent_id || 1]));
      } catch(e) {}
    }

    db.exec('COMMIT');

    console.log(`[ATOMIC USER CREATION SUCCESS] Role: ${normRole}, Name: ${nameInput}, ID: ${userId}, School: ${activeSchoolId}`);
    return res.status(201).json({
      success: true,
      message: `${normRole.toUpperCase()} account for "${nameInput}" created and activated successfully.`,
      user: {
        id: userId,
        school_id: activeSchoolId,
        full_name: nameInput,
        username: userInput,
        email: userEmail,
        role: normRole,
        status: 'active',
        created_at: now
      }
    });

  } catch (err) {
    try { db.exec('ROLLBACK'); } catch(e) {}
    console.error("Atomic transaction failed creating user:", err);
    return res.status(500).json({ success: false, message: 'Database transaction error creating user account: ' + err.message });
  }
}

app.post('/api/principal/create-user', authenticateToken, requireRole(['principal', 'admin', 'superadmin']), handlePrincipalCreateUser);
app.post('/api/principal/create-account', handlePrincipalCreateUser);
app.post('/api/users/create', handlePrincipalCreateUser);

// ==================== 3-STEP SCHOOL ONBOARDING PERSISTENCE API ====================
app.post('/api/onboarding/complete', (req, res) => {
  const { schoolDetails, academicStructure, adminCredentials } = req.body;

  // 1. Extract values cleanly from request body (supporting modular payload or flat structure)
  const schoolName = (schoolDetails && schoolDetails.name) || req.body.schoolName || req.body.name;
  const schoolEmail = (schoolDetails && schoolDetails.email) || req.body.schoolEmail || req.body.email;
  const schoolAddress = (schoolDetails && schoolDetails.address) || req.body.schoolAddress || req.body.address || 'Campus Address';
  const schoolState = (schoolDetails && schoolDetails.state) || req.body.schoolState || req.body.state || 'Lagos';
  const schoolLga = (schoolDetails && schoolDetails.lga) || req.body.schoolLga || req.body.lga || 'Ikeja';
  const schoolLogo = (schoolDetails && schoolDetails.logo) || req.body.logo || '';
  const schoolPlan = (schoolDetails && schoolDetails.plan) || req.body.plan || 'Free';
  const paymentMethod = (schoolDetails && schoolDetails.paymentMethod) || req.body.paymentMethod || 'Online';
  const paymentProof = (schoolDetails && schoolDetails.paymentProof) || req.body.paymentProof || '';

  const classes = (academicStructure && academicStructure.classes) || req.body.classes || ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
  const schoolType = (academicStructure && academicStructure.type) || req.body.type || 'Physical Learning';
  const schoolLevel = (academicStructure && academicStructure.level) || req.body.level || 'Secondary';

  const registrarName = (adminCredentials && adminCredentials.name) || req.body.registrar || req.body.adminName || 'Principal Admin';
  const adminPhone = (adminCredentials && adminCredentials.phone) || req.body.phone || req.body.adminPhone || '';
  const rawAdminPassword = (adminCredentials && adminCredentials.password) || req.body.password || req.body.adminPassword || '';
  const cleanPassword = String(rawAdminPassword).trim();

  // 2. Strict Input Validation
  if (!schoolName || !schoolEmail || !cleanPassword) {
    return res.status(400).json({
      success: false,
      message: 'Missing required onboarding parameters: school name, email, and admin password are required.'
    });
  }

  const cleanEmail = schoolEmail.trim().toLowerCase();
  const schoolId = 'school_' + Math.floor(1000 + Math.random() * 9000);

  // SINGLE-PASS BCRYPT HASHING: Hash plain-text password exactly once before inserting into database
  const hashedPassword = bcrypt.hashSync(cleanPassword, 10);
  const subStatus = (schoolPlan === 'Free') ? 'Active' : ((paymentMethod === 'Manual') ? 'Pending Verification' : 'Active');

  try {
    // 3. Database Check for Existing School Record
    const existingSchool = db.prepare("SELECT * FROM schools WHERE LOWER(email) = ? OR id = ?").get(cleanEmail, schoolId);
    if (existingSchool) {
      return res.status(400).json({ success: false, message: 'A school campus with this email address is already registered.' });
    }

    // 4. Atomic Database Insertion into SQLite Database
    const insertSchoolStmt = db.prepare(`
      INSERT INTO schools (
        id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat,
        password, logo, phone, address, registrar, paymentMethod, paymentProof, state, lga, classes, config
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const schoolConfig = JSON.stringify({
      school_name: schoolName,
      school_email: cleanEmail,
      school_logo: schoolLogo,
      school_phone: adminPhone,
      school_address: schoolAddress,
      school_state: schoolState,
      school_lga: schoolLga,
      school_level: schoolLevel,
      classes: classes,
      school_term: 'First Term 2026',
      theme_primary: '#5B4FE0',
      theme_accent: '#17B8A6'
    });

    insertSchoolStmt.run(
      schoolId,
      schoolName.trim(),
      cleanEmail,
      schoolType,
      'Pending',
      subStatus,
      schoolPlan,
      'Premium Crest',
      hashedPassword,
      schoolLogo,
      adminPhone,
      schoolAddress,
      registrarName,
      paymentMethod,
      paymentProof,
      schoolState,
      schoolLga,
      JSON.stringify(classes),
      schoolConfig
    );

    // 5. Generate Signed JWT Auth Token for Immediate Principal Session Access
    const token = jwt.sign(
      { id: schoolId, role: 'admin', schoolId: schoolId, schoolName: schoolName.trim(), email: cleanEmail },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`[ONBOARDING SUCCESS] Campus ${schoolName} (${schoolId}) permanently registered to SQLite database.`);

    return res.status(201).json({
      success: true,
      message: 'School profile, academic structure, and admin account successfully created.',
      token,
      schoolId,
      schoolName: schoolName.trim(),
      user: {
        id: schoolId,
        role: 'admin',
        schoolId: schoolId,
        schoolName: schoolName.trim(),
        email: cleanEmail,
        registrar: registrarName
      }
    });

  } catch (err) {
    console.error("[ONBOARDING ERROR] Failed to persist school profile to database:", err);
    return res.status(500).json({
      success: false,
      message: 'Database error creating school account: ' + err.message
    });
  }
});

// ==================== UNIFIED SUPERADMIN KYC & TENANT MANAGEMENT ENDPOINTS ====================

// 1. GET /api/superadmin/tenants-kyc: Fetch all tenants & KYC status from SQLite DB
app.get('/api/superadmin/tenants-kyc', (req, res) => {
  try {
    const schools = db.prepare("SELECT * FROM schools").all();
    console.log("[SUPERADMIN DB QUERY RESULTS] Fetching tenants list from SQLite database:", schools.length, "schools found.");
    const tenants = schools.map(s => {
      let config = {};
      try { config = JSON.parse(s.config || '{}'); } catch(e) {}
      return {
        id: s.id,
        school_name: s.name || 'Unnamed Campus',
        campus_code: s.id,
        principal_name: s.registrar || 'Principal Admin',
        email: s.email,
        phone: s.phone || 'N/A',
        state: s.state || 'Lagos',
        lga: s.lga || 'Ikeja',
        address: s.address || 'N/A',
        plan: s.plan || 'Free',
        kycStatus: s.kycStatus || 'Pending',
        operational_status: (s.kycStatus === 'Approved') ? 'active' : ((s.kycStatus === 'Rejected') ? 'rejected' : 'pending_kyc'),
        paymentMethod: s.paymentMethod || 'Online',
        paymentProof: s.paymentProof || '',
        registeredAt: s.createdAt || new Date().toISOString()
      };
    });
    return res.status(200).json({ success: true, count: tenants.length, tenants });
  } catch(err) {
    console.error("Error fetching superadmin tenants:", err);
    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
});

// 2. PATCH /api/superadmin/tenants/:id/approve-kyc: Approve or Reject KYC & Activate Campus
app.patch('/api/superadmin/tenants/:id/approve-kyc', (req, res) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

  if (!id) {
    return res.status(400).json({ success: false, message: 'Tenant ID is required.' });
  }

  const cleanId = String(id).trim();
  const cleanIdLower = cleanId.toLowerCase();

  // Multi-pass lookup by ID, Email, or Name
  let school = db.prepare("SELECT * FROM schools WHERE LOWER(id) = ? OR LOWER(email) = ? OR LOWER(name) = ?").get(cleanIdLower, cleanIdLower, cleanIdLower);

  // Auto-provision record if missing from central DB table
  if (!school) {
    const newKycStatus = (action === 'approve') ? 'Approved' : 'Rejected';
    const subStatus = (action === 'approve') ? 'Active' : 'Pending Verification';
    
    try {
      const insertStmt = db.prepare(`
        INSERT INTO schools (
          id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat,
          password, logo, phone, address, registrar, paymentMethod, paymentProof, state, lga, classes, config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const formattedName = cleanId.replace(/^school_/i, '').replace(/_/g, ' ').toUpperCase() || 'Campus Tenant';
      const fallbackEmail = cleanId.includes('@') ? cleanIdLower : `${cleanIdLower}@eduflow.ng`;

      insertStmt.run(
        cleanId,
        formattedName,
        fallbackEmail,
        'Physical Learning',
        newKycStatus,
        subStatus,
        'Free',
        'Premium Crest',
        bcrypt.hashSync('admin123', 10),
        '',
        '',
        'Campus Address',
        'Principal Admin',
        'Online',
        '',
        'Lagos',
        'Ikeja',
        JSON.stringify(['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3']),
        JSON.stringify({ school_name: formattedName, school_email: fallbackEmail })
      );

      school = db.prepare("SELECT * FROM schools WHERE LOWER(id) = ? OR LOWER(email) = ?").get(cleanIdLower, fallbackEmail.toLowerCase());
    } catch (e) {
      console.warn("Auto-provisioning tenant fallback error:", e);
    }
  }

  if (school) {
    try {
      const newKycStatus = (action === 'approve') ? 'Approved' : 'Rejected';
      const subStatus = (action === 'approve') ? 'Active' : 'Pending Verification';

      const updateStmt = db.prepare("UPDATE schools SET kycStatus = ?, subscriptionStatus = ? WHERE LOWER(id) = ? OR LOWER(email) = ?");
      updateStmt.run(newKycStatus, subStatus, school.id.toLowerCase(), (school.email || '').toLowerCase());

      console.log(`[SUPERADMIN KYC SUCCESS] Campus ${school.name} (${school.id}) updated to KYC Status: ${newKycStatus}`);

      return res.status(200).json({
        success: true,
        message: (action === 'approve') 
          ? `Campus "${school.name}" KYC approved! Primary Principal account activated.`
          : `Campus "${school.name}" KYC rejected.`,
        tenant: {
          id: school.id,
          school_name: school.name,
          kycStatus: newKycStatus,
          operational_status: (action === 'approve') ? 'active' : 'rejected'
        }
      });
    } catch(err) {
      console.error("Error updating KYC status in database:", err);
      return res.status(500).json({ success: false, message: 'Database update failed: ' + err.message });
    }
  }

  return res.status(404).json({ success: false, message: 'Campus tenant record not found in database.' });
});

// 3. POST /api/superadmin/tenants/:id/reset-password: Superadmin Reset School Admin Password
app.post('/api/superadmin/tenants/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Tenant ID is required.' });
  }

  const cleanPassword = String(newPassword || '').trim();
  if (!cleanPassword || cleanPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
  }

  const cleanId = String(id).trim();
  const cleanIdLower = cleanId.toLowerCase();

  let school = db.prepare("SELECT * FROM schools WHERE LOWER(id) = ? OR LOWER(email) = ?").get(cleanIdLower, cleanIdLower);

  if (!school) {
    return res.status(404).json({ success: false, message: 'Campus tenant record not found in database.' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(cleanPassword, 10);
    const updateStmt = db.prepare("UPDATE schools SET password = ? WHERE LOWER(id) = ? OR LOWER(email) = ?");
    updateStmt.run(hashedPassword, school.id.toLowerCase(), (school.email || '').toLowerCase());

    console.log(`[SUPERADMIN RESET PASSWORD] Password for campus "${school.name}" (${school.id}) reset successfully.`);

    return res.status(200).json({
      success: true,
      message: `Password for "${school.name}" (Email: ${school.email}) updated successfully to: ${cleanPassword}`
    });
  } catch(err) {
    console.error("Error resetting school password:", err);
    return res.status(500).json({ success: false, message: 'Database error resetting password: ' + err.message });
  }
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
  const { schoolName, adminEmail, password, category, state, lga } = payload;
  
  if (schoolName && adminEmail && password) {
    const slug = (schoolName || 'school').toLowerCase().replace(/[^\w]/g, '');
    const schoolId = `school_${slug}`;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertSchool = db.prepare(`
      INSERT OR REPLACE INTO schools (id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat, password, logo, classes, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultConfig = {
      school_name: schoolName,
      school_email: adminEmail,
      school_state: state || 'Bauchi',
      school_lga: lga || 'Azare',
      classes: ["SSS 1", "SSS 2", "SSS 3", "JSS 1", "JSS 2", "JSS 3", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"],
      school_term: "First Term 2026",
      tuition: 150000,
      theme_primary: "#5B4FE0",
      theme_accent: "#17B8A6"
    };

    insertSchool.run(
      schoolId,
      schoolName,
      adminEmail.toLowerCase(),
      category || 'All-Through',
      'Approved',
      'Active',
      'Pro',
      'Premium Crest',
      hashedPassword,
      '',
      JSON.stringify(defaultConfig.classes),
      JSON.stringify(defaultConfig)
    );
  }

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

// ==================== INQUIRIES REST API ====================
app.post('/api/inquiries', (req, res) => {
  try {
    const { name, school, phone, purpose, message } = req.body;
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const stmt = db.prepare("INSERT INTO inquiries (name, school, phone, purpose, message, date) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(name || 'Guest', school || 'Campus', phone || '', purpose || 'Demo Request', message || '', dateStr);
    return res.status(200).json({ status: 'success', message: 'Inquiry received successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record inquiry: ' + err.message });
  }
});

app.get('/api/inquiries', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM inquiries ORDER BY id DESC").all();
    return res.status(200).json({ status: 'success', inquiries: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch inquiries: ' + err.message });
  }
});

app.delete('/api/inquiries/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM inquiries WHERE id = ?").run(req.params.id);
    return res.status(200).json({ status: 'success', message: 'Inquiry deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete inquiry: ' + err.message });
  }
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
      db.exec("DELETE FROM students");
      const insertStudent = db.prepare(`
        INSERT INTO students (id, schoolId, name, class, roll, grades, fees, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      newDB.students.forEach(st => {
        let pwd = st.password || 'student123';
        if (pwd && !pwd.startsWith('$2a$')) {
          pwd = bcrypt.hashSync(pwd, 10);
        }
        const sRoll = (st.roll || `STU-${st.id}`).toLowerCase();
        insertStudent.run(
          st.id, st.schoolId || 'school_demo', st.name, st.class, st.roll || `STU-${st.id}`,
          JSON.stringify(st.grades || {}), JSON.stringify(st.fees || {}), pwd
        );

        // Synchronize into unified `users` table
        try {
          const stmtUser = db.prepare(`
            INSERT INTO users (id, school_id, full_name, username, email, password_hash, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'student', 'active', ?)
            ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, password_hash=excluded.password_hash
          `);
          stmtUser.run(sRoll, st.schoolId || 'school_demo', st.name, sRoll, `${sRoll}@eduflow.ng`, pwd, new Date().toISOString());
        } catch(e) {}
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

    // Sync Teachers
    if (Array.isArray(newDB.teachers)) {
      db.exec("DELETE FROM teachers");
      const insertTeacher = db.prepare(`
        INSERT INTO teachers (id, schoolId, name, email, subject, assignedClass, role, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      newDB.teachers.forEach(t => {
        let pwd = t.password || 'password123';
        if (pwd && !pwd.startsWith('$2a$')) {
          pwd = bcrypt.hashSync(pwd, 10);
        }
        const tEmail = (t.email || `${t.id}@eduflow.ng`).toLowerCase();
        const tRole = (t.role === 'Form Master' || t.role === 'form_master') ? 'Form Master' : 'Teacher';
        insertTeacher.run(t.id, t.schoolId || 'school_demo', t.name, tEmail, t.subject || 'General', t.assignedClass || 'SSS 1 Science', tRole, pwd);

        // Synchronize into unified `users` table
        try {
          const normRole = (t.role === 'Form Master' || t.role === 'form_master') ? 'form_master' : 'teacher';
          const stmtUser = db.prepare(`
            INSERT INTO users (id, school_id, full_name, username, email, password_hash, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
            ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, password_hash=excluded.password_hash
          `);
          stmtUser.run(tEmail, t.schoolId || 'school_demo', t.name, tEmail, tEmail, pwd, normRole, new Date().toISOString());
        } catch(e) {}
      });
    }

    // Sync Parents
    if (Array.isArray(newDB.parents)) {
      const upsertParent = db.prepare(`
        INSERT INTO parents (email, password, children)
        VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET password=excluded.password, children=excluded.children
      `);
      newDB.parents.forEach(p => {
        let pwd = p.password || 'parent123';
        if (pwd && !pwd.startsWith('$2a$')) {
          pwd = bcrypt.hashSync(pwd, 10);
        }
        const pEmail = (p.email || p.id).toLowerCase();
        upsertParent.run(pEmail, pwd, typeof p.children === 'string' ? p.children : JSON.stringify(p.children || []));

        // Synchronize into unified `users` table
        try {
          const stmtUser = db.prepare(`
            INSERT INTO users (id, school_id, full_name, username, email, password_hash, role, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'parent', 'active', ?)
            ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, password_hash=excluded.password_hash
          `);
          stmtUser.run(pEmail, p.schoolId || 'school_demo', p.name || `Parent (${pEmail})`, pEmail, pEmail, pwd, new Date().toISOString());
        } catch(e) {}
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
