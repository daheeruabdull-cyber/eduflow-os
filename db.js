const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db;
try {
  const { DatabaseSync } = require('node:sqlite');
  const DB_FILE = path.join(__dirname, 'eduflow.db');
  db = new DatabaseSync(DB_FILE);
} catch (err) {
  console.warn("Native node:sqlite module unavailable on this Node version. Initializing in-memory DB fallback.");
  const store = { schools: [], students: [], attendance: [], payments: [], timetable: [], notifications: [], parents: [], teachers: [], users: [], assignments: [] };
  db = {
    exec: () => {},
    prepare: function(sql) {
      const sqlLower = (sql || '').toLowerCase();
      return {
        get: function(...args) {
          if (sqlLower.includes('count(*)')) {
            return { count: store.schools.length };
          }
          if (sqlLower.includes('from users')) {
            const arg = String(args[0] || '').toLowerCase();
            return store.users.find(u => (u.id || '').toLowerCase() === arg || (u.username || '').toLowerCase() === arg || (u.email || '').toLowerCase() === arg);
          }
          if (sqlLower.includes('from assignments')) {
            const arg = String(args[0] || '').toLowerCase();
            return store.assignments.find(a => (a.user_id || '').toLowerCase() === arg || a.id === Number(args[0]));
          }
          if (sqlLower.includes('from schools')) {
            const arg = String(args[0] || '').toLowerCase();
            return store.schools.find(s => (s.id || '').toLowerCase() === arg || (s.email || '').toLowerCase() === arg || (s.phone || '').toLowerCase() === arg);
          }
          if (sqlLower.includes('from parents')) {
            const arg = String(args[0] || '').toLowerCase();
            return store.parents.find(p => (p.email || '').toLowerCase() === arg);
          }
          if (sqlLower.includes('from students')) {
            const arg = String(args[0] || '').toLowerCase();
            return store.students.find(st => (st.roll || '').toLowerCase() === arg || st.id === Number(args[0]));
          }
          return null;
        },
        all: function(...args) {
          if (sqlLower.includes('from users')) return store.users;
          if (sqlLower.includes('from assignments')) return store.assignments;
          if (sqlLower.includes('from schools')) return store.schools;
          if (sqlLower.includes('from students')) {
            if (args.length > 0) return store.students.filter(s => args.includes(s.id));
            return store.students;
          }
          if (sqlLower.includes('from attendance')) return store.attendance;
          if (sqlLower.includes('from payments')) return store.payments;
          if (sqlLower.includes('from timetable')) return store.timetable;
          if (sqlLower.includes('from notifications')) return store.notifications;
          if (sqlLower.includes('from teachers')) return store.teachers;
          return [];
        },
        run: function(...args) {
          if (sqlLower.includes('insert into users')) {
            const [id, school_id, full_name, username, email, password_hash, role, status, created_at] = args;
            const existingIdx = store.users.findIndex(u => u.id === id || (u.username && u.username.toLowerCase() === (username || '').toLowerCase()));
            const obj = { id, school_id, full_name, username, email, password_hash, role, status: status || 'active', created_at };
            if (existingIdx >= 0) store.users[existingIdx] = obj;
            else store.users.push(obj);
          } else if (sqlLower.includes('insert into assignments')) {
            const [user_id, school_id, role, assigned_class_id, assigned_arm_id, assigned_subjects, assigned_classes, admission_no, parent_id, metadata, created_at] = args;
            const id = store.assignments.length + 1;
            store.assignments.push({ id, user_id, school_id, role, assigned_class_id, assigned_arm_id, assigned_subjects, assigned_classes, admission_no, parent_id, metadata, created_at });
          } else if (sqlLower.includes('insert into schools')) {
            const [id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat, password, logo, classes, config] = args;
            const existingIdx = store.schools.findIndex(s => s.id === id);
            const obj = { id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat, password, logo, classes, config };
            if (existingIdx >= 0) store.schools[existingIdx] = obj;
            else store.schools.push(obj);
          } else if (sqlLower.includes('insert into students')) {
            let id, schoolId, name, cls, roll, grades, fees;
            if (args.length === 7) [id, schoolId, name, cls, roll, grades, fees] = args;
            else { [schoolId, name, cls, roll, grades, fees] = args; id = store.students.length + 1; }
            store.students.push({ id, schoolId, name, class: cls, roll, grades, fees });
          } else if (sqlLower.includes('insert into attendance')) {
            const [schoolId, date, records] = args;
            store.attendance.push({ schoolId, date, records });
          } else if (sqlLower.includes('insert into payments')) {
            const [id, schoolId, studentId, studentName, item, amount, date, reference, status] = args;
            store.payments.push({ id, schoolId, studentId, studentName, item, amount, date, reference, status });
          } else if (sqlLower.includes('insert into timetable')) {
            const [schoolId, cls, data] = args;
            store.timetable.push({ schoolId, class: cls, data });
          } else if (sqlLower.includes('insert into notifications')) {
            const [id, schoolId, recipient, channel, destination, type, message, date, status] = args;
            store.notifications.push({ id, schoolId, recipient, channel, destination, type, message, date, status });
          } else if (sqlLower.includes('insert into parents')) {
            const [email, password, children] = args;
            store.parents.push({ email, password, children });
          } else if (sqlLower.includes('insert into teachers')) {
            const [id, schoolId, name, email, subject, assignedClass, role] = args;
            store.teachers.push({ id, schoolId, name, email, subject, assignedClass, role });
          }
          return { lastInsertRowid: 1, changes: 1 };
        }
      };
    }
  };
}

