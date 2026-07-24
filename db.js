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
  const store = { schools: [], students: [], attendance: [], payments: [], timetable: [], notifications: [], parents: [], teachers: [] };
  db = {
    exec: () => {},
    prepare: function(sql) {
      const sqlLower = (sql || '').toLowerCase();
      return {
        get: function(...args) {
          if (sqlLower.includes('count(*)')) {
            return { count: store.schools.length };
          }
          if (sqlLower.includes('from schools')) {
            const arg = String(args[0] || '').toLowerCase();
            return store.schools.find(s => s.id === args[0] || (s.email || '').toLowerCase() === arg);
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
          if (sqlLower.includes('insert into schools')) {
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
      id TEXT PRIMARY KEY,
      schoolId TEXT,
      name TEXT,
      email TEXT,
      subject TEXT,
      assignedClass TEXT,
      role TEXT
    )
  `);
}

// 2. Seed default data if empty
function seedDatabase() {
  // Check if schools table is empty
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM schools");
  const result = countStmt.get();
  if (result && result.count > 0) return; // Already seeded

  console.log("Seeding SQLite database with default multi-tenant records...");

  const hashedDefaultPass = bcrypt.hashSync('password123', 10);
  const hashedParentPass = bcrypt.hashSync('parent123', 10);

  // Insert default schools
  const insertSchool = db.prepare(`
    INSERT INTO schools (id, name, email, type, kycStatus, subscriptionStatus, plan, reportCardFormat, password, logo, classes, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoLogo = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' rx='20' fill='%2312132A'/><path d='M30 45 L50 25 L70 45 L60 45 L60 75 L40 75 L40 45 Z' fill='url(%23grad)'/><circle cx='50' cy='50' r='10' stroke='%23ffffff' stroke-width='3'/><defs><linearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2317B8A6'/><stop offset='100%25' stop-color='%235B4FE0'/></linearGradient></defs></svg>`;
  const demoConfig = {
    school_name: "Eduflow Academy (Demo)",
    school_email: "demo@eduflow.com",
    school_logo: demoLogo,
    school_phone: "+234 803 123 4567",
    school_address: "15, Admiralty Way, Lekki, Lagos",
    school_password: "password123",
    school_state: "Lagos",
    school_lga: "Eti-Osa",
    school_level: "K-12",
    classes: ["SSS 1 Science", "SSS 1 Arts", "SSS 1 Commercial", "SSS 2 Science", "SSS 2 Commercial", "SSS 3 WAEC", "JSS 1", "JSS 2", "JSS 3", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "Creche", "Reception", "Nursery 1", "Nursery 2"],
    school_term: "First Term 2026",
    tuition: 150000,
    library: 10000,
    development: 15000,
    theme_primary: "#5B4FE0",
    theme_accent: "#17B8A6",
    theme_teal: "#17B8A6"
  };

  insertSchool.run(
    "school_demo",
    "Eduflow Academy (Demo)",
    "demo@eduflow.com",
    "K-12",
    "Approved",
    "Active",
    "Pro",
    "Premium Crest",
    hashedDefaultPass,
    demoLogo,
    JSON.stringify(["SSS 1 Science", "SSS 1 Arts", "SSS 1 Commercial", "SSS 2 Science", "SSS 2 Commercial", "SSS 3 WAEC", "JSS 1", "JSS 2", "JSS 3", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "Creche", "Reception", "Nursery 1", "Nursery 2"]),
    JSON.stringify(demoConfig)
  );

  insertSchool.run(
    "school_002",
    "Kingsway High School",
    "info@kingsway.com",
    "K-12",
    "Pending",
    "Active",
    "Standard",
    "Classic Board",
    hashedDefaultPass,
    demoLogo,
    JSON.stringify(["SSS 1 Science", "SSS 2 Science"]),
    JSON.stringify(demoConfig)
  );

  // Insert default students
  const insertStudent = db.prepare(`
    INSERT INTO students (schoolId, name, class, roll, grades, fees)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const student1Grades = { "Mathematics": { ca: 24, exam: 58 }, "English Language": { ca: 22, exam: 50 }, "Biology": { ca: 18, exam: 42 }, "Chemistry": { ca: 20, exam: 48 }, "Physics": { ca: 21, exam: 52 } };
  const student1Fees = {
    tuition: { amount: 150000, due: '2026-07-20', paid: true },
    library: { amount: 10000, due: '2026-07-20', paid: false },
    development: { amount: 15000, due: '2026-07-25', paid: false }
  };
  const student2Grades = { "Mathematics": { ca: 18, exam: 42 }, "English Language": { ca: 24, exam: 55 }, "Biology": { ca: 22, exam: 50 }, "Chemistry": { ca: 19, exam: 45 }, "Physics": { ca: 16, exam: 40 } };
  const student2Fees = {
    tuition: { amount: 150000, due: '2026-07-20', paid: false },
    library: { amount: 10000, due: '2026-07-20', paid: false },
    development: { amount: 15000, due: '2026-07-25', paid: false }
  };
  const student3Grades = { "Mathematics": { ca: 15, exam: 35 }, "English Language": { ca: 20, exam: 48 }, "Biology": { ca: 14, exam: 30 }, "Chemistry": { ca: 12, exam: 28 }, "Physics": { ca: 15, exam: 33 } };
  const student4Grades = { "Mathematics": { ca: 28, exam: 65 }, "English Language": { ca: 26, exam: 60 }, "Biology": { ca: 25, exam: 58 }, "Chemistry": { ca: 27, exam: 62 }, "Physics": { ca: 29, exam: 66 } };
  const student5Grades = { "Mathematics": { ca: 22, exam: 50 }, "English Language": { ca: 21, exam: 48 }, "Biology": { ca: 23, exam: 52 }, "Chemistry": { ca: 20, exam: 47 }, "Physics": { ca: 18, exam: 42 } };

  insertStudent.run("school_demo", "Tobi Adebayo", "SSS 1 Science", "2026/G10/042", JSON.stringify(student1Grades), JSON.stringify(student1Fees));
  insertStudent.run("school_demo", "Chinedu Okafor", "SSS 1 Science", "2026/G10/012", JSON.stringify(student2Grades), JSON.stringify(student2Fees));
  insertStudent.run("school_demo", "Kelechi Nwosu", "SSS 1 Science", "2026/G10/025", JSON.stringify(student3Grades), JSON.stringify(student2Fees));
  insertStudent.run("school_demo", "Amina Yusuf", "SSS 2 Science", "2026/G11/008", JSON.stringify(student4Grades), JSON.stringify(student2Fees));
  insertStudent.run("school_demo", "Fatima Abubakar", "SSS 2 Science", "2026/G11/019", JSON.stringify(student5Grades), JSON.stringify(student2Fees));

  // Insert default attendance
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (schoolId, date, records)
    VALUES (?, ?, ?)
  `);
  insertAttendance.run("school_demo", "2026-07-11", JSON.stringify({ "1": "present", "2": "late", "3": "absent", "4": "present", "5": "present" }));
  insertAttendance.run("school_demo", "2026-07-10", JSON.stringify({ "1": "present", "2": "present", "3": "present", "4": "present", "5": "present" }));

  // Insert default payment logs
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, schoolId, studentId, studentName, item, amount, date, reference, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPayment.run("pay_001", "school_demo", 1, "Tobi Adebayo", "Tuition Fees", 120000, "2026-07-11 10:30", "EST-84912-TA", "Success");

  // Insert default parent profile
  const insertParent = db.prepare(`
    INSERT INTO parents (email, password, children)
    VALUES (?, ?, ?)
  `);
  // parent@eduflow.com has Tobi Adebayo (1) and Amina Yusuf (4) as children!
  insertParent.run("parent@eduflow.com", hashedParentPass, JSON.stringify([1, 4]));

  // Insert default teacher profiles
  const insertTeacher = db.prepare(`
    INSERT INTO teachers (id, schoolId, name, email, subject, assignedClass, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertTeacher.run("TCH-001", "school_demo", "Mr. Chukwuma Okon", "teacher@eduflow.com", "Mathematics", "SSS 1 Science", "Form Master");
  insertTeacher.run("TCH-002", "school_demo", "Mrs. Funke Adeleke", "funke.teacher@eduflow.com", "English Language", "SSS 2 Science", "Subject Teacher");
  insertTeacher.run("TCH-003", "school_demo", "Dr. Ibrahim Danjuma", "danjuma.teacher@eduflow.com", "Chemistry & Physics", "SSS 1 Science", "Subject Teacher");

  // Insert default timetable schedules
  const insertTimetable = db.prepare(`
    INSERT INTO timetable (schoolId, class, data)
    VALUES (?, ?, ?)
  `);

  const timetable10A = {
    "Monday": { "p1": { subject: "Mathematics", teacher: "Mr. Yusuf" }, "p2": { subject: "English Language", teacher: "Mrs. Adeleke" }, "p3": { subject: "Chemistry", teacher: "Dr. Okon" }, "p4": { subject: "Physics", teacher: "Engr. Nnamdi" } },
    "Tuesday": { "p1": { subject: "Biology", teacher: "Mrs. Ibrahim" }, "p2": { subject: "Mathematics", teacher: "Mr. Yusuf" }, "p3": { subject: "History", teacher: "Mr. Okafor" }, "p4": { subject: "Fine Arts", teacher: "Mrs. Audu" } },
    "Wednesday": { "p1": { subject: "English Language", teacher: "Mrs. Adeleke" }, "p2": { subject: "Geography", teacher: "Mrs. Audu" }, "p3": { subject: "Chemistry", teacher: "Dr. Okon" }, "p4": { subject: "Study Hall", teacher: "All Staff" } },
    "Thursday": { "p1": { subject: "Mathematics", teacher: "Mr. Yusuf" }, "p2": { subject: "Physics", teacher: "Engr. Nnamdi" }, "p3": { subject: "Biology", teacher: "Mrs. Ibrahim" }, "p4": { subject: "Literature", teacher: "Mrs. Adeleke" } },
    "Friday": { "p1": { subject: "Technical Drawing", teacher: "Engr. Nnamdi" }, "p2": { subject: "Agricultural Science", teacher: "Mr. Bello" }, "p3": { subject: "Study Hall", teacher: "All Staff" }, "p4": { subject: "Fine Arts", teacher: "Mrs. Audu" } }
  };
  const timetable11B = {
    "Monday": { "p1": { subject: "English Language", teacher: "Mrs. Adeleke" }, "p2": { subject: "Biology", teacher: "Mrs. Ibrahim" }, "p3": { subject: "Mathematics", teacher: "Mr. Yusuf" }, "p4": { subject: "Further Mathematics", teacher: "Mr. Yusuf" } },
    "Tuesday": { "p1": { subject: "English Language", teacher: "Mrs. Adeleke" }, "p2": { subject: "Literature", teacher: "Mrs. Adeleke" }, "p3": { subject: "History", teacher: "Mr. Okafor" }, "p4": { subject: "Chemistry", teacher: "Dr. Okon" } },
    "Wednesday": { "p1": { subject: "Mathematics", teacher: "Mr. Yusuf" }, "p2": { subject: "Geography", teacher: "Mrs. Audu" }, "p3": { subject: "Physics", teacher: "Engr. Nnamdi" }, "p4": { subject: "Technical Drawing", teacher: "Engr. Nnamdi" } },
    "Thursday": { "p1": { subject: "Biology", teacher: "Mrs. Ibrahim" }, "p2": { subject: "Chemistry", teacher: "Dr. Okon" }, "p3": { subject: "Further Mathematics", teacher: "Mr. Yusuf" }, "p4": { subject: "English Language", teacher: "Mrs. Adeleke" } },
    "Friday": { "p1": { subject: "Agricultural Science", teacher: "Mr. Bello" }, "p2": { subject: "Mathematics", teacher: "Mr. Yusuf" }, "p3": { subject: "Study Hall", teacher: "All Staff" }, "p4": { subject: "Fine Arts", teacher: "Mrs. Audu" } }
  };

  insertTimetable.run("school_demo", "10A", JSON.stringify(timetable10A));
  insertTimetable.run("school_demo", "11B", JSON.stringify(timetable11B));

  console.log("SQLite database successfully seeded!");
}

// Initialize
initSchema();
seedDatabase();

module.exports = db;