// 1. Initialize Tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      type TEXT,
      kycStatus TEXT,
      subscriptionStatus TEXT,
      plan TEXT,
      reportCardFormat TEXT,
      password TEXT,
      logo TEXT,
      phone TEXT,
      address TEXT,
      registrar TEXT,
      paymentMethod TEXT,
      paymentProof TEXT,
      state TEXT,
      lga TEXT,
      classes TEXT,
      config TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schoolId TEXT,
      name TEXT,
      class TEXT,
      roll TEXT,
      grades TEXT,
      fees TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      schoolId TEXT,
      date TEXT,
      records TEXT,
      PRIMARY KEY (schoolId, date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      schoolId TEXT,
      studentId INTEGER,
      studentName TEXT,
      item TEXT,
      amount INTEGER,
      date TEXT,
      reference TEXT,
      status TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS timetable (
      schoolId TEXT,
      class TEXT,
      data TEXT,
      PRIMARY KEY (schoolId, class)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schoolId TEXT,
      recipient TEXT,
      channel TEXT,
      destination TEXT,
      type TEXT,
      message TEXT,
      date TEXT,
      status TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS parents (
      email TEXT PRIMARY KEY,
      password TEXT,
      children TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      email TEXT PRIMARY KEY,
      name TEXT,
      password TEXT,
      assignedClass TEXT,
      subject TEXT,
      schoolId TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      school TEXT,
      phone TEXT,
      purpose TEXT,
      message TEXT,
      date TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      full_name TEXT,
      username TEXT,
      email TEXT,
      password_hash TEXT,
      role TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      school_id TEXT,
      role TEXT,
      assigned_class_id TEXT,
      assigned_arm_id TEXT,
      assigned_subjects TEXT,
      assigned_classes TEXT,
      admission_no TEXT,
      parent_id TEXT,
      metadata TEXT,
      created_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS fee_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT,
      class_id TEXT,
      academic_session TEXT,
      term TEXT,
      fee_category TEXT,
      amount REAL,
      is_compulsory INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS student_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT,
      student_id TEXT,
      class_id TEXT,
      academic_session TEXT,
      term TEXT,
      invoice_number TEXT UNIQUE,
      total_billed REAL DEFAULT 0.0,
      amount_paid REAL DEFAULT 0.0,
      balance_due REAL DEFAULT 0.0,
      payment_status TEXT DEFAULT 'unpaid',
      due_date TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id TEXT,
      invoice_id INTEGER,
      student_id TEXT,
      receipt_number TEXT UNIQUE,
      amount_paid REAL,
      payment_method TEXT,
      payment_reference TEXT,
      received_by TEXT,
      payment_date TEXT,
      notes TEXT
    )
  `);
}

// 2. Pure Clean Production Database Initializer (Zero Demo Data)
function seedDatabase() {
  // Database initialized completely clean and empty.
  // Registered school campuses, students, teachers, and parents persist permanently.
  console.log("Pristine Production Database Initialized: 0 Demo Records.");
}

// Initialize Schema & Clean Production Environment
initSchema();
seedDatabase();

module.exports = db;
