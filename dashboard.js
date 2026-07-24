// Eduflow School OS - Dashboard Logic & Developer DevTools Engine

// Transparent API Sync Hook
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    if (typeof resource === 'string' && resource.includes('/api/db')) {
      const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
      
      if (method === 'POST') {
        try {
          const bodyData = init.body;
          if (bodyData) {
            localStorage.setItem('eduflow_local_db', bodyData);
          }
        } catch (e) {
          console.warn("Failed to write to local storage sync.", e);
        }
      }
      
      try {
        const response = await originalFetch(resource, init);
        if (response.ok) {
          if (method === 'GET') {
            const clone = response.clone();
            const serverDb = await clone.json();
            
            // Sync local storage with latest server records
            const localDbStr = localStorage.getItem('eduflow_local_db');
            if (localDbStr) {
              const localDb = JSON.parse(localDbStr);
              let merged = false;
              (localDb.schools || []).forEach(ls => {
                if (!serverDb.schools.some(s => s.id === ls.id)) {
                  serverDb.schools.push(ls);
                  merged = true;
                }
              });
              (localDb.students || []).forEach(lst => {
                if (!serverDb.students.some(s => s.id === lst.id)) {
                  serverDb.students.push(lst);
                  merged = true;
                }
              });
              if (merged) {
                localStorage.setItem('eduflow_local_db', JSON.stringify(serverDb));
                originalFetch('/api/db', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(serverDb)
                }).catch(err => console.warn("Failed to write merged back to server.", err));
              }
            } else {
              localStorage.setItem('eduflow_local_db', JSON.stringify(serverDb));
            }
          }
          return response;
        }
      } catch (err) {
        console.warn("Network API fetch failed, falling back to local storage polyfill.", err);
      }
      
      // Fallback: Return from LocalStorage
      const localData = localStorage.getItem('eduflow_local_db');
      let dbObj = null;
      if (localData) {
        dbObj = JSON.parse(localData);
      } else {
        dbObj = { schools: [], students: [], attendance: {}, payments: [], timetable: {}, notifications: [] };
      }
      
      return new Response(JSON.stringify(dbObj), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return originalFetch(resource, init);
  };
})();

// 1. DATABASE SCHEMA & CONSTANTS
const DEFAULT_STUDENTS = [
  {
    id: 1,
    name: 'Tobi Adebayo',
    roll: '2026/G10/042',
    class: 'SSS 1 Science',
    attendanceRate: '95.2%',
    grades: {
      'Mathematics': { ca: 24, exam: 58 },
      'English Language': { ca: 22, exam: 50 },
      'Chemistry': { ca: 26, exam: 62 },
      'Physics': { ca: 25, exam: 60 }
    },
    fees: {
      tuition: { amount: 120000, paid: false, due: '2026-07-20' },
      library: { amount: 15000, paid: false, due: '2026-07-20' },
      development: { amount: 40000, paid: false, due: '2026-07-20' }
    }
  },
  {
    id: 2,
    name: 'Chinedu Okafor',
    roll: '2026/G10/008',
    class: 'SSS 1 Science',
    attendanceRate: '91.4%',
    grades: {
      'Mathematics': { ca: 20, exam: 42 },
      'English Language': { ca: 18, exam: 52 },
      'Chemistry': { ca: 21, exam: 48 },
      'Physics': { ca: 19, exam: 45 }
    },
    fees: {
      tuition: { amount: 120000, paid: true, due: '2026-07-20' },
      library: { amount: 15000, paid: true, due: '2026-07-20' },
      development: { amount: 40000, paid: false, due: '2026-07-20' }
    }
  },
  {
    id: 3,
    name: 'Amina Bello',
    roll: '2026/G10/015',
    class: 'SSS 1 Science',
    attendanceRate: '97.8%',
    grades: {
      'Mathematics': { ca: 28, exam: 65 },
      'English Language': { ca: 25, exam: 61 },
      'Chemistry': { ca: 27, exam: 64 },
      'Physics': { ca: 29, exam: 68 }
    },
    fees: {
      tuition: { amount: 120000, paid: true, due: '2026-07-20' },
      library: { amount: 15000, paid: true, due: '2026-07-20' },
      development: { amount: 40000, paid: true, due: '2026-07-20' }
    }
  },
  {
    id: 4,
    name: 'Kelechi Nwosu',
    roll: '2026/G10/029',
    class: 'SSS 1 Science',
    attendanceRate: '88.6%',
    grades: {
      'Mathematics': { ca: 15, exam: 35 },
      'English Language': { ca: 17, exam: 40 },
      'Chemistry': { ca: 16, exam: 38 },
      'Physics': { ca: 14, exam: 36 }
    },
    fees: {
      tuition: { amount: 120000, paid: false, due: '2026-07-20' },
      library: { amount: 15000, paid: false, due: '2026-07-20' },
      development: { amount: 40000, paid: false, due: '2026-07-20' }
    }
  },
  {
    id: 5,
    name: 'Yusuf Ibrahim',
    roll: '2026/G11/012',
    class: 'SSS 2 Science',
    attendanceRate: '96.5%',
    grades: {
      'Mathematics': { ca: 26, exam: 55 },
      'English Language': { ca: 23, exam: 58 },
      'Chemistry': { ca: 24, exam: 52 },
      'Physics': { ca: 25, exam: 54 }
    },
    fees: {
      tuition: { amount: 140000, paid: true, due: '2026-07-20' },
      library: { amount: 20000, paid: false, due: '2026-07-20' },
      development: { amount: 45000, paid: false, due: '2026-07-20' }
    }
  },
  {
    id: 6,
    name: 'Fatima Musa',
    roll: '2026/G11/003',
    class: 'SSS 2 Science',
    attendanceRate: '94.2%',
    grades: {
      'Mathematics': { ca: 25, exam: 62 },
      'English Language': { ca: 26, exam: 60 },
      'Chemistry': { ca: 23, exam: 59 },
      'Physics': { ca: 22, exam: 57 }
    },
    fees: {
      tuition: { amount: 140000, paid: false, due: '2026-07-20' },
      library: { amount: 20000, paid: false, due: '2026-07-20' },
      development: { amount: 45000, paid: false, due: '2026-07-20' }
    }
  }
];

const DEFAULT_ATTENDANCE = {
  '2026-07-11': { 1: 'present', 2: 'late', 3: 'present', 4: 'absent', 5: 'present', 6: 'present' },
  '2026-07-10': { 1: 'present', 2: 'present', 3: 'present', 4: 'late', 5: 'present', 6: 'absent' }
};

const DEFAULT_PAYMENTS = [
  {
    id: 'pay_001',
    studentId: 3,
    studentName: 'Amina Bello',
    item: 'First Term Registration Bundle',
    amount: 175000,
    date: '2026-07-01 09:15',
    reference: 'EST-99321-AB',
    status: 'Success'
  },
  {
    id: 'pay_002',
    studentId: 2,
    studentName: 'Chinedu Okafor',
    item: 'Tuition Fee + Library Levy',
    amount: 135000,
    date: '2026-07-05 14:22',
    reference: 'EST-12891-CO',
    status: 'Success'
  }
];

const DEFAULT_TIMETABLE = {
  "10A": {
    "Monday": {
      "p1": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p2": { subject: "English Language", teacher: "Mrs. Adeleke" },
      "p3": { subject: "Chemistry", teacher: "Dr. Okon" },
      "p4": { subject: "Physics", teacher: "Engr. Nnamdi" }
    },
    "Tuesday": {
      "p1": { subject: "Physics", teacher: "Engr. Nnamdi" },
      "p2": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p3": { subject: "Biology", teacher: "Mrs. Ibrahim" },
      "p4": { subject: "English Language", teacher: "Mrs. Adeleke" }
    },
    "Wednesday": {
      "p1": { subject: "Chemistry", teacher: "Dr. Okon" },
      "p2": { subject: "Biology", teacher: "Mrs. Ibrahim" },
      "p3": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p4": { subject: "Economics", teacher: "Mr. Bello" }
    },
    "Thursday": {
      "p1": { subject: "English Language", teacher: "Mrs. Adeleke" },
      "p2": { subject: "Physics", teacher: "Engr. Nnamdi" },
      "p3": { subject: "Geography", teacher: "Mrs. Audu" },
      "p4": { subject: "Civic Education", teacher: "Mr. Okafor" }
    },
    "Friday": {
      "p1": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p2": { subject: "Chemistry", teacher: "Dr. Okon" },
      "p3": { subject: "Physical Education", teacher: "Coach Amadi" },
      "p4": { subject: "Study Hall", teacher: "All Staff" }
    }
  },
  "11B": {
    "Monday": {
      "p1": { subject: "Chemistry", teacher: "Dr. Okon" },
      "p2": { subject: "Physics", teacher: "Engr. Nnamdi" },
      "p3": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p4": { subject: "Further Mathematics", teacher: "Mr. Yusuf" }
    },
    "Tuesday": {
      "p1": { subject: "English Language", teacher: "Mrs. Adeleke" },
      "p2": { subject: "Literature", teacher: "Mrs. Adeleke" },
      "p3": { subject: "History", teacher: "Mr. Okafor" },
      "p4": { subject: "Chemistry", teacher: "Dr. Okon" }
    },
    "Wednesday": {
      "p1": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p2": { subject: "Geography", teacher: "Mrs. Audu" },
      "p3": { subject: "Physics", teacher: "Engr. Nnamdi" },
      "p4": { subject: "Technical Drawing", teacher: "Engr. Nnamdi" }
    },
    "Thursday": {
      "p1": { subject: "Biology", teacher: "Mrs. Ibrahim" },
      "p2": { subject: "Chemistry", teacher: "Dr. Okon" },
      "p3": { subject: "Further Mathematics", teacher: "Mr. Yusuf" },
      "p4": { subject: "English Language", teacher: "Mrs. Adeleke" }
    },
    "Friday": {
      "p1": { subject: "Agricultural Science", teacher: "Mr. Bello" },
      "p2": { subject: "Mathematics", teacher: "Mr. Yusuf" },
      "p3": { subject: "Study Hall", teacher: "All Staff" },
      "p4": { subject: "Fine Arts", teacher: "Mrs. Audu" }
    }
  }
};

const DEFAULT_NOTIFICATIONS = [
  { id: 1, recipient: "Mrs. Adebayo (Parent)", channel: "SMS", destination: "+234 803 123 4567", type: "Attendance", message: "Attendance Alert: Tobi Adebayo was marked PRESENT today at 09:12 AM.", date: "2026-07-11 09:15 AM", status: "Delivered" },
  { id: 2, recipient: "Mrs. Adebayo (Parent)", channel: "Email", destination: "mother.adebayo@gmail.com", type: "Billing", message: "Billing Invoice: 1st Term Tuition Fees (₦120,000) generated for Tobi Adebayo. Due date: 2026-07-20.", date: "2026-07-10 02:40 PM", status: "Sent" }
];

// Active State variables
let state = {
  role: 'admin', // 'admin' or 'student'
  schoolId: 'school_demo', // Multi-tenant context
  rawDB: null, // Full database sync cache
  currentStudentId: 1, // Student currently selected in results panel
  currentSection: 'home',
  db: {
    students: [],
    attendance: {},
    payments: [],
    timetable: {},
    notifications: []
  },
  rawDB: null,
  role: 'admin', // Default role view: 'admin' | 'student' | 'parent' | 'superadmin' | 'teacher'
  schoolId: 'school_demo',
  currentSection: 'home',
  currentStudentId: 1,
  activeParentChildId: 1,
  selectedKycSchoolId: null,
  reportCardFormat: 'Premium Crest'
};

async function loadDBFromLocalStorage() {
  const urlParams = new URLSearchParams(window.location.search);
  state.schoolId = urlParams.get('schoolId') || localStorage.getItem('eduflow_school_id') || 'school_demo';

  // 1. Synchronous Instant Load from LocalStorage
  const localStudents = localStorage.getItem('eduflow_students');
  const localAttendance = localStorage.getItem('eduflow_attendance');
  const localPayments = localStorage.getItem('eduflow_payments');
  const localTimetable = localStorage.getItem('eduflow_timetable');
  const localNotifications = localStorage.getItem('eduflow_notifications');

  if (localStudents && localAttendance && localPayments) {
    try {
      state.db.students = JSON.parse(localStudents);
      state.db.attendance = JSON.parse(localAttendance);
      state.db.payments = JSON.parse(localPayments);
      state.db.timetable = localTimetable ? JSON.parse(localTimetable) : DEFAULT_TIMETABLE;
      state.db.notifications = localNotifications ? JSON.parse(localNotifications) : DEFAULT_NOTIFICATIONS;
    } catch(e) {
      state.db.students = DEFAULT_STUDENTS;
      state.db.attendance = DEFAULT_ATTENDANCE;
      state.db.payments = DEFAULT_PAYMENTS;
      state.db.timetable = DEFAULT_TIMETABLE;
    }
  } else {
    state.db.students = DEFAULT_STUDENTS;
    state.db.attendance = DEFAULT_ATTENDANCE;
    state.db.payments = DEFAULT_PAYMENTS;
    state.db.timetable = DEFAULT_TIMETABLE;
  }

  // Function to merge locally registered schools into state.rawDB.schools for SuperAdmin
  const mergeRegisteredSchools = () => {
    if (!state.rawDB) return;
    if (!state.rawDB.schools) state.rawDB.schools = [];
    let localRegSchools = [];
    try {
      localRegSchools = JSON.parse(localStorage.getItem('eduflow_registered_schools') || '[]');
    } catch(e) {}
    localRegSchools.forEach(regSchool => {
      if (!state.rawDB.schools.some(s => s.id === regSchool.id || s.email === regSchool.email)) {
        state.rawDB.schools.push(regSchool);
      }
    });
  };

  // Fallback rawDB initialization to prevent superadmin null reference crashes
  if (!state.rawDB) {
    state.rawDB = {
      schools: [
        { id: 'school_demo', name: localStorage.getItem('eduflow_school_name') || 'EDULITE ACADEMY, LAGOS', email: 'demo@eduflow.com', type: 'K-12', kycStatus: 'Approved', subscriptionStatus: 'Active', plan: 'Pro', reportCardFormat: 'Premium Crest', logo: '' }
      ],
      students: state.db.students || [],
      attendance: state.db.attendance || {},
      payments: state.db.payments || [],
      timetable: state.db.timetable || {},
      notifications: state.db.notifications || []
    };
  }

  mergeRegisteredSchools();

  // 2. Non-blocking Server Sync in Background
  try {
    fetch('/api/db')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          state.rawDB = data;
          mergeRegisteredSchools();
          const filteredStudents = (data.students || []).filter(s => (s.schoolId || 'school_demo') === state.schoolId);
          if (filteredStudents.length > 0) state.db.students = filteredStudents;
          else if (data.students && data.students.length > 0) state.db.students = data.students;
          
          const filteredPayments = (data.payments || []).filter(p => (p.schoolId || 'school_demo') === state.schoolId);
          if (filteredPayments.length > 0) state.db.payments = filteredPayments;
          
          state.db.attendance = data.attendance || state.db.attendance;
          state.db.timetable = data.timetable || state.db.timetable;
          state.db.notifications = (data.notifications || []).filter(n => (n.schoolId || 'school_demo') === state.schoolId);
          state.db.teachers = data.teachers || state.db.teachers || [];
          
          const schoolProfile = (data.schools || []).find(s => s.id === state.schoolId);
          if (schoolProfile) {
            localStorage.setItem('eduflow_school_name', schoolProfile.name);
            localStorage.setItem('eduflow_school_email', schoolProfile.email);
            localStorage.setItem('eduflow_school_type', schoolProfile.type);
            localStorage.setItem('eduflow_school_logo', schoolProfile.logo || '');
            state.reportCardFormat = schoolProfile.reportCardFormat || 'Premium Crest';
            state.subscriptionStatus = schoolProfile.subscriptionStatus || 'Active';
            state.paymentProof = schoolProfile.paymentProof || '';
          }

          // Re-render stats cleanly with server data
          renderDashboardStats();
        }
      })
      .catch(e => console.warn("Background API sync deferred.", e));
  } catch(err) {
    console.warn("Server sync error ignored.", err);
  }
}

async function saveDBToLocalStorage() {
  // Sync to LocalStorage for safety
  localStorage.setItem('eduflow_students', JSON.stringify(state.db.students));
  localStorage.setItem('eduflow_attendance', JSON.stringify(state.db.attendance));
  localStorage.setItem('eduflow_payments', JSON.stringify(state.db.payments));
  localStorage.setItem('eduflow_timetable', JSON.stringify(state.db.timetable));
  localStorage.setItem('eduflow_notifications', JSON.stringify(state.db.notifications));

  if (!state.rawDB) {
    state.rawDB = {
      schools: [
        { id: 'school_demo', name: localStorage.getItem('eduflow_school_name') || 'EDULITE ACADEMY, LAGOS', email: 'demo@eduflow.com', type: 'K-12', kycStatus: 'Approved', subscriptionStatus: 'Active', plan: 'Pro', reportCardFormat: 'Premium Crest', subjects: ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics'], logo: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' rx='20' fill='%2312132A'/><path d='M30 45 L50 25 L70 45 L60 45 L60 75 L40 75 L40 45 Z' fill='url(%23grad)'/><circle cx='50' cy='50' r='10' stroke='%23ffffff' stroke-width='3'/><defs><linearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2317B8A6'/><stop offset='100%25' stop-color='%235B4FE0'/></linearGradient></defs></svg>` }
      ],
      students: [],
      attendance: {},
      payments: [],
      timetable: {},
      notifications: []
    };
  }

  // Ensure lists exist
  if (!state.rawDB.schools) state.rawDB.schools = [];
  if (!state.rawDB.students) state.rawDB.students = [];
  if (!state.rawDB.payments) state.rawDB.payments = [];
  if (!state.rawDB.attendance) state.rawDB.attendance = {};
  if (!state.rawDB.timetable) state.rawDB.timetable = {};
  if (!state.rawDB.notifications) state.rawDB.notifications = [];

  // Map schoolId key context to all active student, payment, and alert registers
  state.db.students.forEach(s => { s.schoolId = state.schoolId; });
  state.db.payments.forEach(p => { p.schoolId = state.schoolId; });
  state.db.notifications.forEach(n => { n.schoolId = state.schoolId; });

  // Merge working set back into global arrays
  state.rawDB.students = state.rawDB.students.filter(s => (s.schoolId || 'school_demo') !== state.schoolId);
  state.rawDB.students.push(...state.db.students);

  state.rawDB.payments = state.rawDB.payments.filter(p => (p.schoolId || 'school_demo') !== state.schoolId);
  state.rawDB.payments.push(...state.db.payments);

  state.rawDB.notifications = state.rawDB.notifications.filter(n => (n.schoolId || 'school_demo') !== state.schoolId);
  state.rawDB.notifications.push(...state.db.notifications);

  // Directly copy global objects
  state.rawDB.attendance = Object.assign({}, state.rawDB.attendance, state.db.attendance);
  state.rawDB.timetable = Object.assign({}, state.rawDB.timetable, state.db.timetable);

  // Sync to persistent server
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.rawDB)
    });
  } catch (err) {
    console.error("Failed to sync database to backend server.", err);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) sidebar.classList.toggle('mobile-open');
}

// 3. NAVIGATION ROUTER
function showSection(sectionId, event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  state.currentSection = sectionId;
  
  // Close mobile sidebar on section pick
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');
  
  // Hide all sections
  document.querySelectorAll('.panel-section').forEach(sect => {
    sect.classList.remove('active');
  });
  
  // Remove active sidebar state
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Activate targets
  const targetSect = document.getElementById(`sect-${sectionId}`);
  if (targetSect) targetSect.classList.add('active');
  
  const targetNav = document.getElementById(`nav-${sectionId}`);
  if (targetNav) targetNav.classList.add('active');

  // Smooth scroll content area to top
  const contentArea = document.querySelector('.app-content');
  if (contentArea) contentArea.scrollTop = 0;

  // Trigger renders safely
  try {
    if (sectionId === 'home') renderDashboardStats();
    if (sectionId === 'attendance') renderAttendanceModule();
    if (sectionId === 'results') renderResultsModule();
    if (sectionId === 'fees') renderFeesModule();
    if (sectionId === 'schedules') renderSchedulesModule();
    if (sectionId === 'notifications') renderNotificationsModule();
    if (sectionId === 'settings') { renderSettingsModule(); renderMasterAccountsTable(); }
    if (sectionId === 'parent-dashboard') renderParentDashboard();
    if (sectionId === 'analytics') renderAnalyticsCharts();
    
    // Super-Admin Integrated Hubs
    if (sectionId === 'super-overview') renderSuperOverview();
    if (sectionId === 'super-directory') renderSuperSchoolsDirectory();
    if (sectionId === 'super-security') renderSuperSecurityLogs();
    if (sectionId === 'super-kyc') { renderSuperKycVault(); renderSuperKycReviewPanel(); }
    if (sectionId === 'super-setup') loadSuperTenantContext();
    if (sectionId === 'super-rosters') {
      renderSuperTenantSubjects();
      renderSuperTenantStudents();
    }
    if (sectionId === 'super-schedules') renderSuperTenantSchedules();
    if (sectionId === 'super-billing') renderSuperTenantBilling();
    if (sectionId === 'super-outbox') renderSuperTenantOutbox();
  } catch(err) {
    console.warn("Section render warning:", sectionId, err);
  }
}

function switchRole(role) {
  state.role = role;
  
  // Update switcher banner buttons
  const btnAdmin = document.getElementById('btn-role-admin');
  const btnStudent = document.getElementById('btn-role-student');
  const btnParent = document.getElementById('btn-role-parent');
  if (btnAdmin) btnAdmin.classList.toggle('active', role === 'admin');
  if (btnStudent) btnStudent.classList.toggle('active', role === 'student');
  if (btnParent) btnParent.classList.toggle('active', role === 'parent');

  // Hide school settings, financial fee controls, and analytics for teacher role
  const settingsNav = document.getElementById('nav-settings');
  const analyticsNav = document.getElementById('nav-analytics');
  const feesNav = document.getElementById('nav-fees');

  if (settingsNav) settingsNav.style.display = role === 'admin' ? 'block' : 'none';
  if (analyticsNav) analyticsNav.style.display = role === 'admin' ? 'block' : 'none';
  if (feesNav) feesNav.style.display = (role === 'admin' || role === 'parent' || role === 'student') ? 'block' : 'none';

  // Toggle sidebar menus based on role
  const schoolMenu = document.getElementById('sidebar-school-menu');
  const parentMenu = document.getElementById('sidebar-parent-menu');
  const superadminMenu = document.getElementById('sidebar-superadmin-menu');

  if (schoolMenu) schoolMenu.style.display = (role === 'admin' || role === 'student' || role === 'teacher') ? 'block' : 'none';
  if (parentMenu) parentMenu.style.display = role === 'parent' ? 'block' : 'none';
  if (superadminMenu) superadminMenu.style.display = role === 'superadmin' ? 'block' : 'none';

  // Toggle header items for Super-Admin vs Admin/Teacher/Student/Parent
  const headerSearch = document.getElementById('header-search-container');
  const sessionSwitcher = document.getElementById('school-session-switcher');
  const superHeaderSelector = document.getElementById('super-header-selector');

  if (role === 'superadmin') {
    if (headerSearch) headerSearch.style.display = 'none';
    if (sessionSwitcher) sessionSwitcher.style.display = 'none';
    if (superHeaderSelector) superHeaderSelector.style.display = 'flex';
  } else {
    if (headerSearch) headerSearch.style.display = 'flex';
    if (sessionSwitcher) sessionSwitcher.style.display = 'flex';
    if (superHeaderSelector) superHeaderSelector.style.display = 'none';
  }

  // Update Sidebar identity card
  const avatar = document.getElementById('current-user-avatar');
  const name = document.getElementById('current-user-name');
  const roleLabel = document.getElementById('current-user-role');
  
  if (avatar && name && roleLabel) {
    if (role === 'admin') {
      avatar.textContent = 'A';
      avatar.style.background = 'linear-gradient(135deg, var(--accent-teal) 0%, var(--primary) 100%)';
      name.textContent = 'Admin Portal';
      roleLabel.textContent = 'Principal / Owner';
    } else if (role === 'teacher') {
      avatar.textContent = 'T';
      avatar.style.background = 'linear-gradient(135deg, #5B4FE0 0%, #3b82f6 100%)';
      const teacherEmail = localStorage.getItem('eduflow_teacher_email') || 'teacher@eduflow.com';
      const teacher = (state.db.teachers || []).find(t => t.email === teacherEmail) || (state.db.teachers || [])[0];
      name.textContent = teacher ? teacher.name : 'Mr. Chukwuma Okon';
      roleLabel.textContent = teacher ? `Form Master (${teacher.assignedClass || 'SSS 1 Science'})` : 'Form Master (SSS 1 Science)';
    } else if (role === 'parent') {
      avatar.textContent = 'P';
      avatar.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      name.textContent = 'Parent Portal';
      roleLabel.textContent = localStorage.getItem('eduflow_parent_email') || 'parent@eduflow.com';
      state.currentSection = 'parent-dashboard';
    } else if (role === 'superadmin') {
      avatar.textContent = 'SA';
      avatar.style.background = 'linear-gradient(135deg, #5B4FE0 0%, #17B8A6 100%)';
      name.textContent = 'SaaS Super-Admin';
      roleLabel.textContent = 'Operations Director';
    } else {
      avatar.textContent = 'TA';
      avatar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)';
      name.textContent = 'Tobi Adebayo';
      roleLabel.textContent = 'Grade 10A • Student';
    }
  }

  // Rerender active section layout
  showSection(state.currentSection);
}

// 4. STATS COMPILING FOR OVERVIEW
function renderDashboardStats() {
  const welcomeTitle = document.getElementById('welcome-message');
  const welcomeSub = document.getElementById('welcome-sub');
  
  const quickBar = document.getElementById('admin-quick-action-bar');
  const adminRow = document.getElementById('admin-dashboard-row');
  const studentWidgets = document.getElementById('student-dashboard-widgets');
  const studentTraj = document.getElementById('student-trajectory-container');
  const studentBanner = document.getElementById('student-pending-invoice-banner');

  if (state.role === 'admin' || state.role === 'teacher') {
    if (welcomeTitle) welcomeTitle.textContent = state.role === 'teacher' ? 'Welcome back, Mr. Okon' : 'Welcome back, Principal';
    if (welcomeSub) welcomeSub.textContent = state.role === 'teacher' ? 'SSS 1 Science Academic & Score Entry Console' : 'Here is the overall status of Eduflow today.';

    if (quickBar) quickBar.style.display = 'flex';
    if (adminRow) adminRow.style.display = 'grid';
    if (studentWidgets) studentWidgets.style.display = 'none';
    if (studentTraj) studentTraj.style.display = 'none';
    if (studentBanner) studentBanner.style.display = 'none';
    
    // Attendance rate
    const attElem = document.getElementById('stat-attendance-rate');
    if (attElem) attElem.textContent = '94.8%';
    
    // Academic average
    let totalScoreSum = 0;
    let subjectCount = 0;
    (state.db.students || []).forEach(s => {
      if (s.grades) {
        Object.keys(s.grades).forEach(subj => {
          totalScoreSum += (s.grades[subj].ca || 0) + (s.grades[subj].exam || 0);
          subjectCount++;
        });
      }
    });
    const classAvg = subjectCount > 0 ? (totalScoreSum / subjectCount).toFixed(1) : '0';
    const avgElem = document.getElementById('stat-class-average');
    if (avgElem) avgElem.textContent = `${classAvg}%`;
    
    // Fees Revenue
    let totalFeesAmount = 0;
    let paidAmount = 0;
    (state.db.students || []).forEach(s => {
      if (s.fees) {
        Object.keys(s.fees).forEach(feeKey => {
          totalFeesAmount += s.fees[feeKey].amount || 0;
          if (s.fees[feeKey].paid) {
            paidAmount += s.fees[feeKey].amount || 0;
          }
        });
      }
    });
    const formattedPaid = (paidAmount / 1000000).toFixed(1);
    const feesElem = document.getElementById('stat-fees-collected');
    if (feesElem) feesElem.textContent = `₦${formattedPaid}M`;
    
    const percentagePaid = totalFeesAmount > 0 ? Math.round((paidAmount / totalFeesAmount) * 100) : 0;
    const badgeElem = document.getElementById('fees-stat-badge');
    if (badgeElem) badgeElem.textContent = `${percentagePaid}% PAID`;
    
    // Execute Admin Dashboard Enhancements
    if (typeof renderAdminDashboardEnhancements === 'function') {
      renderAdminDashboardEnhancements();
    }
  } else {
    // Student stats
    const student = (state.db.students || []).find(s => s.id === 1) || (state.db.students || [])[0];
    if (!student) return;

    if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${student.name}`;
    if (welcomeSub) welcomeSub.textContent = 'Check your attendance record, report sheets, and pending fees.';

    if (quickBar) quickBar.style.display = 'none';
    if (adminRow) adminRow.style.display = 'none';
    if (studentWidgets) studentWidgets.style.display = 'grid';
    if (studentTraj) studentTraj.style.display = 'block';

    const attElem = document.getElementById('stat-attendance-rate');
    if (attElem) attElem.textContent = student.attendanceRate;
    
    let totalScoreSum = 0;
    let subjectCount = 0;
    if (student.grades) {
      Object.keys(student.grades).forEach(subj => {
        totalScoreSum += (student.grades[subj].ca || 0) + (student.grades[subj].exam || 0);
        subjectCount++;
      });
    }
    const studentAvg = subjectCount > 0 ? (totalScoreSum / subjectCount).toFixed(1) : '0';
    const avgElem = document.getElementById('stat-class-average');
    if (avgElem) avgElem.textContent = `${studentAvg}%`;
    
    // Student outstanding fees
    let outstanding = 0;
    if (student.fees) {
      Object.keys(student.fees).forEach(feeKey => {
        if (!student.fees[feeKey].paid) {
          outstanding += student.fees[feeKey].amount || 0;
        }
      });
    }
    const feesElem = document.getElementById('stat-fees-collected');
    if (feesElem) feesElem.textContent = `₦${outstanding.toLocaleString()}`;
    
    const badge = document.getElementById('fees-stat-badge');
    if (badge) {
      badge.textContent = outstanding > 0 ? 'DUE' : 'CLEARED';
      badge.className = outstanding > 0 ? 'badge badge-danger' : 'badge badge-success';
    }

    // Execute Student Dashboard Enhancements
    if (typeof renderStudentDashboardEnhancements === 'function') {
      renderStudentDashboardEnhancements();
    }
  }
}

// 5. ATTENDANCE TRACKER MODULE
function renderAdminClassOptions(selectElement) {
  if (!selectElement) return;
  const currentVal = selectElement.value || 'SSS 1 Science';
  selectElement.innerHTML = `
    <optgroup label="Senior Secondary (SSS 1 - SSS 3)">
      <option value="SSS 1 Science" ${currentVal === 'SSS 1 Science' ? 'selected' : ''}>SSS 1 Science</option>
      <option value="SSS 1 Arts" ${currentVal === 'SSS 1 Arts' ? 'selected' : ''}>SSS 1 Arts</option>
      <option value="SSS 1 Commercial" ${currentVal === 'SSS 1 Commercial' ? 'selected' : ''}>SSS 1 Commercial</option>
      <option value="SSS 2 Science" ${currentVal === 'SSS 2 Science' ? 'selected' : ''}>SSS 2 Science</option>
      <option value="SSS 2 Commercial" ${currentVal === 'SSS 2 Commercial' ? 'selected' : ''}>SSS 2 Commercial</option>
      <option value="SSS 3 WAEC" ${currentVal === 'SSS 3 WAEC' ? 'selected' : ''}>SSS 3 (WAEC Candidate Class)</option>
    </optgroup>
    <optgroup label="Junior Secondary (JSS 1 - JSS 3)">
      <option value="JSS 1" ${currentVal === 'JSS 1' ? 'selected' : ''}>JSS 1</option>
      <option value="JSS 2" ${currentVal === 'JSS 2' ? 'selected' : ''}>JSS 2</option>
      <option value="JSS 3" ${currentVal === 'JSS 3' ? 'selected' : ''}>JSS 3 (BECE Class)</option>
    </optgroup>
    <optgroup label="Primary School (Primary 1 - Primary 6)">
      <option value="Primary 1" ${currentVal === 'Primary 1' ? 'selected' : ''}>Primary 1</option>
      <option value="Primary 2" ${currentVal === 'Primary 2' ? 'selected' : ''}>Primary 2</option>
      <option value="Primary 3" ${currentVal === 'Primary 3' ? 'selected' : ''}>Primary 3</option>
      <option value="Primary 4" ${currentVal === 'Primary 4' ? 'selected' : ''}>Primary 4</option>
      <option value="Primary 5" ${currentVal === 'Primary 5' ? 'selected' : ''}>Primary 5</option>
      <option value="Primary 6" ${currentVal === 'Primary 6' ? 'selected' : ''}>Primary 6 (Common Entrance)</option>
    </optgroup>
    <optgroup label="Nursery & Early Years">
      <option value="Creche" ${currentVal === 'Creche' ? 'selected' : ''}>Creche / Daycare</option>
      <option value="Reception" ${currentVal === 'Reception' ? 'selected' : ''}>Reception</option>
      <option value="Nursery 1" ${currentVal === 'Nursery 1' ? 'selected' : ''}>Nursery 1</option>
      <option value="Nursery 2" ${currentVal === 'Nursery 2' ? 'selected' : ''}>Nursery 2</option>
    </optgroup>
  `;
}

function filterTeacherClassOptions() {
  const attSelect = document.getElementById('attendance-class-select');
  const resSelect = document.getElementById('results-class-select');

  if (state.role === 'teacher') {
    const teacherEmail = localStorage.getItem('eduflow_teacher_email') || 'teacher@eduflow.com';
    const teacher = (state.db.teachers || []).find(t => t.email === teacherEmail) || (state.db.teachers || [])[0];
    const assignedClass = (teacher && teacher.assignedClass) ? teacher.assignedClass : 'SSS 1 Science';
    
    if (attSelect && attSelect.dataset.scoped !== assignedClass) {
      attSelect.innerHTML = `<option value="${assignedClass}" selected>${assignedClass} (My Assigned Class)</option>`;
      attSelect.dataset.scoped = assignedClass;
    }
    if (resSelect && resSelect.dataset.scoped !== assignedClass) {
      resSelect.innerHTML = `<option value="${assignedClass}" selected>${assignedClass} (My Assigned Class)</option>`;
      resSelect.dataset.scoped = assignedClass;
    }
  } else if (state.role === 'admin' || state.role === 'superadmin') {
    // School Admin sees ALL classes!
    if (attSelect && attSelect.dataset.scoped) {
      delete attSelect.dataset.scoped;
      renderAdminClassOptions(attSelect);
    }
    if (resSelect && resSelect.dataset.scoped) {
      delete resSelect.dataset.scoped;
      renderAdminClassOptions(resSelect);
    }
  }
}

function renderAttendanceModule() {
  const adminView = document.getElementById('attendance-admin-view');
  const studentView = document.getElementById('attendance-student-view');

  if (state.role === 'admin' || state.role === 'teacher') {
    filterTeacherClassOptions();
    adminView.style.display = 'block';
    studentView.style.display = 'none';
    renderAttendanceRoster();
  } else {
    adminView.style.display = 'none';
    studentView.style.display = 'block';
    renderStudentAttendanceView(1);
  }
}

function renderAttendanceRoster() {
  const classSelect = document.getElementById('attendance-class-select').value;
  const dateVal = document.getElementById('attendance-date').value;
  const tbody = document.getElementById('attendance-table-body');
  tbody.innerHTML = '';

  if (!state.db.attendance[dateVal]) {
    state.db.attendance[dateVal] = {};
  }
  const dateRecord = state.db.attendance[dateVal];

  const classStudents = state.db.students.filter(s => s.class === classSelect);

  if (classStudents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No enrolled students found in <strong>${classSelect}</strong>.<br>
          <button class="btn btn-teal" style="margin-top: 12px; font-size: 0.78rem;" onclick="openStudentRegistrationModal()">+ Register Student to ${classSelect}</button>
        </td>
      </tr>
    `;
    return;
  }

  classStudents.forEach(student => {
    if (!dateRecord[student.id]) {
      dateRecord[student.id] = 'present';
    }
    const currentStatus = dateRecord[student.id];

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="student-row">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid var(--bg-dark-border);">
            ${student.name.charAt(0)}
          </div>
          <span>${student.name}</span>
        </div>
      </td>
      <td>${student.roll}</td>
      <td><span style="color: var(--text-muted); font-weight: 600;">${student.attendanceRate}</span></td>
      <td>
        <div class="attendance-options">
          <button class="attendance-opt-btn present ${currentStatus === 'present' ? 'selected' : ''}" onclick="toggleStudentAttendance(${student.id}, 'present')">Present</button>
          <button class="attendance-opt-btn late ${currentStatus === 'late' ? 'selected' : ''}" onclick="toggleStudentAttendance(${student.id}, 'late')">Late</button>
          <button class="attendance-opt-btn absent ${currentStatus === 'absent' ? 'selected' : ''}" onclick="toggleStudentAttendance(${student.id}, 'absent')">Absent</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleStudentAttendance(studentId, status) {
  const dateVal = document.getElementById('attendance-date').value;
  if (!state.db.attendance[dateVal]) {
    state.db.attendance[dateVal] = {};
  }
  state.db.attendance[dateVal][studentId] = status;
  renderAttendanceRoster();
}

function saveAttendanceRoster() {
  saveDBToLocalStorage();
  
  const classSelect = document.getElementById('attendance-class-select').value;
  const dateVal = document.getElementById('attendance-date').value;
  const classStudents = state.db.students.filter(s => s.class === classSelect);
  const dateRecord = state.db.attendance[dateVal] || {};

  classStudents.forEach(student => {
    const status = dateRecord[student.id] || 'present';
    if (status === 'absent' || status === 'late') {
      const message = `Attendance Alert: ${student.name} was marked ${status.toUpperCase()} on ${dateVal}.`;
      addNotificationLog(student.id, 'SMS', 'Attendance', message);
      if (typeof addSimulatedSMS === 'function') {
        addSimulatedSMS('Eduflow SMS Gateway', message);
      }
    }
  });

  alert('Attendance roster synchronized. Dispatched parent notifications for late/absent records.');
}

function renderStudentAttendanceView(studentId) {
  let presents = 0;
  let absents = 0;
  const historyLog = document.getElementById('student-attendance-log');
  historyLog.innerHTML = '';

  const dates = Object.keys(state.db.attendance).sort((a,b) => new Date(b) - new Date(a));

  dates.forEach(dateStr => {
    const dailyData = state.db.attendance[dateStr];
    if (dailyData && dailyData[studentId]) {
      const status = dailyData[studentId];
      if (status === 'present' || status === 'late') presents++;
      if (status === 'absent') absents++;

      const item = document.createElement('div');
      item.className = 'history-log-item';
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.01); border-radius: var(--border-radius-sm); border: 1px solid var(--bg-dark-border);';
      
      let statusBadge = `<span class="badge badge-success">Present</span>`;
      if (status === 'late') statusBadge = `<span class="badge badge-warning">Late</span>`;
      if (status === 'absent') statusBadge = `<span class="badge badge-danger">Absent</span>`;

      item.innerHTML = `
        <span style="font-size: 0.85rem; font-weight: 600;">${dateStr}</span>
        ${statusBadge}
      `;
      historyLog.appendChild(item);
    }
  });

  document.getElementById('student-present-count').textContent = presents;
  document.getElementById('student-absent-count').textContent = absents;
}

// 6. ACADEMIC RESULTS MODULE
function renderResultsModule() {
  const sidebar = document.getElementById('results-admin-sidebar');
  const form = document.getElementById('results-admin-form');

  if (state.role === 'admin' || state.role === 'teacher') {
    filterTeacherClassOptions();
    if (sidebar) sidebar.style.display = 'block';
    if (form) form.style.display = 'block';
  } else {
    if (sidebar) sidebar.style.display = 'none';
    if (form) form.style.display = 'none';
  }
  renderResultsRoster();
}

function renderResultsRoster() {
  const classVal = document.getElementById('results-class-select').value;
  const studentList = document.getElementById('results-student-list');
  studentList.innerHTML = '';

  const classStudents = state.db.students.filter(s => s.class === classVal);

  if (classStudents.length === 0) {
    studentList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
        No students registered in <strong>${classVal}</strong> yet.<br>
        <button class="btn btn-teal" style="margin-top: 10px; font-size: 0.75rem;" onclick="openStudentRegistrationModal()">+ Add Student</button>
      </div>
    `;
    return;
  }

  classStudents.forEach(student => {
    const btn = document.createElement('button');
    btn.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%; border: none; background: transparent; padding: 12px 16px; border-radius: var(--border-radius-md); text-align: left; cursor: pointer; color: var(--text-main); font-weight: 600; font-size: 0.9rem; transition: var(--transition-smooth);';
    if (student.id === state.currentStudentId) {
      btn.style.background = 'rgba(2, 132, 199, 0.15)';
      btn.style.border = '1px solid rgba(2, 132, 199, 0.3)';
    } else {
      btn.style.border = '1px solid transparent';
      btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255, 255, 255, 0.03)');
      btn.addEventListener('mouseout', () => {
        if (student.id !== state.currentStudentId) btn.style.background = 'transparent';
      });
    }

    let scoreTotal = 0;
    let counts = 0;
    Object.keys(student.grades).forEach(subj => {
      scoreTotal += student.grades[subj].ca + student.grades[subj].exam;
      counts++;
    });
    const avg = counts > 0 ? Math.round(scoreTotal / counts) : 0;

    btn.innerHTML = `
      <span>${student.name}</span>
      <span class="badge ${avg >= 70 ? 'badge-success' : 'badge-warning'}">${avg}% Avg</span>
    `;
    btn.onclick = () => {
      state.currentStudentId = student.id;
      renderResultsRoster();
    };
    studentList.appendChild(btn);
  });

  if (classStudents.length > 0 && !classStudents.find(s => s.id === state.currentStudentId)) {
    state.currentStudentId = classStudents[0].id;
    renderResultsRoster();
  }
  selectStudentForGrading(state.currentStudentId);
}

function selectStudentForGrading(studentId) {
  const student = state.db.students.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('grading-student-title').textContent = `Grade: ${student.name}`;
  loadStudentSubjectScores();
  renderReportCard(studentId);
}

function loadStudentSubjectScores() {
  const student = state.db.students.find(s => s.id === state.currentStudentId);
  if (!student) return;

  const subject = document.getElementById('grade-subject-select').value;
  const caInput = document.getElementById('grade-ca');
  const examInput = document.getElementById('grade-exam');

  if (student.grades[subject]) {
    caInput.value = student.grades[subject].ca;
    examInput.value = student.grades[subject].exam;
  } else {
    caInput.value = 0;
    examInput.value = 0;
  }
  calculateLiveGradeTotal();
}

function calculateLiveGradeTotal() {
  const caVal = parseFloat(document.getElementById('grade-ca').value) || 0;
  const examVal = parseFloat(document.getElementById('grade-exam').value) || 0;
  
  const total = caVal + examVal;
  document.getElementById('grade-total-preview').textContent = `${total}/100`;

  let grade = 'F';
  let remark = 'Fail';
  
  if (total >= 75) { grade = 'A'; remark = 'Excellent'; }
  else if (total >= 65) { grade = 'B'; remark = 'Very Good'; }
  else if (total >= 50) { grade = 'C'; remark = 'Credit'; }
  else if (total >= 40) { grade = 'D'; remark = 'Pass'; }
  
  const letterPreview = document.getElementById('grade-letter-preview');
  letterPreview.textContent = grade;

  if (grade === 'A' || grade === 'B') {
    letterPreview.style.color = 'var(--success)';
  } else if (grade === 'C') {
    letterPreview.style.color = 'var(--accent-teal)';
  } else if (grade === 'D') {
    letterPreview.style.color = 'var(--warning)';
  } else {
    letterPreview.style.color = 'var(--danger)';
  }
  
  document.getElementById('grade-remark-preview').textContent = remark;
}

function submitGradeRecord() {
  const student = state.db.students.find(s => s.id === state.currentStudentId);
  if (!student) return;

  const subject = document.getElementById('grade-subject-select').value;
  const caVal = parseFloat(document.getElementById('grade-ca').value) || 0;
  const examVal = parseFloat(document.getElementById('grade-exam').value) || 0;

  if (caVal > 30 || examVal > 70) {
    alert('Invalid inputs! Continuous Assessment is capped at 30, Examination at 70.');
    return;
  }

  student.grades[subject] = { ca: caVal, exam: examVal };
  saveDBToLocalStorage();
  
  const total = caVal + examVal;
  let grade = 'F';
  if (total >= 75) grade = 'A';
  else if (total >= 65) grade = 'B';
  else if (total >= 50) grade = 'C';
  else if (total >= 40) grade = 'D';

  const message = `Academic Alert: A new grade was recorded for ${student.name} in ${subject}. Total Score: ${total}/100 (Grade ${grade}).`;
  addNotificationLog(student.id, 'Email', 'Academic', message);

  renderResultsRoster();
  alert(`Grades for ${student.name} in ${subject} updated. Dispatching parent grade report email...`);
}

function generateClassBroadsheet() {
  const container = document.getElementById('broadsheet-view-container');
  const tbody = document.getElementById('broadsheet-tbody');
  const titleEl = document.getElementById('broadsheet-title');

  if (!container || !tbody) return;

  const subject = document.getElementById('grade-subject-select').value || 'Mathematics';
  titleEl.textContent = `Class Broadsheet: ${subject} (${localStorage.getItem('eduflow_school_term') || 'First Term 2026'})`;

  // Sort students by total score descending
  const sortedStudents = [...(state.db.students || [])].sort((a, b) => {
    const gA = a.grades[subject] || { ca: 0, exam: 0 };
    const gB = b.grades[subject] || { ca: 0, exam: 0 };
    return (gB.ca + gB.exam) - (gA.ca + gA.exam);
  });

  tbody.innerHTML = sortedStudents.map((st, idx) => {
    const gradeObj = st.grades[subject] || { ca: 0, exam: 0 };
    const ca1 = Math.round(gradeObj.ca / 2);
    const ca2 = gradeObj.ca - ca1;
    const exam = gradeObj.exam;
    const total = gradeObj.ca + gradeObj.exam;

    let letter = 'F';
    let remark = 'Fail';
    if (total >= 75) { letter = 'A'; remark = 'Distinction'; }
    else if (total >= 65) { letter = 'B'; remark = 'Very Good'; }
    else if (total >= 50) { letter = 'C'; remark = 'Credit'; }
    else if (total >= 40) { letter = 'D'; remark = 'Pass'; }

    const posIcons = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
    const posText = idx < 3 ? posIcons[idx] : `${idx + 1}th`;

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; font-weight: 700;">${posText}</td>
        <td style="padding: 8px; font-weight: 600; color: var(--text-main);">${st.name}</td>
        <td style="padding: 8px;">${ca1}</td>
        <td style="padding: 8px;">${ca2}</td>
        <td style="padding: 8px;">${exam}</td>
        <td style="padding: 8px; font-weight: 700; color: var(--accent-teal);">${total}/100</td>
        <td style="padding: 8px; font-weight: 700;">${letter}</td>
        <td style="padding: 8px; color: var(--text-secondary);">${remark}</td>
      </tr>
    `;
  }).join('');

  container.style.display = 'block';
}

function renderReportCard(studentId) {
  const student = state.db.students.find(s => s.id === studentId);
  if (!student) return;

  const cardElement = document.querySelector('.report-card');
  if (cardElement) {
    cardElement.classList.remove('format-premium-crest', 'format-classic-board', 'format-minimalist-sheet');
    const formatClass = 'format-' + (state.reportCardFormat || 'Premium Crest').toLowerCase().replace(/\s+/g, '-');
    cardElement.classList.add(formatClass);
  }

  const localSchool = localStorage.getItem('eduflow_school_name') || 'EDULITE ACADEMY, LAGOS';
  document.getElementById('card-school-name').textContent = localSchool.toUpperCase();

  const defaultSchoolLogo = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' rx='20' fill='%2312132A'/><path d='M30 45 L50 25 L70 45 L60 45 L60 75 L40 75 L40 45 Z' fill='url(%23grad)'/><circle cx='50' cy='50' r='10' stroke='%23ffffff' stroke-width='3'/><defs><linearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%2317B8A6'/><stop offset='100%25' stop-color='%235B4FE0'/></linearGradient></defs></svg>`;
  const schoolLogo = localStorage.getItem('eduflow_school_logo') || defaultSchoolLogo;
  const logoCont = document.getElementById('card-school-logo-container');
  const logoImg = document.getElementById('card-school-logo-img');
  if (logoCont && logoImg) {
    logoImg.src = schoolLogo;
    logoCont.style.display = 'flex';
  }

  const activeTerm = localStorage.getItem('eduflow_school_term') || 'First Term 2026';
  document.getElementById('card-active-term').textContent = activeTerm;

  document.getElementById('card-student-name').textContent = student.name;
  document.getElementById('card-student-class').textContent = `Grade ${student.class}`;
  document.getElementById('card-student-roll').textContent = student.roll;

  const tbody = document.getElementById('card-grades-body');
  tbody.innerHTML = '';

  let scoreSum = 0;
  let count = 0;

  Object.keys(student.grades).forEach(subj => {
    const score = student.grades[subj];
    const total = score.ca + score.exam;
    scoreSum += total;
    count++;

    let grade = 'F';
    let remark = 'Fail';
    if (total >= 75) { grade = 'A'; remark = 'Excellent'; }
    else if (total >= 65) { grade = 'B'; remark = 'Very Good'; }
    else if (total >= 50) { grade = 'C'; remark = 'Credit'; }
    else if (total >= 40) { grade = 'D'; remark = 'Pass'; }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${subj}</td>
      <td>${score.ca}</td>
      <td>${score.exam}</td>
      <td style="font-weight: 700;">${total}/100</td>
      <td><span class="card-grade-badge">${grade}</span></td>
      <td style="color: var(--text-secondary);">${remark}</td>
    `;
    tbody.appendChild(tr);
  });

  const classStudents = state.db.students.filter(s => s.class === student.class);
  const studentRankings = classStudents.map(s => {
    let sum = 0;
    let c = 0;
    Object.keys(s.grades).forEach(sub => {
      sum += s.grades[sub].ca + s.grades[sub].exam;
      c++;
    });
    return { id: s.id, avg: c > 0 ? sum / c : 0 };
  }).sort((a,b) => b.avg - a.avg);

  const rankIdx = studentRankings.findIndex(r => r.id === student.id) + 1;
  const suffix = ["th", "st", "nd", "rd"][rankIdx % 10 > 3 ? 0 : rankIdx % 100 - 20 % 10 || rankIdx % 10] || "th";

  const trRank = document.createElement('tr');
  trRank.style.background = 'rgba(255,255,255,0.02)';
  trRank.style.fontWeight = '700';
  trRank.innerHTML = `
    <td>CLASS COMPILATION</td>
    <td colspan="2" style="text-align: right; color: var(--text-muted);">AVERAGE PERFORMANCE:</td>
    <td style="color: var(--accent-teal);">${count > 0 ? Math.round(scoreSum/count) : 0}%</td>
    <td colspan="2" style="color: var(--primary);">RANK: ${rankIdx}${suffix} of ${classStudents.length}</td>
  `;
  tbody.appendChild(trRank);
}

function downloadReportCardPDF() {
  const element = document.querySelector('.report-card');
  const studentName = document.getElementById('card-student-name').textContent || 'Student';
  
  const opt = {
    margin:       0.25,
    filename:     `${studentName.replace(/\s+/g, '_')}_Report_Card.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

function renderFeesModule() {
  const triggerBtn = document.getElementById('btn-trigger-payment');
  const adminFeesView = document.getElementById('admin-fees-view');
  const studentFeesView = document.getElementById('student-fees-view');

  if (state.role === 'admin') {
    if (triggerBtn) triggerBtn.style.display = 'none';
    if (adminFeesView) adminFeesView.style.display = 'block';
    if (studentFeesView) studentFeesView.style.display = 'none';

    // Populate Global Admin Fees Ledger
    let totalCollected = 0;
    let totalOutstanding = 0;

    // 1. Calculate collections statistics
    (state.db.payments || []).forEach(p => {
      totalCollected += p.amount;
    });

    (state.db.students || []).forEach(s => {
      if (s.fees) {
        Object.keys(s.fees).forEach(feeKey => {
          if (!s.fees[feeKey].paid) {
            totalOutstanding += s.fees[feeKey].amount;
          }
        });
      }
    });

    const colElem = document.getElementById('admin-fees-total-collected');
    const outElem = document.getElementById('admin-fees-total-outstanding');
    if (colElem) colElem.textContent = `₦${totalCollected.toLocaleString()}`;
    if (outElem) outElem.textContent = `₦${totalOutstanding.toLocaleString()}`;

    // 2. Populate transaction history ledger
    const tbody = document.getElementById('admin-fees-history-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      if ((state.db.payments || []).length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">No student payments compiled yet.</td></tr>`;
      } else {
        state.db.payments.forEach(p => {
          const studentName = p.studentName || 'Student';
          const studentObj = state.db.students.find(s => s.id === p.studentId);
          const studentClass = studentObj ? `Grade ${studentObj.class}` : 'N/A';
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid var(--border-color)';
          tr.innerHTML = `
            <td style="padding: 12px; font-weight: 600; font-size: 0.8rem;">${studentName}</td>
            <td style="padding: 12px; font-size: 0.8rem;">${studentClass}</td>
            <td style="padding: 12px; font-size: 0.8rem;">${p.item}</td>
            <td style="padding: 12px; font-family: var(--font-family-mono); font-size: 0.72rem;">${p.reference}</td>
            <td style="padding: 12px; font-weight: 700; color: var(--accent-teal); font-size: 0.8rem;">₦${p.amount.toLocaleString()}</td>
            <td style="padding: 12px; font-size: 0.75rem; color: var(--text-secondary);">${p.date}</td>
            <td style="padding: 12px;"><span class="badge badge-success">Success</span></td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
    return;
  }

  // Student Role Rendering
  if (triggerBtn) triggerBtn.style.display = 'block';
  if (adminFeesView) adminFeesView.style.display = 'none';
  if (studentFeesView) studentFeesView.style.display = 'block';

  const student = state.db.students.find(s => s.id === 1); 
  if (!student) return;

  // Invoices
  const invoiceList = document.getElementById('fees-invoice-list');
  if (invoiceList) {
    invoiceList.innerHTML = '';
    activePaymentItems = [];
    activePaymentTotal = 0;

    const itemNames = {
      tuition: 'Tuition Fee (Term Package)',
      library: 'Library Resources Access Levy',
      development: 'Campus Infrastructure Fund'
    };

    Object.keys(student.fees).forEach(feeKey => {
      const invoice = student.fees[feeKey];
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--bg-dark-border);';
      const statusText = invoice.paid 
        ? `<span class="badge badge-success">Paid</span>`
        : `<span class="badge badge-danger">Outstanding</span>`;

      row.innerHTML = `
        <div>
          <span style="font-weight: 600; font-size: 0.9rem; display: block;">${itemNames[feeKey]}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Due by: ${invoice.due}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 700; display: block;">₦${invoice.amount.toLocaleString()}</span>
          ${statusText}
        </div>
      `;
      invoiceList.appendChild(row);

      if (!invoice.paid) {
        activePaymentTotal += invoice.amount;
        activePaymentItems.push({ key: feeKey, title: itemNames[feeKey], amount: invoice.amount });
      }
    });

    document.getElementById('fees-outstanding-title').textContent = `₦${activePaymentTotal.toLocaleString()}`;
  }

  // Receipts history
  const receiptList = document.getElementById('fees-receipt-list');
  if (receiptList) {
    receiptList.innerHTML = '';
    const receipts = state.db.payments.filter(r => r.studentId === student.id);
    if (receipts.length === 0) {
      receiptList.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">
          No invoice payments compiled yet. Complete payments via checkout modal to verify receipts.
        </div>
      `;
      return;
    }

    receipts.forEach(receipt => {
      const item = document.createElement('div');
      item.style.cssText = 'background: rgba(255,255,255,0.01); padding: 16px; border-radius: var(--border-radius-md); border: 1px solid var(--bg-dark-border); display: flex; justify-content: space-between; align-items: center;';
      item.innerHTML = `
        <div>
          <span style="font-weight: 700; font-size: 0.85rem; display: block; color: var(--success);">SUCCESSFUL PAYMENT</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 4px;">Ref: ${receipt.reference}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Items: ${receipt.item}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 700; color: var(--success); display: block;">₦${receipt.amount.toLocaleString()}</span>
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.7rem; margin-top: 6px;" onclick="window.print()">Receipt</button>
        </div>
      `;
      receiptList.appendChild(item);
    });
  }
}

// 8. CHECKOUT MODAL DIALOG
function openPaymentModal() {
  if (activePaymentTotal === 0) return;
  document.getElementById('checkout-modal-overlay').classList.add('active');
  
  document.getElementById('modal-payment-desc').textContent = activePaymentItems.map(i => i.title).join(', ');
  document.getElementById('modal-payment-amount').textContent = `₦${activePaymentTotal.toLocaleString()}.00`;
  
  document.getElementById('payment-input-state').style.display = 'block';
  document.getElementById('payment-loading-state').className = 'payment-state';
  document.getElementById('payment-success-state').className = 'payment-state';

  document.getElementById('card-num-input').value = '';
  document.getElementById('card-expiry-input').value = '';
  document.getElementById('card-cvv-input').value = '';
  
  document.getElementById('card-graphic-number').textContent = '•••• •••• •••• ••••';
  document.getElementById('card-graphic-expiry').textContent = 'MM/YY';
}

function closePaymentModal() {
  document.getElementById('checkout-modal-overlay').classList.remove('active');
}

function updateCardNumberGraphic(input) {
  let val = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  let formatted = '';
  for (let i = 0; i < val.length; i++) {
    if (i > 0 && i % 4 === 0) formatted += ' ';
    formatted += val[i];
  }
  input.value = formatted;

  let display = formatted;
  while (display.length < 19) {
    let nextIdx = display.length;
    if (nextIdx === 4 || nextIdx === 9 || nextIdx === 14) display += ' ';
    else display += '•';
  }
  document.getElementById('card-graphic-number').textContent = display;
}

function updateCardExpiryGraphic(input) {
  let val = input.value.replace(/[^0-9]/gi, '');
  if (val.length > 2) {
    input.value = val.slice(0, 2) + '/' + val.slice(2, 4);
  } else {
    input.value = val;
  }
  
  let display = input.value;
  if (display.length === 0) display = 'MM/YY';
  document.getElementById('card-graphic-expiry').textContent = display;
}

function processMockPayment() {
  const cardNum = document.getElementById('card-num-input').value;
  const cardExpiry = document.getElementById('card-expiry-input').value;
  const cardCvv = document.getElementById('card-cvv-input').value;

  if (cardNum.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3) {
    alert('Please fill out all bank card metrics correctly.');
    return;
  }

  document.getElementById('payment-input-state').style.display = 'none';
  document.getElementById('payment-loading-state').classList.add('active');

  setTimeout(() => {
    document.getElementById('payment-loading-state').classList.remove('active');
    
    let targetStudentId = 1;
    if (state.role === 'admin') {
      targetStudentId = state.currentStudentId || 1;
    } else if (state.role === 'student') {
      targetStudentId = parseInt(localStorage.getItem('eduflow_student_id') || '1');
    } else if (state.role === 'parent') {
      targetStudentId = state.activeParentChildId || 1;
    }

    const student = state.db.students.find(s => s.id === targetStudentId);
    
    activePaymentItems.forEach(item => {
      student.fees[item.key].paid = true;
    });

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const randRef = 'EST-' + Math.floor(10000 + Math.random() * 90000) + '-TA';

    state.db.payments.unshift({
      id: 'pay_' + (state.db.payments.length + 1).toString().padStart(3,'0'),
      studentId: targetStudentId,
      studentName: student.name,
      item: activePaymentItems.map(i => i.title).join(' + '),
      amount: activePaymentTotal,
      date: formattedDate,
      reference: randRef,
      status: 'Success'
    });

    const payMsg = `Payment Success: Dues of ₦${activePaymentTotal.toLocaleString()} for ${student.name} received. Ref: ${randRef}.`;
    addNotificationLog(targetStudentId, 'SMS', 'Billing', payMsg);
    addNotificationLog(targetStudentId, 'Email', 'Billing', `Billing Receipt Alert: ${payMsg} Digital invoices have been updated.`);
    if (typeof addSimulatedSMS === 'function') {
      addSimulatedSMS('Eduflow Pay Gateway', payMsg);
    }

    saveDBToLocalStorage();

    document.getElementById('success-state-msg').textContent = `Your payment of ₦${activePaymentTotal.toLocaleString()} was successfully cleared by Paystack.`;
    document.getElementById('payment-success-state').classList.add('active');
  }, 2200);
}

function completePaymentCheckoutSuccess() {
  closePaymentModal();
  if (state.role === 'parent') {
    renderParentDashboard();
  } else {
    renderFeesModule();
    renderDashboardStats();
  }
}

// 9. STUDENT ENROLLING
function generateAutoStudentRollNumber(classVal) {
  const currentYear = new Date().getFullYear();
  const cleanClass = (classVal || 'SSS1').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const nextNumber = (state.db.students || []).length + 1;
  return `${currentYear}/${cleanClass}/${String(nextNumber).padStart(3, '0')}`;
}

function updateAutoGeneratedRollNumber() {
  const classSelect = document.getElementById('reg-student-class');
  const rollInput = document.getElementById('reg-student-roll');
  if (classSelect && rollInput) {
    rollInput.value = generateAutoStudentRollNumber(classSelect.value);
  }
}

function openStudentRegistrationModal() {
  document.getElementById('student-modal-overlay').classList.add('active');
  document.getElementById('reg-student-name').value = '';
  
  const classSelect = document.getElementById('reg-student-class');
  if (classSelect) {
    const nigerianClasses = [
      "SSS 1 Science", "SSS 1 Commercial", "SSS 1 Arts", 
      "SSS 2 Science", "SSS 2 Commercial", "SSS 2 Arts", "SSS 3", 
      "JSS 1", "JSS 2", "JSS 3", 
      "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", 
      "Nursery 1", "Nursery 2", "Creche"
    ];
    
    classSelect.innerHTML = '';
    nigerianClasses.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      classSelect.appendChild(opt);
    });
  }

  updateAutoGeneratedRollNumber();
}

function openOnboardingStudentModal() {
  openStudentRegistrationModal();
}

function closeStudentRegistrationModal() {
  document.getElementById('student-modal-overlay').classList.remove('active');
}

function registerNewStudent() {
  const sName = document.getElementById('reg-student-name').value.trim();
  const sClass = document.getElementById('reg-student-class').value;
  let sRoll = document.getElementById('reg-student-roll').value.trim();

  if (!sName) {
    alert('Please enter a student name.');
    return;
  }

  if (!sRoll) {
    sRoll = generateAutoStudentRollNumber(sClass);
  }

  const nextId = (state.db.students || []).length + 1;

  const newStudent = {
    id: nextId,
    name: sName,
    roll: sRoll,
    class: sClass,
    attendanceRate: '100.0%',
    grades: {
      'Mathematics': { ca: 0, exam: 0 },
      'English Language': { ca: 0, exam: 0 },
      'Chemistry': { ca: 0, exam: 0 },
      'Physics': { ca: 0, exam: 0 }
    },
    fees: {
      tuition: { amount: 150000, paid: false, due: '2026-07-20' },
      library: { amount: 10000, paid: false, due: '2026-07-20' },
      development: { amount: 15000, paid: false, due: '2026-07-20' }
    }
  };

  state.db.students.push(newStudent);
  saveDBToLocalStorage();

  renderDashboardStats();
  renderResultsRoster();
  if (state.currentSection === 'attendance') renderAttendanceRoster();
  if (state.currentSection === 'fees') renderFeesModule();
  
  closeStudentRegistrationModal();
  alert(`✓ Student "${sName}" successfully enrolled!\n\nClass: ${sClass}\nMatric No: ${sRoll}`);
}

// 10. TIMETABLE MODULE
function renderSchedulesModule() {
  const adminForm = document.getElementById('schedule-admin-form');
  const studentNotice = document.getElementById('schedule-student-notice');
  const classSelect = document.getElementById('schedule-class-select');
  
  if (state.role === 'admin') {
    adminForm.style.display = 'block';
    studentNotice.style.display = 'none';
    classSelect.disabled = false;
  } else {
    adminForm.style.display = 'none';
    studentNotice.style.display = 'block';
    
    const student = state.db.students.find(s => s.id === 1);
    if (student) {
      classSelect.value = student.class;
      classSelect.disabled = true;
    }
  }

  renderTimetableGrid();
}

function renderTimetableGrid() {
  const classVal = document.getElementById('schedule-class-select').value;
  const dayVal = document.getElementById('schedule-day-select').value;
  const tbody = document.getElementById('timetable-grid-body');
  tbody.innerHTML = '';

  const classTimetable = state.db.timetable[classVal] || {};
  const daySlots = classTimetable[dayVal] || {};

  const periodLabels = {
    p1: "08:00 AM - 09:30 AM",
    p2: "09:30 AM - 11:00 AM",
    p3: "11:00 AM - 12:30 PM",
    p4: "01:30 PM - 03:00 PM"
  };

  Object.keys(periodLabels).forEach(periodKey => {
    const slot = daySlots[periodKey] || { subject: "Free Period", teacher: "None" };
    const tr = document.createElement('tr');
    
    const isFree = slot.subject === "Free Period";
    const subText = isFree ? `<span style="color: var(--text-muted); font-style: italic;">Free Period</span>` : `<strong>${slot.subject}</strong>`;
    const teacherText = isFree ? `<span style="color: var(--text-muted);">-</span>` : slot.teacher;

    tr.innerHTML = `
      <td style="font-weight: 600;">${periodLabels[periodKey]}</td>
      <td>${subText}</td>
      <td>${teacherText}</td>
    `;
    tbody.appendChild(tr);
  });
}

function saveTimetableSlot() {
  const classVal = document.getElementById('schedule-class-select').value;
  const dayVal = document.getElementById('schedule-day-select').value;
  const period = document.getElementById('schedule-period-select').value;
  const subjectName = document.getElementById('schedule-subject-input').value.trim();
  const teacherName = document.getElementById('schedule-teacher-input').value.trim();

  if (!subjectName || !teacherName) {
    alert('Please enter both a subject and teacher name.');
    return;
  }

  if (!state.db.timetable[classVal]) state.db.timetable[classVal] = {};
  if (!state.db.timetable[classVal][dayVal]) state.db.timetable[classVal][dayVal] = {};

  state.db.timetable[classVal][dayVal][period] = {
    subject: subjectName,
    teacher: teacherName
  };

  saveDBToLocalStorage();
  renderTimetableGrid();

  document.getElementById('schedule-subject-input').value = '';
  document.getElementById('schedule-teacher-input').value = '';

  alert(`Timetable slot updated successfully for Class ${classVal} on ${dayVal}.`);
}

// 11. NOTIFICATIONS MODULE
function renderNotificationsModule() {
  const totalVal = document.getElementById('notify-total-count');
  const smsVal = document.getElementById('notify-sms-count');
  const emailVal = document.getElementById('notify-email-count');
  const logsList = document.getElementById('notification-logs-list');

  logsList.innerHTML = '';
  const logs = state.db.notifications || [];
  
  totalVal.textContent = logs.length;
  smsVal.textContent = logs.filter(l => l.channel === 'SMS').length;
  emailVal.textContent = logs.filter(l => l.channel === 'Email').length;

  if (logs.length === 0) {
    logsList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        No notification logs currently recorded.
      </div>
    `;
    return;
  }

  logs.forEach(log => {
    const item = document.createElement('div');
    item.style.cssText = 'background: rgba(255,255,255,0.02); padding: 16px; border-radius: var(--border-radius-md); border: 1px solid var(--bg-dark-border); display: flex; justify-content: space-between; align-items: center; gap: 16px;';
    
    const channelBadge = log.channel === 'SMS' 
      ? `<span style="background: rgba(2, 132, 199, 0.15); color: var(--primary); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">SMS</span>`
      : `<span style="background: rgba(15, 118, 110, 0.15); color: var(--accent-teal); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">EMAIL</span>`;

    item.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
          ${channelBadge}
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--text-main);">${log.recipient}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">(${log.destination})</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">${log.message}</p>
      </div>
      <div style="text-align: right; min-width: 100px;">
        <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px;">${log.date}</span>
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--success); display: flex; align-items: center; justify-content: flex-end; gap: 3px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--success);"></span>
          Delivered
        </span>
      </div>
    `;
    logsList.appendChild(item);
  });
}

function addNotificationLog(studentId, channel, type, message) {
  const student = state.db.students.find(s => s.id === studentId);
  if (!student) return;

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;

  const cleanName = student.name.split(' ')[1] || 'Parent';
  const recipient = `Mrs. ${cleanName} (Parent)`;
  const destination = channel === 'SMS' 
    ? `+234 803 99${student.id} 01${student.id}` 
    : `${student.name.toLowerCase().replace(/\s+/g, '.')}@parent.com`;

  const newLog = {
    id: (state.db.notifications.length + 1),
    recipient: recipient,
    channel: channel,
    destination: destination,
    type: type,
    message: message,
    date: formattedDate,
    status: 'Delivered'
  };

  state.db.notifications.unshift(newLog);
  saveDBToLocalStorage();
}

function clearNotificationLogs() {
  if (confirm("Are you sure you want to clear all parent notification logs?")) {
    state.db.notifications = [];
    saveDBToLocalStorage();
    renderNotificationsModule();
  }
}

// 12. CONTROL CENTER MODULE (SETTINGS)
function renderSettingsModule() {
  document.getElementById('settings-school-name').value = localStorage.getItem('eduflow_school_name') || 'EDULITE ACADEMY, LAGOS';
  document.getElementById('settings-school-term').value = localStorage.getItem('eduflow_school_term') || 'First Term 2026';
  document.getElementById('settings-school-email').value = localStorage.getItem('eduflow_school_email') || 'principal@edulite.com';

  loadClassFeesSetting();
  loadRawDBIntoDevEditor();
}

function saveSchoolProfileSettings() {
  const nameVal = document.getElementById('settings-school-name').value.trim();
  const termVal = document.getElementById('settings-school-term').value;
  const emailVal = document.getElementById('settings-school-email').value.trim();

  if (!nameVal || !emailVal) {
    alert('Please enter a school name and admin email.');
    return;
  }

  localStorage.setItem('eduflow_school_name', nameVal);
  localStorage.setItem('eduflow_school_term', termVal);
  localStorage.setItem('eduflow_school_email', emailVal);

  // Sync back to memory and save to server database
  if (state.rawDB && state.rawDB.schools) {
    const school = state.rawDB.schools.find(s => s.id === state.schoolId);
    if (school) {
      school.name = nameVal;
      school.email = emailVal;
      if (!school.config) school.config = {};
      school.config.school_name = nameVal;
      school.config.school_email = emailVal;
      school.config.school_term = termVal;
    }
  }

  saveDBToLocalStorage();

  // Dynamically update UI branding
  renderSchoolLogoAndBranding();

  const rcHeader = document.getElementById('card-school-name');
  if (rcHeader) rcHeader.textContent = nameVal.toUpperCase();

  alert('School profile settings successfully updated and synced.');
}

function loadClassFeesSetting() {
  const classVal = document.getElementById('settings-fees-class').value;
  const sampleStudent = state.db.students.find(s => s.class === classVal);
  if (sampleStudent) {
    document.getElementById('settings-fees-tuition').value = sampleStudent.fees.tuition.amount;
    document.getElementById('settings-fees-library').value = sampleStudent.fees.library.amount;
    document.getElementById('settings-fees-dev').value = sampleStudent.fees.development.amount;
  } else {
    document.getElementById('settings-fees-tuition').value = classVal === '10A' ? 120000 : 140000;
    document.getElementById('settings-fees-library').value = classVal === '10A' ? 15000 : 20000;
    document.getElementById('settings-fees-dev').value = classVal === '10A' ? 40000 : 45000;
  }
}

function saveClassFeesSetting() {
  const classVal = document.getElementById('settings-fees-class').value;
  const tuition = parseFloat(document.getElementById('settings-fees-tuition').value) || 0;
  const library = parseFloat(document.getElementById('settings-fees-library').value) || 0;
  const development = parseFloat(document.getElementById('settings-fees-dev').value) || 0;

  state.db.students.forEach(student => {
    if (student.class === classVal) {
      if (!student.fees.tuition.paid) student.fees.tuition.amount = tuition;
      if (!student.fees.library.paid) student.fees.library.amount = library;
      if (!student.fees.development.paid) student.fees.development.amount = development;
    }
  });

  saveDBToLocalStorage();
  alert(`Invoice package rates updated for Class ${classVal}. Changes applied to all outstanding bills.`);
}

function exportDatabaseJSON() {
  const backupData = {
    students: state.db.students,
    attendance: state.db.attendance,
    payments: state.db.payments,
    timetable: state.db.timetable,
    notifications: state.db.notifications,
    school_name: localStorage.getItem('eduflow_school_name') || 'EDULITE ACADEMY, LAGOS',
    school_term: localStorage.getItem('eduflow_school_term') || 'First Term 2026',
    school_email: localStorage.getItem('eduflow_school_email') || 'principal@edulite.com'
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `eduflow_database_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDatabaseJSON(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.students || !data.attendance || !data.payments) {
        alert('Invalid backup file structure! Must contain students, attendance, and payments arrays.');
        return;
      }

      state.db.students = data.students;
      state.db.attendance = data.attendance;
      state.db.payments = data.payments;
      if (data.timetable) state.db.timetable = data.timetable;
      if (data.notifications) state.db.notifications = data.notifications;

      if (data.school_name) localStorage.setItem('eduflow_school_name', data.school_name);
      if (data.school_term) localStorage.setItem('eduflow_school_term', data.school_term);
      if (data.school_email) localStorage.setItem('eduflow_school_email', data.school_email);

      saveDBToLocalStorage();
      initDB();
      renderDashboardStats();
      
      alert('School database successfully restored from JSON backup.');
    } catch(err) {
      alert('Error parsing JSON backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function resetToFactoryDefaults() {
  if (confirm("Reset everything to demo factory defaults? This clears your custom school settings and students list.")) {
    localStorage.clear();
    state.db.students = DEFAULT_STUDENTS;
    state.db.attendance = DEFAULT_ATTENDANCE;
    state.db.payments = DEFAULT_PAYMENTS;
    state.db.timetable = DEFAULT_TIMETABLE;
    state.db.notifications = DEFAULT_NOTIFICATIONS;
    await saveDBToLocalStorage();
    location.reload();
  }
}

async function wipeAllDatabaseData() {
  if (confirm("WARNING: Are you sure you want to wipe the database clean? This deletes all students, grades, timetables, and notification histories!")) {
    state.db.students = [];
    state.db.attendance = {};
    state.db.payments = [];
    state.db.timetable = {};
    state.db.notifications = [];
    
    await saveDBToLocalStorage();
    renderDashboardStats();
    loadRawDBIntoDevEditor();
    
    alert('All databases wiped clean. Eduflow is ready for fresh data entry.');
  }
}

// 13. DEVELOPER DEVTOOLS CONTROLS
function loadRawDBIntoDevEditor() {
  const devTextarea = document.getElementById('dev-db-editor');
  if (devTextarea) {
    devTextarea.value = JSON.stringify(state.db, null, 2);
  }
}

function saveRawDBFromDevEditor() {
  const devTextarea = document.getElementById('dev-db-editor');
  if (!devTextarea) return;

  try {
    const parsed = JSON.parse(devTextarea.value);
    
    if (!parsed.students || !parsed.attendance || !parsed.payments) {
      alert('Malformed schema! Database must contain students, attendance, and payments fields.');
      return;
    }

    state.db = parsed;
    saveDBToLocalStorage();
    
    // Refresh modules
    renderDashboardStats();
    if (state.currentSection === 'results') renderResultsRoster();
    if (state.currentSection === 'attendance') renderAttendanceRoster();
    if (state.currentSection === 'fees') renderFeesModule();
    if (state.currentSection === 'schedules') renderTimetableGrid();
    if (state.currentSection === 'notifications') renderNotificationsModule();

    alert('Raw Database JSON changes successfully parsed and saved to local storage.');
  } catch(err) {
    alert('JSON Parser Error: ' + err.message + '\n\nPlease fix your syntax before saving.');
  }
}

function overrideThemeColor(varName, hexValue) {
  // Save custom variables locally
  localStorage.setItem(`theme_${varName}`, hexValue);
  applyThemeVariable(varName, hexValue);
}

function applyThemeVariable(varName, hexValue) {
  const root = document.documentElement;
  
  if (varName === 'primary') {
    root.style.setProperty('--primary', hexValue);
    
    // Hex to RGB conversion for custom glowing dropshadows
    let r = parseInt(hexValue.slice(1, 3), 16);
    let g = parseInt(hexValue.slice(3, 5), 16);
    let b = parseInt(hexValue.slice(5, 7), 16);
    root.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
    root.style.setProperty('--primary-light', `rgba(${r}, ${g}, ${b}, 0.08)`);
  } else if (varName === 'accent') {
    root.style.setProperty('--accent', hexValue);
  } else if (varName === 'teal') {
    root.style.setProperty('--accent-teal', hexValue);
  }
}

function loadThemeColors() {
  const primary = localStorage.getItem('theme_primary');
  const accent = localStorage.getItem('theme_accent');
  const teal = localStorage.getItem('theme_teal');

  if (primary) applyThemeVariable('primary', primary);
  if (accent) applyThemeVariable('accent', accent);
  if (teal) applyThemeVariable('teal', teal);
}

function resetThemeColors() {
  if (confirm("Reset layout to the default brand identity theme?")) {
    localStorage.removeItem('theme_primary');
    localStorage.removeItem('theme_accent');
    localStorage.removeItem('theme_teal');
    location.reload();
  }
}

// Dev Mock Generators
function devGenerateMockStudents(count) {
  const firstNames = ['Samuel', 'Fatima', 'Oluwaseun', 'Chinedu', 'Amina', 'Kelechi', 'Ngozi', 'Yusuf', 'Tobi', 'Emeka', 'Tunde', 'Zainab', 'Grace', 'Chioma', 'Babatunde'];
  const lastNames = ['Okafor', 'Bello', 'Adebayo', 'Davies', 'Musa', 'Ibrahim', 'Nwosu', 'Okon', 'Okafor', 'Audu', 'Eke', 'Nnamdi', 'Bello', 'Adeleke', 'Amadi'];
  const classes = ['10A', '11B'];

  for (let i = 0; i < count; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const studentName = `${fName} ${lName}`;
    const sClass = classes[Math.random() > 0.5 ? 0 : 1];
    const nextId = state.db.students.length + 1;
    const sRoll = `2026/G${sClass}/${String(nextId).padStart(3, '0')}`;

    // Random grades
    const grades = {
      'Mathematics': { ca: Math.floor(15 + Math.random() * 15), exam: Math.floor(30 + Math.random() * 40) },
      'English Language': { ca: Math.floor(15 + Math.random() * 15), exam: Math.floor(30 + Math.random() * 40) },
      'Chemistry': { ca: Math.floor(15 + Math.random() * 15), exam: Math.floor(30 + Math.random() * 40) },
      'Physics': { ca: Math.floor(15 + Math.random() * 15), exam: Math.floor(30 + Math.random() * 40) }
    };

    // Standard outstanding fees
    const fees = {
      tuition: { amount: sClass === '10A' ? 120000 : 140000, paid: Math.random() > 0.5, due: '2026-07-20' },
      library: { amount: sClass === '10A' ? 15000 : 20000, paid: Math.random() > 0.6, due: '2026-07-20' },
      development: { amount: sClass === '10A' ? 40000 : 45000, paid: Math.random() > 0.7, due: '2026-07-20' }
    };

    state.db.students.push({
      id: nextId,
      name: studentName,
      roll: sRoll,
      class: sClass,
      attendanceRate: `${(85 + Math.random() * 15).toFixed(1)}%`,
      grades: grades,
      fees: fees
    });
  }

  saveDBToLocalStorage();
  renderResultsRoster();
  loadRawDBIntoDevEditor();
  alert(`Mock Generation: Enrolled ${count} new student registers with random grading and billing profiles.`);
}

function devGenerateAttendanceHistory() {
  const dates = ['2026-07-09', '2026-07-08', '2026-07-07', '2026-07-06', '2026-07-05'];
  const states = ['present', 'present', 'present', 'late', 'absent'];

  dates.forEach(d => {
    if (!state.db.attendance[d]) state.db.attendance[d] = {};
    state.db.students.forEach(s => {
      state.db.attendance[d][s.id] = states[Math.floor(Math.random() * states.length)];
    });
  });

  saveDBToLocalStorage();
  loadRawDBIntoDevEditor();
  alert('Mock Generation: Dispatched attendance history logs for the last 5 school days across all active students.');
}

function devGeneratePaymentReceipts() {
  state.db.payments = [];
  
  const items = [
    { title: 'Tuition Fee (Term Package)', amount: 120000 },
    { title: 'Tuition Fee + Library Levy', amount: 135000 },
    { title: 'Campus Infrastructure Fund', amount: 40000 },
    { title: 'First Term Registration Bundle', amount: 175000 }
  ];

  state.db.students.forEach(s => {
    // Generate payments for paid items
    Object.keys(s.fees).forEach(feeKey => {
      if (s.fees[feeKey].paid) {
        const randRef = 'EST-' + Math.floor(10000 + Math.random() * 90000) + '-' + s.name.split(' ')[0].slice(0,2).toUpperCase();
        state.db.payments.push({
          id: 'pay_' + (state.db.payments.length + 1).toString().padStart(3,'0'),
          studentId: s.id,
          studentName: s.name,
          item: feeKey.toUpperCase() + ' Levy Clearance',
          amount: s.fees[feeKey].amount,
          date: '2026-07-0' + Math.floor(1+Math.random()*9) + ' 10:30',
          reference: randRef,
          status: 'Success'
        });
      }
    });
  });

  saveDBToLocalStorage();
  renderFeesModule();
  renderDashboardStats();
  loadRawDBIntoDevEditor();
  alert('Mock Generation: Synced transaction receipt entries for all settled levies.');
}

// 14. ROUTE QUERY PARSER
function parseQueryRole() {
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role') || 'admin';
  state.role = role;
}

// 15. WINDOW DOM LOADER
window.addEventListener('DOMContentLoaded', async () => {
  parseQueryRole();
  await initDB();
  loadThemeColors();
  
  if (state.role === 'superadmin') {
    // Hide standard switcher banner & search bar
    const switcher = document.querySelector('.role-switch-banner');
    if (switcher) switcher.style.display = 'none';
    const searchCont = document.getElementById('header-search-container');
    if (searchCont) searchCont.style.display = 'none';
    
    // Show superadmin top header selector
    const superHeader = document.getElementById('super-header-selector');
    if (superHeader) superHeader.style.display = 'flex';
    
    // Switch sidebar menus
    document.getElementById('sidebar-school-menu').style.display = 'none';
    document.getElementById('sidebar-superadmin-menu').style.display = 'block';
    
    // Update sidebar profile card info
    const avatar = document.getElementById('current-user-avatar');
    const name = document.getElementById('current-user-name');
    const roleLabel = document.getElementById('current-user-role');
    if (avatar) {
      avatar.textContent = 'SA';
      avatar.style.background = 'var(--super-accent)';
    }
    if (name) name.textContent = 'SaaS Super-Admin';
    if (roleLabel) roleLabel.textContent = 'Operations Director';

    // Verify passcode session
    checkSuperSession();
  } else {
    // Standard school role loader
    switchRole(state.role);
    renderSchoolLogoAndBranding();
    populateAppClassDropdowns();
    checkSubscriptionVerification();
    
    // Set picker default colors on UI to match brand specification
    if (state.role === 'admin') {
      const colPrimary = document.getElementById('dev-color-primary');
      if (colPrimary) colPrimary.value = localStorage.getItem('theme_primary') || '#5B4FE0';
      const colAccent = document.getElementById('dev-color-accent');
      if (colAccent) colAccent.value = localStorage.getItem('theme_accent') || '#17B8A6';
      const colTeal = document.getElementById('dev-color-teal');
      if (colTeal) colTeal.value = localStorage.getItem('theme_teal') || '#17B8A6';
    }
  }
});

function renderSchoolLogoAndBranding() {
  const schoolLogoData = localStorage.getItem('eduflow_school_logo') || '';
  const schoolName = localStorage.getItem('eduflow_school_name') || 'Eduflow';
  
  const logoIconDiv = document.querySelector('.sidebar-logo .logo-icon');
  const logoTextSpan = document.querySelector('.sidebar-logo .logo-container span');
  
  if (state.role === 'superadmin') {
    if (logoTextSpan) logoTextSpan.textContent = 'Eduflow SaaS';
    return;
  }
  
  if (schoolLogoData && logoIconDiv) {
    logoIconDiv.innerHTML = `<img src="${schoolLogoData}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">`;
  }
  if (logoTextSpan) {
    logoTextSpan.textContent = schoolName;
    logoTextSpan.style.fontSize = '0.95rem';
    logoTextSpan.style.whiteSpace = 'nowrap';
    logoTextSpan.style.overflow = 'hidden';
    logoTextSpan.style.textOverflow = 'ellipsis';
  }
}

function populateAppClassDropdowns() {
  const schoolProfile = (state.rawDB.schools || []).find(s => s.id === state.schoolId);
  let classes = [
    'SSS 1 Science', 'SSS 1 Commercial', 'SSS 1 Arts',
    'SSS 2 Science', 'SSS 2 Commercial', 'SSS 2 Arts',
    'SSS 3', 'JSS 1', 'JSS 2', 'JSS 3',
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
    'Nursery 1', 'Nursery 2', 'Creche'
  ];
  
  if (schoolProfile && schoolProfile.config && schoolProfile.config.classes && schoolProfile.config.classes.length > 0) {
    classes = schoolProfile.config.classes;
  } else if (schoolProfile && schoolProfile.classes && schoolProfile.classes.length > 0) {
    classes = schoolProfile.classes;
  }
  
  const dropdownIds = [
    'attendance-class-select',
    'results-class-select',
    'schedule-class-select',
    'settings-fees-class',
    'reg-student-class'
  ];
  
  dropdownIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // Preserve existing optgroup structure if present on static HTML
      if (id === 'reg-student-class' && el.options.length > 5) return;
      el.innerHTML = '';
      classes.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = cls;
        el.appendChild(opt);
      });
    }
  });
}

// 16. MOCK PHONE SMS SIMULATOR
let isPhoneOpen = false;
let unreadSMSCount = 0;

function togglePhoneSimulator() {
  const container = document.getElementById('phone-simulator-container');
  isPhoneOpen = !isPhoneOpen;
  if (isPhoneOpen) {
    container.classList.add('active');
    unreadSMSCount = 0;
    updateSMSBadge();
  } else {
    container.classList.remove('active');
  }
}

function addSimulatedSMS(sender, body) {
  const feed = document.getElementById('phone-notification-feed');
  const emptyState = document.getElementById('phone-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement('div');
  bubble.className = 'phone-sms-bubble';
  bubble.style.cssText = 'margin-bottom: 10px;';
  bubble.innerHTML = `
    <div class="phone-sms-header" style="display: flex; justify-content: space-between; font-size: 0.65rem; margin-bottom: 4px; font-family: var(--font-family-mono);">
      <strong style="color: var(--accent);">${sender}</strong>
      <span style="color: #71717a;">${timeStr}</span>
    </div>
    <div class="phone-sms-body" style="font-size: 0.75rem; line-height: 1.35; color: #e4e4e7; text-align: left;">${body}</div>
  `;
  
  feed.insertBefore(bubble, feed.firstChild);
  playNotificationSound();

  if (!isPhoneOpen) {
    unreadSMSCount++;
    updateSMSBadge();
  }
}

function updateSMSBadge() {
  const badge = document.getElementById('phone-badge-count');
  if (badge) {
    if (unreadSMSCount > 0) {
      badge.textContent = unreadSMSCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function clearPhoneSMS() {
  const feed = document.getElementById('phone-notification-feed');
  if (feed) {
    feed.innerHTML = `
      <div class="phone-empty-state" id="phone-empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; padding: 20px;">
        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom: 8px; opacity: 0.5; color: #71717a;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 10.742h.01m3.99 0h.01M9 21h6a2 2 0 002-2V7a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <p style="font-size: 0.75rem; color: #71717a; margin: 0; line-height: 1.4;">No notifications yet. Mark attendance or pay fees to trigger mock SMS dispatches.</p>
      </div>
    `;
  }
  unreadSMSCount = 0;
  updateSMSBadge();
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
    
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.35);
  } catch(e) {
    console.log('AudioContext blocked or not supported');
  }
}

// ==================== INTEGRATED SAAS SUPER-ADMIN ACTIONS ====================

function checkSuperSession() {
  const activeSession = sessionStorage.getItem('superadmin_authenticated');
  const jwtRole = localStorage.getItem('eduflow_role');
  const jwtToken = localStorage.getItem('eduflow_jwt_token');
  const overlay = document.getElementById('super-login-overlay');
  
  console.log("checkSuperSession diagnostics:", {
    activeSession,
    jwtRole,
    jwtToken,
    urlRole: state.role
  });
  
  if (activeSession === 'true' || (jwtRole === 'superadmin' && jwtToken)) {
    console.log("Super-Admin Session verified. Hiding overlay panel.");
    sessionStorage.setItem('superadmin_authenticated', 'true');
    if (overlay) overlay.classList.add('hidden');
    loadSuperDatabase();
  } else {
    console.warn("Super-Admin session invalid. Displaying unlock overlay.");
    if (overlay) overlay.classList.remove('hidden');
  }
}

function handleSuperLogin(event) {
  event.preventDefault();
  
  const userVal = document.getElementById('super-username').value.trim();
  const passVal = document.getElementById('super-password').value;
  
  if (userVal === 'superadmin' && passVal === 'password123') {
    sessionStorage.setItem('superadmin_authenticated', 'true');
    const overlay = document.getElementById('super-login-overlay');
    if (overlay) overlay.classList.add('hidden');
    loadSuperDatabase();
  } else {
    alert('Authentication Failed: Invalid Super-Admin credentials.');
  }
}

function handleSuperLogout() {
  sessionStorage.removeItem('superadmin_authenticated');
  window.location.href = 'index.html';
}

async function loadSuperDatabase() {
  state.role = 'superadmin';
  switchRole('superadmin');

  state.rawDB.schools.forEach(school => {
    if (!school.config) {
      school.config = {
        school_name: school.name,
        school_email: school.email,
        school_term: 'First Term 2026',
        tuition: 150000,
        library: 10000,
        development: 15000,
        theme_primary: '#5B4FE0',
        theme_accent: '#17B8A6',
        theme_teal: '#17B8A6'
      };
    }
  });

  renderSuperOverview();
  populateSuperSchoolSelector();
  loadSuperTenantContext();
  showSection('super-overview');
}

function renderSuperOverview() {
  renderSuperStats();
  renderSuperAdminEnhancements();
}

async function syncSuperDB() {
  try {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.rawDB)
    });
    if (response.ok) {
      state.db.students = (state.rawDB.students || []).filter(s => (s.schoolId || 'school_demo') === state.schoolId);
      state.db.payments = (state.rawDB.payments || []).filter(p => (p.schoolId || 'school_demo') === state.schoolId);
      state.db.notifications = (state.rawDB.notifications || []).filter(n => (n.schoolId || 'school_demo') === state.schoolId);

      renderSuperStats();
      renderSuperSchoolsDirectory();
    }
  } catch(err) {
    console.error('Error syncing global rawDB.', err);
  }
}

function renderSuperStats() {
  const total = state.rawDB.schools.length;
  const pendingKYC = state.rawDB.schools.filter(s => s.kycStatus === 'Pending').length;
  const activeSubs = state.rawDB.schools.filter(s => s.subscriptionStatus === 'Active').length;
  
  let mrr = 0;
  state.rawDB.schools.forEach(s => {
    if (s.subscriptionStatus === 'Active') {
      if (s.plan === 'Standard') mrr += 7500;
      if (s.plan === 'Pro') mrr += 15000;
    }
  });

  const arr = mrr * 12;

  const elTotal = document.getElementById('super-stat-total-schools');
  const elPending = document.getElementById('super-stat-pending-kyc');
  const elActive = document.getElementById('super-stat-active-subs');
  const elMrr = document.getElementById('super-stat-mrr-revenue');
  const elArr = document.getElementById('super-stat-arr-revenue');

  if (elTotal) elTotal.textContent = total;
  if (elPending) elPending.textContent = pendingKYC;
  if (elActive) elActive.textContent = activeSubs;
  if (elMrr) elMrr.textContent = `₦${mrr.toLocaleString()}`;
  if (elArr) elArr.textContent = `₦${arr.toLocaleString()}`;
}

function renderSuperSchoolsDirectory() {
  const tbody = document.getElementById('super-schools-directory-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  state.rawDB.schools.forEach(school => {
    const kycBadge = school.kycStatus === 'Approved' 
      ? `<span class="badge super-badge-active">Approved</span>`
      : `<span class="badge super-badge-pending">Pending Approval</span>`;
      
    const subBadge = school.subscriptionStatus === 'Active'
      ? `<span class="badge super-badge-active">Active</span>`
      : `<span class="badge super-badge-suspended">Suspended</span>`;

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-color)';
    
    let actionsHTML = '';
    
    // Reset Principal Credentials Button
    actionsHTML += `<button class="btn btn-warning" onclick="openSuperResetPrincipalModal('${school.id}')" style="font-size: 0.65rem; padding: 4px 10px; margin-right: 6px; background: #f59e0b; color: #fff; border: none; font-weight: 700;">🔑 Reset Principal</button>`;

    // KYC Audit Button
    actionsHTML += `<button class="btn btn-secondary" onclick="viewTenantKycAndReceipt('${school.id}')" style="font-size: 0.65rem; padding: 4px 10px; margin-right: 6px;">📄 Audit Docs</button>`;

    if (school.kycStatus === 'Pending') {
      actionsHTML += `<button class="btn btn-primary" onclick="approveSchoolKYCDirectory('${school.id}')" style="font-size: 0.65rem; padding: 4px 10px; margin-right: 6px; background: var(--super-accent); border-color: var(--super-accent);">Approve KYC</button>`;
    }
    
    if (school.subscriptionStatus === 'Active') {
      actionsHTML += `<button class="btn btn-secondary" onclick="toggleSchoolSubscriptionDirectory('${school.id}', 'Suspended')" style="font-size: 0.65rem; padding: 4px 10px; border-color: rgba(239, 68, 68, 0.4); color: #ef4444; margin-right: 6px;">Suspend</button>`;
    } else {
      actionsHTML += `<button class="btn btn-primary" onclick="toggleSchoolSubscriptionDirectory('${school.id}', 'Active')" style="font-size: 0.65rem; padding: 4px 10px; margin-right: 6px; background: var(--super-accent); border-color: var(--super-accent);">Activate</button>`;
    }

    const planSelectorHTML = `
      <select onchange="changeTenantPlanTier('${school.id}', this.value)" style="background: rgba(255,255,255,0.04); color: var(--text-main); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600;">
        <option value="Free" ${school.plan === 'Free' ? 'selected' : ''}>Free Tier</option>
        <option value="Standard" ${school.plan === 'Standard' ? 'selected' : ''}>Standard Plan</option>
        <option value="Pro" ${school.plan === 'Pro' ? 'selected' : ''}>Pro Tier</option>
      </select>
    `;

    row.innerHTML = `
      <td style="padding: 14px; font-family: var(--font-family-mono); color: var(--text-secondary);">${school.id}</td>
      <td style="padding: 14px; font-weight: 600; color: var(--text-main);">${school.name}</td>
      <td style="padding: 14px; color: var(--text-secondary);">${school.email}</td>
      <td style="padding: 14px;">${planSelectorHTML}</td>
      <td style="padding: 14px;">${kycBadge}</td>
      <td style="padding: 14px;">${subBadge}</td>
      <td style="padding: 14px; text-align: right;">${actionsHTML}</td>
    `;
    tbody.appendChild(row);
  });

  renderSuperSecurityLogs();
}

async function approveSchoolKYCDirectory(schoolId) {
  const school = state.rawDB.schools.find(s => s.id === schoolId);
  if (school) {
    school.kycStatus = 'Approved';
    await syncSuperDB();
    alert(`School ${school.name} has been KYC-Approved successfully.`);
  }
}

async function toggleSchoolSubscriptionDirectory(schoolId, newStatus) {
  const school = state.rawDB.schools.find(s => s.id === schoolId);
  if (school) {
    school.subscriptionStatus = newStatus;
    await syncSuperDB();
    alert(`School ${school.name} subscription status updated to: ${newStatus.toUpperCase()}.`);
  }
}

function selectSchoolToManageDirectory(schoolId) {
  state.schoolId = schoolId;
  const select = document.getElementById('super-school-select');
  if (select) {
    select.value = schoolId;
  }
  showSection('super-setup');
  loadSuperTenantContext();
}

function populateSuperSchoolSelector() {
  const select = document.getElementById('super-school-select');
  if (!select) return;
  
  select.innerHTML = '';
  state.rawDB.schools.forEach(school => {
    const opt = document.createElement('option');
    opt.value = school.id;
    opt.textContent = `${school.name} (${school.id})`;
    select.appendChild(opt);
  });
  
  select.value = state.schoolId;
}

function loadSuperTenantContext() {
  const select = document.getElementById('super-school-select');
  if (!select) return;
  
  state.schoolId = select.value;
  state.db.students = (state.rawDB.students || []).filter(s => (s.schoolId || 'school_demo') === state.schoolId);
  state.db.payments = (state.rawDB.payments || []).filter(p => (p.schoolId || 'school_demo') === state.schoolId);
  state.db.notifications = (state.rawDB.notifications || []).filter(n => (n.schoolId || 'school_demo') === state.schoolId);

  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  const detailsDiv = document.getElementById('super-school-details-badge');
  if (!school || !detailsDiv) return;

  const planBadge = `<span class="badge" style="background: rgba(91,79,224,0.08); color: var(--primary); font-weight: 700; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; border: 1px solid rgba(91,79,224,0.15); white-space: nowrap;">PLAN: ${school.plan.toUpperCase()}</span>`;
  const kycBadge = school.kycStatus === 'Approved' 
    ? `<span class="badge" style="background: rgba(23,184,166,0.08); color: var(--accent-teal); font-weight: 700; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; border: 1px solid rgba(23,184,166,0.15); white-space: nowrap;">KYC: VERIFIED</span>`
    : `<span class="badge" style="background: rgba(245,158,11,0.08); color: #f59e0b; font-weight: 700; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; border: 1px solid rgba(245,158,11,0.15); white-space: nowrap;">KYC: PENDING</span>`;

  detailsDiv.innerHTML = `${planBadge} ${kycBadge}`;

  const config = school.config || {};
  document.getElementById('super-setup-school-name').value = config.school_name || school.name;
  document.getElementById('super-setup-school-email').value = config.school_email || school.email;
  document.getElementById('super-setup-school-term').value = config.school_term || 'First Term 2026';
  document.getElementById('super-setup-fees-tuition').value = config.tuition || 150000;
  document.getElementById('super-setup-fees-library').value = config.library || 10000;
  document.getElementById('super-setup-fees-development').value = config.development || 15000;
  document.getElementById('super-setup-card-format').value = school.reportCardFormat || 'Premium Crest';

  document.getElementById('super-setup-color-primary').value = config.theme_primary || '#5B4FE0';
  document.getElementById('super-setup-color-accent').value = config.theme_accent || '#17B8A6';
  document.getElementById('super-setup-color-teal').value = config.theme_teal || '#17B8A6';

  renderSuperTenantSubjects();
  renderSuperTenantStudents();
  
  if (state.currentSection === 'super-schedules') renderSuperTenantSchedules();
  if (state.currentSection === 'super-billing') renderSuperTenantBilling();
  if (state.currentSection === 'super-outbox') renderSuperTenantOutbox();
}

async function saveSuperSchoolProfileSettings(event) {
  event.preventDefault();
  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  if (!school) return;

  const sName = document.getElementById('super-setup-school-name').value.trim();
  const sEmail = document.getElementById('super-setup-school-email').value.trim();
  const sTerm = document.getElementById('super-setup-school-term').value.trim();
  const tuition = parseInt(document.getElementById('super-setup-fees-tuition').value);
  const library = parseInt(document.getElementById('super-setup-fees-library').value);
  const dev = parseInt(document.getElementById('super-setup-fees-development').value);
  const format = document.getElementById('super-setup-card-format').value;

  school.name = sName;
  school.email = sEmail;
  school.reportCardFormat = format;

  if (!school.config) school.config = {};
  school.config.school_name = sName;
  school.config.school_email = sEmail;
  school.config.school_term = sTerm;
  school.config.tuition = tuition;
  school.config.library = library;
  school.config.development = dev;

  await syncSuperDB();
  loadSuperTenantContext();
  alert('School profile and fees schedule settings updated successfully.');
}

async function saveSuperSchoolBrandColors(event) {
  event.preventDefault();
  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  if (!school) return;

  const primary = document.getElementById('super-setup-color-primary').value;
  const accent = document.getElementById('super-setup-color-accent').value;
  const teal = document.getElementById('super-setup-color-teal').value;

  if (!school.config) school.config = {};
  school.config.theme_primary = primary;
  school.config.theme_accent = accent;
  school.config.theme_teal = teal;

  await syncSuperDB();
  loadSuperTenantContext();
  alert('School brand custom color palette synchronized.');
}

function renderSuperTenantSubjects() {
  const tbody = document.getElementById('super-subjects-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  if (!school) return;
  
  const subjects = school.subjects || [];
  
  const schedSubjSelect = document.getElementById('super-schedule-subject-select');
  if (schedSubjSelect) {
    schedSubjSelect.innerHTML = '';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      schedSubjSelect.appendChild(opt);
    });
  }

  if (subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.75rem;">No subjects registered yet. Add one above.</td></tr>`;
    return;
  }
  
  subjects.forEach((subj, idx) => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-color)';
    row.innerHTML = `
      <td style="padding: 10px 16px; font-weight: 500; color: var(--text-main);">${subj}</td>
      <td style="padding: 10px 16px; text-align: right;">
        <button class="btn btn-secondary" onclick="deleteSubjectFromSuperTenant(${idx})" style="font-size: 0.65rem; padding: 2px 8px; border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function addSubjectToSuperTenant(event) {
  event.preventDefault();
  const input = document.getElementById('super-new-subject-name');
  const name = input.value.trim();
  if (!name) return;

  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  if (school) {
    if (!school.subjects) school.subjects = [];
    if (school.subjects.includes(name)) {
      alert('Subject already exists for this school!');
      return;
    }
    school.subjects.push(name);
    await syncSuperDB();
    input.value = '';
    loadSuperTenantContext();
  }
}

async function deleteSubjectFromSuperTenant(index) {
  if (confirm('Are you sure you want to delete this subject? It will remove it from the school curriculum.')) {
    const school = state.rawDB.schools.find(s => s.id === state.schoolId);
    if (school && school.subjects) {
      school.subjects.splice(index, 1);
      await syncSuperDB();
      loadSuperTenantContext();
    }
  }
}

function renderSuperTenantStudents() {
  const tbody = document.getElementById('super-students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const students = state.rawDB.students.filter(s => (s.schoolId || 'school_demo') === state.schoolId);
  
  const payStudentSelect = document.getElementById('super-payment-student-select');
  if (payStudentSelect) {
    payStudentSelect.innerHTML = '';
    students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.class})`;
      payStudentSelect.appendChild(opt);
    });
  }

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.75rem;">No students registered for this campus yet.</td></tr>`;
    return;
  }

  students.forEach(student => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-color)';
    row.innerHTML = `
      <td style="padding: 10px 16px; font-family: var(--font-family-mono); color: var(--text-secondary);">${student.roll || 'N/A'}</td>
      <td style="padding: 10px 16px; font-weight: 500; color: var(--text-main);">${student.name}</td>
      <td style="padding: 10px 16px; color: var(--text-secondary);">${student.class}</td>
      <td style="padding: 10px 16px; text-align: right;">
        <button class="btn btn-secondary" onclick="deleteStudentFromSuperTenant(${student.id})" style="font-size: 0.65rem; padding: 2px 8px; border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">Deregister</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function addStudentToSuperTenant(event) {
  event.preventDefault();
  const nameInput = document.getElementById('super-new-student-name');
  const classInput = document.getElementById('super-new-student-class');
  const rollInput = document.getElementById('super-new-student-roll');
  
  const name = nameInput.value.trim();
  const className = classInput.value.trim();
  let roll = rollInput.value.trim();

  if (!name || !className) return;

  const nextId = state.rawDB.students.length > 0 ? Math.max(...state.rawDB.students.map(s => s.id)) + 1 : 1;
  if (!roll) {
    roll = `2026/G${className}/${String(nextId).padStart(3, '0')}`;
  }

  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  const subjectsMap = {};
  if (school && school.subjects) {
    school.subjects.forEach(subj => {
      subjectsMap[subj] = { ca: 0, exam: 0 };
    });
  }

  const newStudent = {
    id: nextId,
    schoolId: state.schoolId,
    name: name,
    class: className,
    roll: roll,
    subjects: subjectsMap,
    grades: {},
    fees: {
      tuition: { amount: school?.config?.tuition || 150000, paid: false },
      library: { amount: school?.config?.library || 10000, paid: false },
      development: { amount: school?.config?.development || 15000, paid: false }
    }
  };

  state.rawDB.students.push(newStudent);
  await syncSuperDB();

  nameInput.value = '';
  classInput.value = '';
  rollInput.value = '';
  loadSuperTenantContext();
}

async function deleteStudentFromSuperTenant(studentId) {
  if (confirm('Are you sure you want to deregister this student?')) {
    state.rawDB.students = state.rawDB.students.filter(s => s.id !== studentId);
    await syncSuperDB();
    loadSuperTenantContext();
  }
}

function renderSuperTenantSchedules() {
  const tbody = document.getElementById('super-schedules-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const timetable = state.rawDB.timetable || {};
  let count = 0;

  Object.keys(timetable).forEach(classKey => {
    const days = timetable[classKey] || {};
    Object.keys(days).forEach(dayKey => {
      const periods = days[dayKey] || {};
      Object.keys(periods).forEach(periodKey => {
        const slot = periods[periodKey] || {};
        
        const school = state.rawDB.schools.find(s => s.id === state.schoolId);
        if (school && school.subjects && school.subjects.includes(slot.subject)) {
          count++;
          const row = document.createElement('tr');
          row.style.borderBottom = '1px solid var(--border-color)';
          row.innerHTML = `
            <td style="padding: 10px 16px; font-weight: 600; color: var(--text-main);">Grade ${classKey}</td>
            <td style="padding: 10px 16px;">${dayKey}</td>
            <td style="padding: 10px 16px; font-family: var(--font-family-mono); color: var(--text-secondary);">${periodKey.toUpperCase()}</td>
            <td style="padding: 10px 16px; font-weight: 500; color: var(--text-main);">${slot.subject}</td>
            <td style="padding: 10px 16px; color: var(--text-secondary);">${slot.teacher}</td>
            <td style="padding: 10px 16px; text-align: right;">
              <button class="btn btn-secondary" onclick="deleteScheduleSlotSuper('${classKey}', '${dayKey}', '${periodKey}')" style="font-size: 0.65rem; padding: 2px 8px; border-color: rgba(239, 68, 68, 0.3); color: #ef4444;">Delete</button>
            </td>
          `;
          tbody.appendChild(row);
        }
      });
    });
  });

  if (count === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.75rem;">No timetable schedule slots configured. Add one above.</td></tr>`;
  }
}

async function addScheduleToSuperTenant(event) {
  event.preventDefault();
  const classVal = document.getElementById('super-schedule-class-select').value;
  const dayVal = document.getElementById('super-schedule-day-select').value;
  const periodVal = document.getElementById('super-schedule-period-select').value;
  const subjectVal = document.getElementById('super-schedule-subject-select').value;
  const teacherVal = document.getElementById('super-schedule-teacher-name').value.trim();

  if (!subjectVal || !teacherVal) {
    alert('Please register subjects first before setting schedule slots.');
    return;
  }

  if (!state.rawDB.timetable) state.rawDB.timetable = {};
  if (!state.rawDB.timetable[classVal]) state.rawDB.timetable[classVal] = {};
  if (!state.rawDB.timetable[classVal][dayVal]) state.rawDB.timetable[classVal][dayVal] = {};

  state.rawDB.timetable[classVal][dayVal][periodVal] = {
    subject: subjectVal,
    teacher: teacherVal
  };

  await syncSuperDB();
  document.getElementById('super-schedule-teacher-name').value = '';
  renderSuperTenantSchedules();
}

async function deleteScheduleSlotSuper(classKey, dayKey, periodKey) {
  if (confirm('Are you sure you want to delete this schedule period slot?')) {
    if (state.rawDB.timetable[classKey] && state.rawDB.timetable[classKey][dayKey]) {
      delete state.rawDB.timetable[classKey][dayKey][periodKey];
      await syncSuperDB();
      renderSuperTenantSchedules();
    }
  }
}

function renderSuperTenantBilling() {
  const tbody = document.getElementById('super-payments-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const payments = state.rawDB.payments.filter(p => (p.schoolId || 'school_demo') === state.schoolId);

  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.75rem;">No payment transactions recorded yet.</td></tr>`;
    return;
  }

  payments.forEach(pay => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-color)';
    row.innerHTML = `
      <td style="padding: 10px 16px; font-family: var(--font-family-mono); color: var(--text-secondary);">${pay.reference}</td>
      <td style="padding: 10px 16px; font-weight: 600; color: var(--text-main);">${pay.studentName}</td>
      <td style="padding: 10px 16px;">${pay.item}</td>
      <td style="padding: 10px 16px; font-family: var(--font-family-mono); font-weight: 500; color: var(--text-main);">₦${pay.amount.toLocaleString()}</td>
      <td style="padding: 10px 16px; color: var(--text-secondary); font-size: 0.75rem;">${pay.date}</td>
      <td style="padding: 10px 16px; text-align: right;"><span class="badge super-badge-active">Success</span></td>
    `;
    tbody.appendChild(row);
  });
}

async function recordSuperManualPayment(event) {
  event.preventDefault();
  const sSelect = document.getElementById('super-payment-student-select');
  const studentId = parseInt(sSelect.value);
  const item = document.getElementById('super-payment-item-select').value;
  const amount = parseInt(document.getElementById('super-payment-amount').value);

  const student = state.rawDB.students.find(s => s.id === studentId);
  if (!student) return;

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const randRef = 'EST-' + Math.floor(10000 + Math.random() * 90000) + '-MN';

  state.rawDB.payments.unshift({
    id: 'pay_' + (state.rawDB.payments.length + 1).toString().padStart(3,'0'),
    schoolId: state.schoolId,
    studentId: studentId,
    studentName: student.name,
    item: item,
    amount: amount,
    date: formattedDate,
    reference: randRef,
    status: 'Success'
  });

  if (student.fees) {
    if (item === 'Tuition Fees') student.fees.tuition.paid = true;
    if (item === 'Library Levy') student.fees.library.paid = true;
    if (item === 'Development Levy') student.fees.development.paid = true;
  }

  if (!state.rawDB.notifications) state.rawDB.notifications = [];
  state.rawDB.notifications.unshift({
    id: state.rawDB.notifications.length + 1,
    schoolId: state.schoolId,
    recipient: `${student.name} Parent`,
    channel: 'SMS',
    destination: '+234 803 000 0000',
    type: 'Billing',
    message: `Payment Alert: Dues of ₦${amount.toLocaleString()} received. Ref: ${randRef}.`,
    date: formattedDate,
    status: 'Delivered'
  });

  await syncSuperDB();
  document.getElementById('super-payment-amount').value = '';
  loadSuperTenantContext();
  alert('Manual payment recorded and synced successfully.');
}

function renderSuperTenantOutbox() {
  const tbody = document.getElementById('super-outbox-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const outbox = (state.rawDB.notifications || []).filter(n => (n.schoolId || 'school_demo') === state.schoolId);

  if (outbox.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px; font-size: 0.75rem;">No notification outbox logs dispatched.</td></tr>`;
    return;
  }

  outbox.forEach(log => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-color)';
    row.innerHTML = `
      <td style="padding: 10px 16px; font-weight: 600; color: var(--text-main);">${log.recipient}</td>
      <td style="padding: 10px 16px;"><span class="badge" style="background: rgba(18,19,42,0.04); color: var(--text-main); font-weight: bold; border: 1px solid var(--border-color);">${log.channel}</span></td>
      <td style="padding: 10px 16px; font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--text-secondary);">${log.destination}</td>
      <td style="padding: 10px 16px; font-weight: 500; color: var(--text-main);">${log.type}</td>
      <td style="padding: 10px 16px; color: var(--text-secondary); font-size: 0.75rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.message}</td>
      <td style="padding: 10px 16px; text-align: right;"><span class="badge super-badge-active" style="font-size: 0.65rem;">${log.status}</span></td>
    `;
    tbody.appendChild(row);
  });
}

function exportSuperTenantDatabaseJSON() {
  const school = state.rawDB.schools.find(s => s.id === state.schoolId);
  if (!school) return;

  const backupData = {
    school: school,
    students: state.rawDB.students.filter(s => (s.schoolId || 'school_demo') === state.schoolId),
    timetable: state.rawDB.timetable,
    payments: state.rawDB.payments.filter(p => (p.schoolId || 'school_demo') === state.schoolId),
    notifications: (state.rawDB.notifications || []).filter(n => (n.schoolId || 'school_demo') === state.schoolId)
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `eduflow_school_${state.schoolId}_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importSuperTenantDatabaseJSON(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.school || !data.students) {
        alert('Invalid school backup structure! Must contain school profile and students array.');
        return;
      }

      const oldSchoolIdx = state.rawDB.schools.findIndex(s => s.id === state.schoolId);
      if (oldSchoolIdx !== -1) {
        state.rawDB.schools[oldSchoolIdx] = data.school;
      }

      state.rawDB.students = state.rawDB.students.filter(s => (s.schoolId || 'school_demo') !== state.schoolId);
      data.students.forEach(s => {
        s.schoolId = state.schoolId;
        state.rawDB.students.push(s);
      });

      if (data.payments) {
        state.rawDB.payments = state.rawDB.payments.filter(p => (p.schoolId || 'school_demo') !== state.schoolId);
        data.payments.forEach(p => {
          p.schoolId = state.schoolId;
          state.rawDB.payments.push(p);
        });
      }

      if (data.notifications) {
        if (!state.rawDB.notifications) state.rawDB.notifications = [];
        state.rawDB.notifications = state.rawDB.notifications.filter(n => (n.schoolId || 'school_demo') !== state.schoolId);
        data.notifications.forEach(n => {
          n.schoolId = state.schoolId;
          state.rawDB.notifications.push(n);
        });
      }

      await syncSuperDB();
      loadSuperTenantContext();
      alert(`School database portfolio successfully restored from JSON backup.`);
    } catch(err) {
      alert('Error parsing JSON backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

async function wipeSuperTenantDatabaseData() {
  if (confirm("WARNING: Are you sure you want to wipe this school's database portfolio clean? This deletes all students, grades, timetables, and billing history for this tenant!")) {
    state.rawDB.students = state.rawDB.students.filter(s => (s.schoolId || 'school_demo') !== state.schoolId);
    state.rawDB.payments = state.rawDB.payments.filter(p => (p.schoolId || 'school_demo') !== state.schoolId);
    if (state.rawDB.notifications) {
      state.rawDB.notifications = state.rawDB.notifications.filter(n => (n.schoolId || 'school_demo') !== state.schoolId);
    }
    
    const school = state.rawDB.schools.find(s => s.id === state.schoolId);
    if (school && school.config) {
      school.subjects = ['Mathematics', 'English Language'];
    }

    await syncSuperDB();
    loadSuperTenantContext();
    alert('Tenant database portfolio wiped clean.');
  }
}

function renderSuperKycVault() {
  const container = document.getElementById('super-kyc-queue-list');
  if (!container) return;
  container.innerHTML = '';

  const schools = state.rawDB.schools || [];

  if (schools.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 12px;">No schools registered.</div>`;
    return;
  }

  schools.forEach(school => {
    const isSelected = school.id === state.selectedKycSchoolId;
    const card = document.createElement('div');
    card.style.background = isSelected ? 'rgba(91, 79, 224, 0.03)' : 'white';
    card.style.border = isSelected ? '1px solid var(--super-accent)' : '1px solid var(--border-color)';
    card.style.borderRadius = 'var(--border-radius-md)';
    card.style.padding = '12px 16px';
    card.style.cursor = 'pointer';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.style.transition = 'var(--transition-smooth)';
    
    const badgeClass = school.kycStatus === 'Approved' ? 'super-badge-active' : 'super-badge-pending';
    const badgeText = school.kycStatus === 'Approved' ? 'Approved' : 'Pending';

    card.innerHTML = `
      <div>
        <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin: 0;">${school.name}</h4>
        <span style="font-size: 0.7rem; color: var(--text-secondary); font-family: var(--font-family-mono);">${school.id}</span>
      </div>
      <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${badgeText}</span>
    `;

    card.addEventListener('click', () => {
      state.selectedKycSchoolId = school.id;
      renderSuperKycVault();
      renderSuperKycReviewPanel();
    });

    container.appendChild(card);
  });

  if (!state.selectedKycSchoolId && schools.length > 0) {
    state.selectedKycSchoolId = schools[0].id;
    renderSuperKycVault();
    renderSuperKycReviewPanel();
  }
}

function renderSuperKycReviewPanel() {
  const panel = document.getElementById('super-kyc-review-panel');
  if (!panel) return;

  const school = state.rawDB.schools.find(s => s.id === state.selectedKycSchoolId);
  if (!school) {
    panel.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Select a school from the queue on the left to begin the compliance review process.</div>`;
    return;
  }

  if (!school.kycMilestones) {
    school.kycMilestones = {
      identity: false,
      address: false,
      license: false,
      principal: false
    };
  }

  const milestones = school.kycMilestones;
  const isApproved = school.kycStatus === 'Approved';
  const allChecked = milestones.identity && milestones.address && milestones.license && milestones.principal;

  panel.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin: 0;">Compliance Audit File</h2>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 4px 0 0 0;">Reviewing ID: <strong style="font-family: var(--font-family-mono); color: var(--super-accent);">${school.id}</strong></p>
        </div>
        <span class="badge ${isApproved ? 'super-badge-active' : 'super-badge-pending'}" style="font-size: 0.75rem; padding: 6px 12px;">
          ${isApproved ? '✓ Verified & Cleared' : '⏳ Compliance Check Underway'}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 0.75rem;">
        <div>School Category: <strong style="color: var(--text-main);">${school.type}</strong></div>
        <div>Registrant Email: <strong style="color: var(--text-main);">${school.email}</strong></div>
      </div>

      <!-- Payment Audits Panel -->
      <div style="background: rgba(91,79,224,0.03); border: 1px solid rgba(91,79,224,0.12); border-radius: var(--border-radius-md); padding: 12px; margin-bottom: 24px; font-size: 0.75rem; text-align: left;">
        <div style="font-weight: 700; color: var(--primary); margin-bottom: 6px;">💳 Subscription & Billing Audits</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>Plan Selected: <strong style="color: var(--text-main);">${school.plan || 'Pro'}</strong></div>
          <div>Payment Method: <strong style="color: var(--text-main);">${school.paymentMethod || 'Online / Paystack'}</strong></div>
          <div style="grid-column: span 2;">Status: <span class="badge ${school.subscriptionStatus === 'Active' ? 'super-badge-active' : 'super-badge-pending'}" style="font-size: 0.65rem; padding: 2px 6px;">${school.subscriptionStatus || 'Active'}</span></div>
        </div>
        ${(school.paymentMethod === 'Manual' && school.paymentProof) ? `
          <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
            <button onclick="viewSuperPaymentProof('${school.id}')" class="btn" style="padding: 6px 12px; font-size: 0.7rem; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">🔍 View Receipt Proof</button>
            ${school.subscriptionStatus === 'Pending Verification' ? `
              <button onclick="approveSuperSubscription('${school.id}')" class="btn" style="padding: 6px 12px; font-size: 0.7rem; background: var(--theme-teal); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">✓ Approve Payment</button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <h4 style="font-size: 0.8rem; color: var(--text-main); margin: 0 0 12px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Accredited Document Attachments</h4>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px;">
        <div class="glass-card" style="padding: 16px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.01) !important; position: relative; overflow: hidden;">
          <div style="font-size: 0.65rem; font-family: var(--font-family-mono); color: var(--text-muted); margin-bottom: 8px;">FILE_REF: MOE_LIC_${school.id.toUpperCase()}</div>
          <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            📜 Board Operating License
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">Official accreditation certificate issued by the Ministry of Education. Approved and sealed.</div>
          <a href="#" onclick="alert('Viewing official board operating license MoE certificate for ${school.name}...')" style="font-size: 0.7rem; font-weight: 700; color: var(--super-accent); text-decoration: none;">🔍 View High-Res Cert</a>
        </div>

        <div class="glass-card" style="padding: 16px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.01) !important; position: relative; overflow: hidden;">
          <div style="font-size: 0.65rem; font-family: var(--font-family-mono); color: var(--text-muted); margin-bottom: 8px;">FILE_REF: PRN_NIN_${school.id.toUpperCase()}</div>
          <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            🪪 Administrator ID Verification
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px;">Valid Government-issued identification document (NIN/National Passport) of the Principal.</div>
          <a href="#" onclick="alert('Viewing governmental identification file passport copy for ${school.name} Admin...')" style="font-size: 0.7rem; font-weight: 700; color: var(--super-accent); text-decoration: none;">🔍 Inspect ID Photo</a>
        </div>
      </div>

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-color);">
        <h4 style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 12px; font-weight: 700;">SaaS Compliance Milestones Checklist</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);">
            <input type="checkbox" id="check-identity" onchange="toggleSuperKycMilestone('identity', this.checked)" ${milestones.identity ? 'checked' : ''} ${isApproved ? 'disabled' : ''}>
            <span>Verify Corporate / Institutional Entity Registry ID</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);">
            <input type="checkbox" id="check-address" onchange="toggleSuperKycMilestone('address', this.checked)" ${milestones.address ? 'checked' : ''} ${isApproved ? 'disabled' : ''}>
            <span>Confirm Physical/Distance Campus Address Accreditations</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);">
            <input type="checkbox" id="check-license" onchange="toggleSuperKycMilestone('license', this.checked)" ${milestones.license ? 'checked' : ''} ${isApproved ? 'disabled' : ''}>
            <span>Validate Education Board Operating License Validity</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary);">
            <input type="checkbox" id="check-principal" onchange="toggleSuperKycMilestone('principal', this.checked)" ${milestones.principal ? 'checked' : ''} ${isApproved ? 'disabled' : ''}>
            <span>Authenticate Principal / Administrator ID Verification</span>
          </label>
        </div>
      </div>

      <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
        <button class="btn btn-teal" id="btn-kyc-approve" onclick="approveSelectedSchoolSuperKYC()" ${(!allChecked || isApproved) ? 'disabled' : ''} style="font-weight: bold; width: 100%; height: 42px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          ✓ Approve KYC & Activate Campus OS
        </button>
      </div>
    </div>
  `;
}

async function toggleSuperKycMilestone(milestoneKey, isChecked) {
  const school = state.rawDB.schools.find(s => s.id === state.selectedKycSchoolId);
  if (school && school.kycMilestones) {
    school.kycMilestones[milestoneKey] = isChecked;
    await syncSuperDB();
    
    const milestones = school.kycMilestones;
    const allChecked = milestones.identity && milestones.address && milestones.license && milestones.principal;
    const approveBtn = document.getElementById('btn-kyc-approve');
    if (approveBtn) {
      approveBtn.disabled = !allChecked;
    }
  }
}

async function approveSelectedSchoolSuperKYC() {
  const school = state.rawDB.schools.find(s => s.id === state.selectedKycSchoolId);
  if (school) {
    school.kycStatus = 'Approved';
    await syncSuperDB();
    renderSuperKycVault();
    renderSuperKycReviewPanel();
    alert(`Compliance audit complete. ${school.name} is now KYC-Cleared and active.`);
  }
}

// 18. MANUAL PAYMENT AND SUBSCRIPTION VERIFICATION CONTROLLERS
function checkSubscriptionVerification() {
  const urlParams = new URLSearchParams(window.location.search);
  const isPendingUrl = urlParams.get('pendingVerify') === 'true';
  const isPendingState = state.subscriptionStatus === 'Pending Verification';
  
  if ((isPendingUrl || isPendingState) && state.role === 'admin') {
    showSubscriptionLockScreen();
  }
}

function showSubscriptionLockScreen() {
  let lockOverlay = document.getElementById('subscription-lock-overlay');
  if (!lockOverlay) {
    lockOverlay = document.createElement('div');
    lockOverlay.id = 'subscription-lock-overlay';
    lockOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(247, 248, 252, 0.96);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    `;
    
    lockOverlay.innerHTML = `
      <div style="background: white; border-radius: var(--border-radius-lg); padding: 40px; box-shadow: var(--shadow-xl); max-width: 500px; text-align: center; border: 1px solid var(--border-color); animation: fadeIn 0.4s ease;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(91,79,224,0.06); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto;">
          <svg width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 style="font-size: 1.4rem; color: var(--text-main); margin-bottom: 12px; font-weight: 800;">Subscription Pending Verification</h3>
        <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.6; margin-bottom: 24px;">
          You selected **Manual Bank Transfer** during onboarding. Our billing department is currently verifying your transaction receipt proof. 
        </p>
        <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px; margin-bottom: 24px; text-align: left; font-size: 0.75rem;">
          <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Reference:</div>
          <div style="color: var(--text-main); line-height: 1.5;">
            • Wema Bank Transfer (VectorDev Technologies)<br>
            • Status: <strong style="color: #F59E0B;">Awaiting Manual Approval</strong><br>
            • School ID: <strong style="font-family: var(--font-family-mono); color: var(--primary);">${state.schoolId}</strong>
          </div>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button onclick="window.location.href='index.html'" class="btn btn-secondary" style="height: 40px; font-size: 0.8rem; padding: 0 16px;">Return to Home</button>
          <button onclick="checkSubscriptionApprovalLive()" class="btn btn-primary" style="height: 40px; font-size: 0.8rem; padding: 0 16px;">Check Live Status</button>
        </div>
        <div style="margin-top: 20px; font-size: 0.7rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 12px;">
          💡 <strong>Simulator Tip:</strong> Open the SaaS Super-Admin panel in another window at <a href="dashboard.html?role=superadmin" target="_blank" style="color: var(--primary); text-decoration: underline; font-weight: bold;">dashboard.html?role=superadmin</a> to view the receipt and click <strong>Approve Payment</strong>!
        </div>
      </div>
    `;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.position = 'relative';
      mainContent.appendChild(lockOverlay);
    }
  }
}

async function checkSubscriptionApprovalLive() {
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const db = await res.json();
      const school = db.schools.find(s => s.id === state.schoolId);
      if (school && school.subscriptionStatus === 'Active') {
        alert('🎉 Your manual payment has been cleared! Unlocking your Campus OS dashboard.');
        const overlay = document.getElementById('subscription-lock-overlay');
        if (overlay) overlay.remove();
        state.subscriptionStatus = 'Active';
      } else {
        alert('Payment verification still in progress. Please check back shortly or approve it in the Super-Admin console.');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function viewSuperPaymentProof(schoolId) {
  const school = state.rawDB.schools.find(s => s.id === schoolId);
  if (!school || !school.paymentProof) return;
  
  let proofModal = document.getElementById('super-proof-modal-overlay');
  if (!proofModal) {
    proofModal = document.createElement('div');
    proofModal.id = 'super-proof-modal-overlay';
    proofModal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    `;
    document.body.appendChild(proofModal);
  }
  
  proofModal.innerHTML = `
    <div style="background: white; border-radius: var(--border-radius-lg); padding: 24px; box-shadow: var(--shadow-xl); max-width: 500px; width: 100%; border: 1px solid var(--border-color); text-align: center; animation: fadeIn 0.3s ease;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 0;">Bank Transfer Receipt Proof - ${school.name}</h4>
        <button onclick="document.getElementById('super-proof-modal-overlay').remove()" style="font-size: 1.4rem; font-weight: 700; background: none; border: none; cursor: pointer; color: var(--text-secondary);">&times;</button>
      </div>
      <div style="border: 1px solid var(--border-color); padding: 8px; border-radius: var(--border-radius-md); background: rgba(0,0,0,0.02); max-height: 400px; overflow-y: auto; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <img src="${school.paymentProof}" style="max-width: 100%; max-height: 360px; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
      </div>
      <button onclick="document.getElementById('super-proof-modal-overlay').remove()" class="btn btn-secondary" style="width: 100%; height: 38px; font-weight: 700;">Close Preview</button>
    </div>
  `;
}

async function approveSuperSubscription(schoolId) {
  const school = state.rawDB.schools.find(s => s.id === schoolId);
  if (!school) return;
  
  if (confirm(`Are you sure you want to approve the manual bank transfer payment for ${school.name}? This will instantly activate their Campus OS.`)) {
    school.subscriptionStatus = 'Active';
    school.kycStatus = 'Approved';
    school.kycMilestones = {
      identity: true,
      address: true,
      license: true,
      principal: true
    };
    
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.rawDB)
      });
      alert(`Subscription & KYC for ${school.name} approved and activated.`);
      renderSuperKycVault();
      renderSuperKycReviewPanel();
    } catch (err) {
      console.error(err);
      alert('Failed to sync approval to backend.');
    }
  }
}

// SaaS Superadmin Database Import/Export & Sync Console
async function exportSystemDatabase() {
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const db = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "db.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      alert("Failed to read database state from server.");
    }
  } catch (err) {
    console.error(err);
    alert("Error fetching database for export.");
  }
}

function handleDbImportFileSelected(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.schools || !parsed.students) {
        alert("Invalid database structure. The file must contain 'schools' and 'students' arrays.");
        input.value = '';
        return;
      }
      window.importedDatabasePayload = parsed;
      document.getElementById('super-db-import-filename').innerText = file.name;
      document.getElementById('super-db-sync-btn').style.display = 'inline-flex';
    } catch (err) {
      alert("Failed to parse JSON file. Please ensure it is a valid database JSON export.");
      input.value = '';
      document.getElementById('super-db-import-filename').innerText = 'No file selected';
      document.getElementById('super-db-sync-btn').style.display = 'none';
      window.importedDatabasePayload = null;
    }
  };
  reader.readAsText(file);
}

async function syncImportedDatabase() {
  if (!window.importedDatabasePayload) return;

  const syncBtn = document.getElementById('super-db-sync-btn');
  const filenameSpan = document.getElementById('super-db-import-filename');
  const fileInput = document.getElementById('super-db-import-input');

  if (confirm("⚠️ WARNING: Are you sure you want to sync changes? This will replace the primary database records on the server with the contents of this file.")) {
    const originalText = syncBtn.innerHTML;
    syncBtn.innerHTML = "Syncing...";
    syncBtn.disabled = true;

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.importedDatabasePayload)
      });

      if (res.ok) {
        alert("🎉 Database successfully synchronized and updated on the server!");
        state.rawDB = window.importedDatabasePayload; // update local memory state
        
        // Refresh directory, tables and setup panels
        renderSuperStats();
        renderSuperSchoolsDirectory();
        renderSuperKycVault();
        renderSuperKycReviewPanel();
        
        // Reset states
        syncBtn.style.display = 'none';
        filenameSpan.innerText = 'No file selected';
        fileInput.value = '';
        window.importedDatabasePayload = null;
      } else {
        alert("Failed to sync updated database to the server.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while syncing database.");
    } finally {
      syncBtn.innerHTML = originalText;
      syncBtn.disabled = false;
    }
  }
}

// ==================== PARENT PORTAL RENDERING MODULE ====================
state.activeParentChildId = 1;

async function renderParentDashboard() {
  const childSelect = document.getElementById('parent-child-select');
  if (!childSelect) return;

  // 1. Fetch parent children
  let childrenList = [];
  try {
    const res = await fetch('/api/parent/children');
    if (res.ok) {
      childrenList = await res.json();
    }
  } catch (err) {
    console.warn("Parent children fetch failed, falling back to local simulation.", err);
  }

  // Fallback if offline/empty
  if (childrenList.length === 0) {
    childrenList = state.db.students.slice(0, 2); 
  }

  // 2. Populate child selector dropdown if empty
  if (childSelect.innerHTML === '') {
    childSelect.innerHTML = '';
    childrenList.forEach((c, idx) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (idx === 0) {
        state.activeParentChildId = c.id;
        opt.selected = true;
      }
      childSelect.appendChild(opt);
    });
  }

  // 3. Render active child context details
  const activeChild = state.db.students.find(s => s.id === parseInt(state.activeParentChildId));
  if (!activeChild) return;

  // Update profile labels
  const avatarEl = document.getElementById('parent-child-avatar');
  const nameEl = document.getElementById('parent-child-name');
  const metaEl = document.getElementById('parent-child-meta');
  if (avatarEl) avatarEl.textContent = activeChild.name.split(' ').map(n => n[0]).join('');
  if (nameEl) nameEl.textContent = activeChild.name;
  if (metaEl) metaEl.textContent = `Grade ${activeChild.class} | Roll: ${activeChild.roll}`;
  
  // Fetch dynamic attendance rate
  let attendanceRate = activeChild.attendanceRate || '95%';
  let presenceCount = 0;
  let totalDays = 0;
  Object.keys(state.db.attendance).forEach(date => {
    const records = state.db.attendance[date];
    if (records && records[activeChild.id]) {
      totalDays++;
      if (records[activeChild.id] === 'present' || records[activeChild.id] === 'late') {
        presenceCount++;
      }
    }
  });
  if (totalDays > 0) {
    attendanceRate = `${Math.round((presenceCount / totalDays) * 100)}%`;
  }
  const rateEl = document.getElementById('parent-child-attendance-rate');
  if (rateEl) rateEl.textContent = attendanceRate;

  // 4. Render cloned report card
  renderReportCard(activeChild.id);
  const originalCard = document.querySelector('.report-card');
  const parentContainer = document.getElementById('parent-child-report-card-container');
  if (originalCard && parentContainer) {
    parentContainer.innerHTML = '';
    const cloned = originalCard.cloneNode(true);
    cloned.style.display = 'block';
    cloned.style.margin = '0 auto';
    cloned.style.maxWidth = '100%';
    cloned.style.boxShadow = 'none';
    parentContainer.appendChild(cloned);
  }

  // 5. Render child fees invoice lists
  renderParentFees(activeChild);

  // 6. Render timetable grid
  const timetableBody = document.getElementById('parent-child-timetable-tbody');
  if (timetableBody) {
    timetableBody.innerHTML = '';
    const classTimetable = state.db.timetable[activeChild.class] || {};
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    weekdays.forEach(day => {
      const slots = classTimetable[day] || {};
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 8px; font-weight: 700; color: var(--text-secondary);">${day.slice(0,3)}</td>
        <td style="padding: 8px;">${slots.p1 ? slots.p1.subject : '—'}</td>
        <td style="padding: 8px;">${slots.p2 ? slots.p2.subject : '—'}</td>
        <td style="padding: 8px;">${slots.p3 ? slots.p3.subject : '—'}</td>
        <td style="padding: 8px;">${slots.p4 ? slots.p4.subject : '—'}</td>
      `;
      timetableBody.appendChild(tr);
    });
  }
}

function switchParentChildContext() {
  const childSelect = document.getElementById('parent-child-select');
  if (childSelect) {
    state.activeParentChildId = parseInt(childSelect.value);
    renderParentDashboard();
  }
}

function renderParentFees(student) {
  const invoiceList = document.getElementById('parent-child-invoice-list');
  if (!invoiceList) return;
  invoiceList.innerHTML = '';

  const itemNames = {
    tuition: 'Tuition Fee (Term Package)',
    library: 'Library Resources Access Levy',
    development: 'Campus Infrastructure Fund'
  };

  let activeTotal = 0;
  activePaymentItems = [];
  activePaymentTotal = 0;
  
  if (student.fees) {
    Object.keys(student.fees).forEach(feeKey => {
      const invoice = student.fees[feeKey];
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--bg-dark-border);';
      const statusText = invoice.paid 
        ? `<span class="badge badge-success">Paid</span>`
        : `<span class="badge badge-danger">Outstanding</span>`;

      row.innerHTML = `
        <div>
          <span style="font-weight: 600; font-size: 0.85rem; display: block; color: var(--text-main);">${itemNames[feeKey] || feeKey}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">Due: ${invoice.due}</span>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 700; display: block; font-size: 0.85rem; color: var(--text-main);">₦${invoice.amount.toLocaleString()}</span>
          ${statusText}
        </div>
      `;
      invoiceList.appendChild(row);

      if (!invoice.paid) {
        activeTotal += invoice.amount;
        activePaymentItems.push({ key: feeKey, title: itemNames[feeKey] || feeKey, amount: invoice.amount });
      }
    });
  }

  const outstandingTitle = document.getElementById('parent-child-outstanding-title');
  if (outstandingTitle) outstandingTitle.textContent = `₦${activeTotal.toLocaleString()}`;
  activePaymentTotal = activeTotal;

  // Toggle checkout button
  const triggerBtn = document.getElementById('parent-btn-trigger-payment');
  if (triggerBtn) {
    triggerBtn.style.display = activeTotal > 0 ? 'block' : 'none';
  }
}

// ==================== PROPRIETOR ANALYTICS RENDERING ====================
let chartFinancial = null;
let chartAcademic = null;
let chartAttendance = null;

function renderAnalyticsCharts() {
  // 1. Financial Revenue
  let collected = 0;
  let outstanding = 0;
  (state.db.payments || []).forEach(p => collected += p.amount);
  (state.db.students || []).forEach(s => {
    if (s.fees) {
      Object.keys(s.fees).forEach(k => {
        if (!s.fees[k].paid) outstanding += s.fees[k].amount;
      });
    }
  });

  const ctxFinancial = document.getElementById('chart-financial-revenue');
  if (ctxFinancial && typeof Chart !== 'undefined') {
    try {
      if (chartFinancial) chartFinancial.destroy();
      chartFinancial = new Chart(ctxFinancial, {
        type: 'doughnut',
        data: {
          labels: ['Revenue Collected', 'Expected Outstanding'],
          datasets: [{
            data: [collected, outstanding],
            backgroundColor: ['#17B8A6', '#ef4444'],
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#f3f4f6', font: { family: 'Outfit, sans-serif' } }
            }
          }
        }
      });
    } catch(e) { console.warn(e); }
  }

  // 2. Academic Averages
  const subjectAverages = {};
  const subjectCounts = {};
  (state.db.students || []).forEach(s => {
    if (s.grades) {
      Object.keys(s.grades).forEach(sub => {
        const score = (s.grades[sub].ca || 0) + (s.grades[sub].exam || 0);
        subjectAverages[sub] = (subjectAverages[sub] || 0) + score;
        subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;
      });
    }
  });

  const subjects = Object.keys(subjectAverages);
  const averages = subjects.map(sub => Math.round(subjectAverages[sub] / subjectCounts[sub]));

  const ctxAcademic = document.getElementById('chart-academic-averages');
  if (ctxAcademic && typeof Chart !== 'undefined') {
    try {
      if (chartAcademic) chartAcademic.destroy();
      chartAcademic = new Chart(ctxAcademic, {
        type: 'bar',
        data: {
          labels: subjects,
          datasets: [{
            label: 'Class Score Average (%)',
            data: averages,
            backgroundColor: 'rgba(91, 79, 224, 0.65)',
            borderColor: '#5B4FE0',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } catch(e) { console.warn(e); }
  }

  // 3. Attendance Trends
  const dates = ['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11'];
  const rates = dates.map(d => {
    const records = state.db.attendance[d];
    if (!records) return 100;
    const total = Object.keys(records).length;
    if (total === 0) return 100;
    const present = Object.values(records).filter(v => v === 'present' || v === 'late').length;
    return Math.round((present / total) * 100);
  });

  const ctxAttendance = document.getElementById('chart-attendance-trends');
  if (ctxAttendance && typeof Chart !== 'undefined') {
    try {
      if (chartAttendance) chartAttendance.destroy();
      chartAttendance = new Chart(ctxAttendance, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'Attendance Rate (%)',
            data: rates,
            borderColor: '#17B8A6',
            backgroundColor: 'rgba(23, 184, 166, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 50, max: 100, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } catch(e) { console.warn(e); }
  }
}

// ==================== MULTI-DASHBOARD ENHANCEMENT RENDERERS ====================
let chartDailyAttendance = null;
let chartStudentTrajectory = null;
let chartSuperMRR = null;

function renderAdminDashboardEnhancements() {
  // 1. Daily Attendance Donut Chart
  const dateRecords = state.db.attendance['2026-07-11'] || {};
  const totalStudents = (state.db.students || []).length || 1;
  const presents = Object.values(dateRecords).filter(v => v === 'present').length || Math.round(totalStudents * 0.85);
  const lates = Object.values(dateRecords).filter(v => v === 'late').length || Math.round(totalStudents * 0.1);
  const absents = Object.values(dateRecords).filter(v => v === 'absent').length || Math.max(1, totalStudents - presents - lates);

  const ctxDonut = document.getElementById('chart-daily-attendance-breakdown');
  if (ctxDonut && typeof Chart !== 'undefined') {
    try {
      if (chartDailyAttendance) chartDailyAttendance.destroy();
      chartDailyAttendance = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
          labels: ['Present', 'Late', 'Absent'],
          datasets: [{
            data: [presents, lates, absents],
            backgroundColor: ['#17B8A6', '#f59e0b', '#ef4444'],
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#f3f4f6', font: { family: 'Outfit, sans-serif' } }
            }
          }
        }
      });
    } catch (e) {
      console.warn("Donut chart render warning:", e);
    }
  }

  // 2. Fee Recovery Progress Bar
  let totalFees = 0;
  let paidFees = 0;
  (state.db.students || []).forEach(s => {
    if (s.fees) {
      Object.keys(s.fees).forEach(k => {
        totalFees += s.fees[k].amount || 0;
        if (s.fees[k].paid) paidFees += s.fees[k].amount || 0;
      });
    }
  });
  const recoveryPct = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 85;
  const pctText = document.getElementById('fee-recovery-pct-text');
  const bar = document.getElementById('fee-recovery-progress-bar');
  if (pctText) pctText.textContent = `${recoveryPct}%`;
  if (bar) bar.style.width = `${recoveryPct}%`;

  // 3. Top Performing Students Leaderboard
  const topList = document.getElementById('top-students-list');
  if (topList) {
    const studentAvgs = (state.db.students || []).map(s => {
      let sum = 0, count = 0;
      if (s.grades) {
        Object.keys(s.grades).forEach(sub => {
          sum += (s.grades[sub].ca || 0) + (s.grades[sub].exam || 0);
          count++;
        });
      }
      const avg = count > 0 ? (sum / count) : 0;
      return { name: s.name, class: s.class, avg: avg.toFixed(1) };
    }).sort((a, b) => b.avg - a.avg).slice(0, 3);

    const medals = ['🥇', '🥈', '🥉'];
    topList.innerHTML = studentAvgs.map((st, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.1rem;">${medals[idx] || '⭐'}</span>
          <div>
            <p style="font-weight: 700; font-size: 0.85rem; margin: 0; color: var(--text-main);">${st.name}</p>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0;">Grade ${st.class}</p>
          </div>
        </div>
        <span class="badge badge-success" style="font-weight: 700;">${st.avg}% Avg</span>
      </div>
    `).join('');
  }
}

function renderStudentDashboardEnhancements() {
  const student = (state.db.students || []).find(s => s.id === 1) || (state.db.students || [])[0];
  if (!student) return;

  // 1. Next Class Schedule Countdown Widget
  const nextTitle = document.getElementById('student-next-class-title');
  const nextDetail = document.getElementById('student-next-class-detail');
  const nextCountdown = document.getElementById('student-next-class-countdown');
  
  if (nextTitle && nextDetail && nextCountdown) {
    const subjects = ['Mathematics', 'English Language', 'Physics', 'Chemistry'];
    const teachers = ['Dr. Okon', 'Mrs. Adeleke', 'Mr. Ibrahim', 'Engr. Chukwu'];
    const rooms = ['Room 4B', 'Lab 2', 'Hall A', 'Room 12'];
    
    const randomSub = subjects[Math.floor(Math.random() * subjects.length)];
    const randomTeach = teachers[Math.floor(Math.random() * teachers.length)];
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];

    nextTitle.textContent = randomSub;
    nextDetail.textContent = `12:00 PM • ${randomRoom} • ${randomTeach}`;
    nextCountdown.textContent = `Starts in approx. 45 minutes`;
  }

  // 2. Attendance Streaks Badge & Percentage
  const streakPct = document.getElementById('student-streak-pct');
  const streakBadge = document.getElementById('student-streak-badge');
  if (streakPct) streakPct.textContent = student.attendanceRate || '97.5%';
  if (streakBadge) streakBadge.textContent = '🔥 5-DAY STREAK';

  // 3. Student Trajectory Line Chart
  const ctxTraj = document.getElementById('chart-student-grade-trajectory');
  if (ctxTraj && typeof Chart !== 'undefined') {
    try {
      if (chartStudentTrajectory) chartStudentTrajectory.destroy();
      chartStudentTrajectory = new Chart(ctxTraj, {
        type: 'line',
        data: {
          labels: ['First Term 2025', 'Second Term 2025', 'Third Term 2025', 'First Term 2026 (Current)'],
          datasets: [{
            label: 'Cumulative Score Average (%)',
            data: [78.4, 82.1, 85.0, 89.2],
            borderColor: '#5B4FE0',
            backgroundColor: 'rgba(91, 79, 224, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 60, max: 100, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } catch(e) { console.warn(e); }
  }

  // 4. Pending Invoice Banner Trigger
  let unpaidSum = 0;
  if (student.fees) {
    Object.keys(student.fees).forEach(k => {
      if (!student.fees[k].paid) unpaidSum += student.fees[k].amount || 0;
    });
  }
  const banner = document.getElementById('student-pending-invoice-banner');
  const bTitle = document.getElementById('student-banner-title');
  const bSub = document.getElementById('student-banner-sub');
  
  if (banner && unpaidSum > 0) {
    banner.style.display = 'flex';
    if (bTitle) bTitle.textContent = `Outstanding Invoice Balance: ₦${unpaidSum.toLocaleString()}`;
    if (bSub) bSub.textContent = `Tuition fee balance pending clearance for First Term 2026.`;
  } else if (banner) {
    banner.style.display = 'none';
  }
}

function renderSuperAdminEnhancements() {
  // 1. MRR Growth Trend Chart
  const ctxMRR = document.getElementById('chart-super-mrr-growth');
  if (ctxMRR && typeof Chart !== 'undefined') {
    try {
      if (chartSuperMRR) chartSuperMRR.destroy();
      chartSuperMRR = new Chart(ctxMRR, {
        type: 'line',
        data: {
          labels: ['Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026'],
          datasets: [{
            label: 'Platform MRR (₦)',
            data: [15000, 30000, 45000, 60000, 75000, 90000],
            borderColor: '#17B8A6',
            backgroundColor: 'rgba(23, 184, 166, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 0, max: 120000, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9ca3af', callback: v => `₦${(v/1000)}k` } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } catch(e) { console.warn(e); }
  }

  // 2. Real-Time Tenant Activity Stream
  const activityStream = document.getElementById('super-activity-stream');
  if (activityStream) {
    activityStream.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-color);">
        <span class="badge badge-success" style="font-size: 0.65rem;">NEW TENANT</span>
        <div style="flex: 1;">
          <p style="font-size: 0.82rem; font-weight: 600; margin: 0; color: var(--text-main);">Kingsway High School onboarded 12 student accounts</p>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">Lagos State • 12 mins ago</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-color);">
        <span class="badge badge-warning" style="font-size: 0.65rem;">KYC VERIFIED</span>
        <div style="flex: 1;">
          <p style="font-size: 0.82rem; font-weight: 600; margin: 0; color: var(--text-main);">Eduflow Demo School approved for Pro Plan tier</p>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">Superadmin Operations • 1 hr ago</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-color);">
        <span class="badge badge-primary" style="font-size: 0.65rem;">DATABASE BACKUP</span>
        <div style="flex: 1;">
          <p style="font-size: 0.82rem; font-weight: 600; margin: 0; color: var(--text-main);">SQLite database snapshot auto-persisted to disk</p>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">Server Engine • 3 hrs ago</p>
        </div>
      </div>
    `;
  }
}

function handleSuperGlobalBroadcast(event) {
  event.preventDefault();
  const title = document.getElementById('super-broadcast-title').value.trim();
  const body = document.getElementById('super-broadcast-body').value.trim();

  if (!title || !body) return;

  if (!state.db.notifications) state.db.notifications = [];
  state.db.notifications.unshift({
    id: Date.now(),
    title: `📢 SYSTEM BROADCAST: ${title}`,
    body: body,
    date: new Date().toLocaleDateString(),
    type: 'broadcast',
    schoolId: state.schoolId || 'school_demo'
  });

  saveDBToLocalStorage();
  document.getElementById('super-broadcast-title').value = '';
  document.getElementById('super-broadcast-body').value = '';

  alert(`Global Broadcast Dispatched: "${title}" sent to all tenant administrators.`);
}

function impersonateTenantSchool(schoolId) {
  const school = (state.rawDB.schools || []).find(s => s.id === schoolId);
  if (!school) return;

  state.schoolId = schoolId;
  localStorage.setItem('eduflow_school_name', school.name);
  localStorage.setItem('eduflow_school_email', school.email);
  localStorage.setItem('eduflow_school_type', school.type || 'Secondary');
  localStorage.setItem('eduflow_school_logo', school.logo || '');

  switchRole('admin');
  alert(`🎭 Impersonation Mode Active: Switched workspace to "${school.name}". You are now viewing the dashboard as this tenant principal.`);
}

function openSuperResetPrincipalModal(schoolId) {
  const school = (state.rawDB.schools || []).find(s => s.id === schoolId);
  if (!school) return;

  const modal = document.getElementById('super-reset-principal-modal');
  if (!modal) {
    const newPass = prompt(`🔑 SUPERADMIN SECURITY OVERRIDE\n\nReset Principal Password for "${school.name}" (${school.email}):`, school.password || 'admin123');
    if (newPass !== null && newPass.trim() !== '') {
      resetSchoolPrincipalPasswordDirect(schoolId, newPass.trim(), school.email, school.registrar);
    }
    return;
  }

  const elId = document.getElementById('super-reset-school-id');
  const elName = document.getElementById('super-reset-school-name');
  const elEmail = document.getElementById('super-reset-principal-email');
  const elPName = document.getElementById('super-reset-principal-name');
  const elPass = document.getElementById('super-reset-principal-pass');

  if (elId) elId.value = school.id;
  if (elName) elName.textContent = school.name;
  if (elEmail) elEmail.value = school.email || '';
  if (elPName) elPName.value = school.registrar || 'Principal Administrator';
  if (elPass) elPass.value = school.password || 'admin123';

  modal.classList.add('active');
}

function closeSuperResetPrincipalModal() {
  const modal = document.getElementById('super-reset-principal-modal');
  if (modal) modal.classList.remove('active');
}

function handleSuperResetPrincipalSubmit(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  
  const schoolId = document.getElementById('super-reset-school-id').value;
  const pName = document.getElementById('super-reset-principal-name').value.trim();
  const pEmail = document.getElementById('super-reset-principal-email').value.trim();
  const pPass = document.getElementById('super-reset-principal-pass').value;

  if (!schoolId || !pEmail || !pPass) {
    alert("Please provide both email and new password.");
    return;
  }

  resetSchoolPrincipalPasswordDirect(schoolId, pPass, pEmail, pName);
  closeSuperResetPrincipalModal();
}

function resetSchoolPrincipalPasswordDirect(schoolId, newPassword, newEmail, newName) {
  const school = (state.rawDB.schools || []).find(s => s.id === schoolId);
  if (!school) return;

  if (newPassword) school.password = newPassword;
  if (newEmail) school.email = newEmail;
  if (newName) school.registrar = newName;

  // Sync into local registered schools registry
  let localRegSchools = [];
  try {
    localRegSchools = JSON.parse(localStorage.getItem('eduflow_registered_schools') || '[]');
  } catch(e) {}

  let foundLocal = false;
  localRegSchools.forEach(s => {
    if (s.id === schoolId || s.email === school.email) {
      if (newPassword) s.password = newPassword;
      if (newEmail) s.email = newEmail;
      if (newName) s.registrar = newName;
      foundLocal = true;
    }
  });
  if (!foundLocal) {
    localRegSchools.push(school);
  }
  localStorage.setItem('eduflow_registered_schools', JSON.stringify(localRegSchools));

  // Sync active session if this is currently logged-in school
  if (state.schoolId === schoolId) {
    if (newPassword) localStorage.setItem('eduflow_school_password', newPassword);
    if (newEmail) localStorage.setItem('eduflow_school_email', newEmail);
  }

  syncSuperDB();
  renderSuperSchoolsDirectory();
  alert(`✅ SUPERADMIN PRIVILEGE EXECUTED:\n\nUpdated Principal & Login Credentials for "${school.name}".\n\n• Administrator: ${school.registrar || 'Principal'}\n• Login Email: ${school.email}\n• New Password: ${school.password}`);
}

async function changeTenantPlanTier(schoolId, newPlan) {
  const school = (state.rawDB.schools || []).find(s => s.id === schoolId);
  if (school) {
    school.plan = newPlan;
    await syncSuperDB();
    alert(`Plan Updated: ${school.name} subscription tier changed to ${newPlan.toUpperCase()}.`);
  }
}

function viewTenantKycAndReceipt(schoolId) {
  const school = (state.rawDB.schools || []).find(s => s.id === schoolId);
  if (!school) return;

  const modal = document.getElementById('super-kyc-receipt-modal');
  const title = document.getElementById('kyc-modal-title');
  const sName = document.getElementById('kyc-modal-school-name');
  const sSub = document.getElementById('kyc-modal-school-sub');
  const logoDiv = document.getElementById('kyc-modal-logo');
  const receiptContainer = document.getElementById('kyc-modal-receipt-container');
  const approveBtn = document.getElementById('kyc-modal-approve-btn');

  if (title) title.textContent = `Audit Documents: ${school.id}`;
  if (sName) sName.textContent = school.name;
  if (sSub) sSub.textContent = `${school.plan} Plan Tier • KYC: ${school.kycStatus} • Sub: ${school.subscriptionStatus}`;
  
  if (logoDiv) {
    if (school.logo) {
      logoDiv.innerHTML = `<img src="${school.logo}" style="width: 100%; height: 100%; object-fit: contain;">`;
    } else {
      logoDiv.innerHTML = `🏢`;
    }
  }

  if (receiptContainer) {
    if (school.paymentProof) {
      receiptContainer.innerHTML = `<img src="${school.paymentProof}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    } else {
      receiptContainer.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); padding: 20px; text-align: center;">No payment receipt or CAC document uploaded yet for this campus.</p>`;
    }
  }

  if (approveBtn) {
    approveBtn.onclick = async () => {
      school.kycStatus = 'Approved';
      await syncSuperDB();
      closeSuperKycReceiptModal();
      alert(`KYC Verification Approved for ${school.name}.`);
    };
  }

  if (modal) modal.classList.add('active');
}

function closeSuperKycReceiptModal() {
  const modal = document.getElementById('super-kyc-receipt-modal');
  if (modal) modal.classList.remove('active');
}

function toggleGlobalFeatureFlag(featureKey, checkboxEl) {
  const isEnabled = checkboxEl.checked;
  alert(`Platform Feature Flag: ${featureKey.toUpperCase()} is now ${isEnabled ? 'ENABLED [ON]' : 'DISABLED [OFF]'} globally.`);
}

function renderSuperSecurityLogs() {
  const tbody = document.getElementById('super-security-log-tbody');
  if (!tbody) return;

  const logs = [
    { time: '11:14:02', event: 'Super-Admin Authenticated', ip: '127.0.0.1 (Localhost)', status: '<span class="badge badge-success">ALLOWED</span>' },
    { time: '11:02:45', event: 'SQLite DB Auto-Snapshot', ip: 'Server Engine', status: '<span class="badge badge-success">SYNCED</span>' },
    { time: '10:48:12', event: 'Tenant Login (demo@eduflow.com)', ip: '102.89.44.12 (Lagos)', status: '<span class="badge badge-success">ALLOWED</span>' },
    { time: '09:30:19', event: 'JWT Auth Handshake', ip: '197.210.65.8 (Abuja)', status: '<span class="badge badge-success">200 OK</span>' }
  ];

  tbody.innerHTML = logs.map(l => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 8px; font-family: var(--font-family-mono); color: var(--text-muted);">${l.time}</td>
      <td style="padding: 8px; font-weight: 600; color: var(--text-main);">${l.event}</td>
      <td style="padding: 8px; color: var(--text-secondary); font-family: var(--font-family-mono);">${l.ip}</td>
      <td style="padding: 8px;">${l.status}</td>
    </tr>
  `).join('');

  renderMasterAccountsTable();
}

function openSuperOnboardModal() {
  const modal = document.getElementById('super-onboard-school-modal');
  if (modal) modal.classList.add('active');
}

function closeSuperOnboardModal() {
  const modal = document.getElementById('super-onboard-school-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSuperOnboardSchoolSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('ob-school-name').value.trim();
  const email = document.getElementById('ob-admin-email').value.trim();
  const pass = document.getElementById('ob-admin-pass').value.trim();
  const type = document.getElementById('ob-school-type').value;
  const plan = document.getElementById('ob-plan-tier').value;

  if (!name || !email || !pass) return;

  const newId = `school_${Date.now().toString().slice(-4)}`;
  const newSchool = {
    id: newId,
    name: name,
    email: email,
    plan: plan,
    type: type,
    kycStatus: 'Approved',
    subscriptionStatus: 'Active',
    config: {
      school_name: name,
      school_email: email,
      school_term: 'First Term 2026',
      tuition: 150000,
      library: 10000,
      development: 15000,
      theme_primary: '#5B4FE0',
      theme_accent: '#17B8A6',
      theme_teal: '#17B8A6'
    }
  };

  if (!state.rawDB.schools) state.rawDB.schools = [];
  state.rawDB.schools.push(newSchool);

  await syncSuperDB();
  closeSuperOnboardModal();
  alert(`⚡ School Onboarded Successfully!\n\nID: ${newId}\nCampus: ${name}\nAdmin Login: ${email}\nInitial Tier: ${plan.toUpperCase()}`);
}

function renderMasterAccountsTable() {
  const tbody = document.getElementById('master-accounts-tbody');
  if (!tbody) return;

  let accounts = [];

  // 1. Schools Admins / Principals
  (state.rawDB.schools || []).forEach(sc => {
    accounts.push({
      id: `ADM-${sc.id.toUpperCase()}`,
      name: sc.name,
      role: '<span class="badge badge-success">PRINCIPAL / ADMIN</span>',
      school: sc.name,
      email: sc.email,
      rawId: sc.id,
      type: 'admin'
    });
  });

  // 2. Teachers / Form Masters
  const teacherList = (state.db.teachers && state.db.teachers.length > 0) ? state.db.teachers : (state.rawDB.teachers && state.rawDB.teachers.length > 0 ? state.rawDB.teachers : [
    { id: 'TCH-001', name: 'Mr. Chukwuma Okon', email: 'teacher@eduflow.com', assignedClass: 'SSS 1 Science', role: 'Form Master', school: 'Eduflow Academy' },
    { id: 'TCH-002', name: 'Mrs. Funke Adeleke', email: 'funke.teacher@eduflow.com', assignedClass: 'SSS 2 Science', role: 'Subject Teacher', school: 'Eduflow Academy' },
    { id: 'TCH-003', name: 'Dr. Ibrahim Danjuma', email: 'danjuma.teacher@eduflow.com', assignedClass: 'SSS 1 Science', role: 'Subject Teacher', school: 'Eduflow Academy' }
  ]);

  teacherList.forEach(tch => {
    accounts.push({
      id: tch.id,
      name: tch.name,
      role: `<span class="badge" style="background: rgba(91,79,224,0.15); color: #5B4FE0; font-weight: 700;">TEACHER (${tch.assignedClass || 'Unassigned'})</span>`,
      school: tch.school || 'Eduflow Academy',
      email: tch.email,
      rawId: tch.id,
      assignedClass: tch.assignedClass || 'SSS 1 Science',
      type: 'teacher'
    });
  });

  // 3. Parents
  accounts.push({
    id: 'PAR-001',
    name: 'Chief Tobi Adebayo (Sr.)',
    role: '<span class="badge" style="background: rgba(23,184,166,0.15); color: #17B8A6; font-weight: 700;">PARENT / GUARDIAN</span>',
    school: 'Eduflow Academy',
    email: 'parent@eduflow.com',
    rawId: 'parent@eduflow.com',
    type: 'parent'
  });

  // 4. Students
  (state.db.students || []).forEach(st => {
    accounts.push({
      id: `STU-${st.id}`,
      name: st.name,
      role: `<span class="badge badge-warning">STUDENT (${st.class || 'Unassigned'})</span>`,
      school: localStorage.getItem('eduflow_school_name') || 'Eduflow Academy',
      email: `${st.name.toLowerCase().replace(/\s+/g, '')}@eduflow.com`,
      rawId: st.id,
      type: 'student'
    });
  });

  tbody.innerHTML = accounts.map(ac => {
    let actionButtons = `<button class="btn btn-secondary" onclick="resetUserPasswordSuperAdmin('${ac.rawId}', '${ac.type}')" style="font-size: 0.68rem; padding: 4px 8px;">🔑 Reset Pass</button>`;
    if (ac.type === 'teacher') {
      actionButtons = `
        <button class="btn btn-teal" onclick="reassignTeacherClass('${ac.email}')" style="font-size: 0.68rem; padding: 4px 8px; margin-right: 4px; font-weight: 700;">✏️ Assign Class</button>
        <button class="btn btn-primary" onclick="copyTeacherCredentials('${ac.email}')" style="font-size: 0.68rem; padding: 4px 8px;">🔑 Credentials</button>
      `;
    }
    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 10px; font-family: var(--font-family-mono); color: var(--text-muted);">${ac.id}</td>
        <td style="padding: 10px; font-weight: 600; color: var(--text-main);">${ac.name}</td>
        <td style="padding: 10px;">${ac.role}</td>
        <td style="padding: 10px; color: var(--text-secondary);">${ac.school}</td>
        <td style="padding: 10px; font-family: var(--font-family-mono); color: var(--text-secondary);">${ac.email}</td>
        <td style="padding: 10px; text-align: right;">${actionButtons}</td>
      </tr>
    `;
  }).join('');
}

function openAddTeacherModal() {
  const tName = prompt("Provision New Teacher & Form Master Account:\nEnter Full Name (e.g., Mr. Segun Arinze):");
  if (!tName) return;
  const sanitized = tName.toLowerCase().replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '.');
  const tEmail = prompt(`Enter Login Email Address for ${tName}:`, `${sanitized}@eduflow.com`);
  if (!tEmail) return;
  const tSubj = prompt("Assigned Subject (e.g., Mathematics, Physics, Chemistry, English):", "Mathematics");
  const tClass = prompt("Assign Form Master Class Arm (e.g. SSS 1 Science, SSS 2 Commercial, JSS 1, Primary 5):", "SSS 1 Science");
  
  if (!state.db.teachers) state.db.teachers = [];
  const nextId = `TCH-${String(state.db.teachers.length + 1).padStart(3, '0')}`;
  
  const newTeacher = {
    id: nextId,
    schoolId: 'school_demo',
    name: tName,
    email: tEmail,
    subject: tSubj || 'General Science',
    assignedClass: tClass || 'SSS 1 Science',
    role: 'Form Master'
  };

  state.db.teachers.push(newTeacher);
  if (state.rawDB && state.rawDB.teachers) state.rawDB.teachers.push(newTeacher);
  saveDBToLocalStorage();
  renderMasterAccountsTable();
  
  const creds = `======================================\n    FORM MASTER PROVISIONED SUCCESSFULLY  \n======================================\nID          : ${nextId}\nName        : ${tName}\nEmail/User  : ${tEmail}\nPassword    : password123\nForm Master : ${tClass || 'SSS 1 Science'}\nSubject     : ${tSubj}\nLogin URL   : http://localhost:8000/dashboard.html?role=teacher\n======================================`;
  alert(creds);
}

function reassignTeacherClass(teacherEmail) {
  if (!state.db.teachers) state.db.teachers = [];
  let teacher = state.db.teachers.find(t => t.email === teacherEmail);
  if (!teacher && state.rawDB && state.rawDB.teachers) {
    teacher = state.rawDB.teachers.find(t => t.email === teacherEmail);
  }
  if (!teacher) {
    alert("Teacher record not found.");
    return;
  }
  const newClass = prompt(`Reassign Form Master Class Arm for ${teacher.name}:\nCurrent Class: ${teacher.assignedClass || 'Unassigned'}\nEnter target class arm (e.g. SSS 1 Science, SSS 2 Commercial, JSS 2, Primary 5):`, teacher.assignedClass || 'SSS 1 Science');
  if (newClass) {
    teacher.assignedClass = newClass;
    saveDBToLocalStorage();
    renderMasterAccountsTable();
    filterTeacherClassOptions();
    alert(`✓ Successfully reassigned Form Master ${teacher.name} to class arm "${newClass}".`);
  }
}

function copyTeacherCredentials(teacherEmail) {
  if (!state.db.teachers) state.db.teachers = [];
  let teacher = state.db.teachers.find(t => t.email === teacherEmail);
  if (!teacher && state.rawDB && state.rawDB.teachers) {
    teacher = state.rawDB.teachers.find(t => t.email === teacherEmail);
  }
  if (!teacher) {
    alert("Teacher record not found.");
    return;
  }
  const creds = `======================================\n    EDUFLOW TEACHER LOGIN CREDENTIALS  \n======================================\nTeacher Name : ${teacher.name}\nLogin Email  : ${teacher.email}\nPassword     : password123\nForm Master  : ${teacher.assignedClass || 'SSS 1 Science'}\nSubject      : ${teacher.subject || 'General'}\nLogin URL    : http://localhost:8000/dashboard.html?role=teacher\n======================================`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(creds).then(() => {
      alert(`✓ Form Master Credentials Copied to Clipboard!\n\n${creds}`);
    }).catch(() => {
      alert(creds);
    });
  } else {
    alert(creds);
  }
}

function resetUserPasswordSuperAdmin(userId, type) {
  const newPass = prompt(`Master Password Reset: Enter new password for ${type.toUpperCase()} ID: ${userId}:`, 'password123');
  if (newPass) {
    alert(`Password Updated Successfully!\n\nAccount: ${userId}\nNew Password: ${newPass}`);
  }
}

function savePlatformGlobalConfig(event) {
  event.preventDefault();
  const name = document.getElementById('cfg-platform-name').value;
  const email = document.getElementById('cfg-support-email').value;
  const phone = document.getElementById('cfg-support-phone').value;
  const rate = document.getElementById('cfg-rate-standard').value;

  localStorage.setItem('eduflow_platform_name', name);
  localStorage.setItem('eduflow_support_email', email);
  localStorage.setItem('eduflow_support_phone', phone);
  localStorage.setItem('eduflow_rate_standard', rate);

  alert(`⚙️ Platform Settings Saved!\n\nBrand: ${name}\nSupport Email: ${email}\nStandard Rate: ₦${parseFloat(rate).toLocaleString()}/mo`);
}

function toggleDashboardTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const btn = document.getElementById('theme-toggle-btn');
  if (currentTheme === 'light') {
    document.body.removeAttribute('data-theme');
    if (btn) btn.innerHTML = '🌙 Dark Mode';
    localStorage.setItem('eduflow_theme', 'dark');
  } else {
    document.body.setAttribute('data-theme', 'light');
    if (btn) btn.innerHTML = '☀️ Light Mode';
    localStorage.setItem('eduflow_theme', 'light');
  }
}

function openOfficialReportCardModal(studentId = 1) {
  const student = state.db.students.find(s => s.id === parseInt(studentId)) || state.db.students[0];
  const modal = document.getElementById('official-report-card-modal');
  if (!student || !modal) return;

  document.getElementById('rc-student-name').textContent = student.name;
  document.getElementById('rc-student-roll').textContent = student.roll || '2026/G10A/001';
  document.getElementById('rc-student-class').textContent = `Grade ${student.class || '10A'}`;
  document.getElementById('rc-student-att').textContent = student.attendanceRate || '98.5%';

  const tbody = document.getElementById('rc-scores-tbody');
  if (tbody && student.grades) {
    let rows = '';
    let totalScoreSum = 0;
    let count = 0;

    Object.keys(student.grades).forEach(subj => {
      const g = student.grades[subj];
      const ca1 = g.ca1 !== undefined ? g.ca1 : Math.round((g.ca || 0) / 2);
      const ca2 = g.ca2 !== undefined ? g.ca2 : Math.round((g.ca || 0) / 2);
      const exam = g.exam || 0;
      const total = ca1 + ca2 + exam;
      totalScoreSum += total;
      count++;

      let letter = 'A1';
      let remark = 'Excellent';
      if (total < 40) { letter = 'F9'; remark = 'Fail'; }
      else if (total < 45) { letter = 'E8'; remark = 'Pass'; }
      else if (total < 50) { letter = 'D7'; remark = 'Pass'; }
      else if (total < 55) { letter = 'C6'; remark = 'Credit'; }
      else if (total < 60) { letter = 'C5'; remark = 'Credit'; }
      else if (total < 65) { letter = 'C4'; remark = 'Credit'; }
      else if (total < 70) { letter = 'B3'; remark = 'Good'; }
      else if (total < 75) { letter = 'B2'; remark = 'Very Good'; }

      rows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${subj}</td>
          <td style="padding: 8px 10px;">${ca1} / 15</td>
          <td style="padding: 8px 10px;">${ca2} / 15</td>
          <td style="padding: 8px 10px;">${exam} / 70</td>
          <td style="padding: 8px 10px; font-weight: 700; color: #5B4FE0;">${total} / 100</td>
          <td style="padding: 8px 10px; font-weight: 800; color: ${letter.startsWith('A') || letter.startsWith('B') ? '#10b981' : '#f59e0b'};">${letter}</td>
          <td style="padding: 8px 10px; font-style: italic; color: #475569;">${remark}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
    const avg = count > 0 ? (totalScoreSum / count).toFixed(1) : '78.5';
    document.getElementById('rc-student-avg').textContent = `${avg}%`;
  }

  modal.classList.add('active');
}

function closeOfficialReportCardModal() {
  const modal = document.getElementById('official-report-card-modal');
  if (modal) modal.classList.remove('active');
}

// ==================== CLEAN PRODUCTION MODE & DATA WIPER ====================
async function wipeAllDatabaseData() {
  if (confirm("🧹 Are you sure you want to remove all demo data?\n\nThis will clear all sample students, attendance registers, and payment records so you can view and test the real progress of the application from a clean slate.")) {
    state.db.students = [];
    state.db.attendance = {};
    state.db.payments = [];
    state.db.timetable = {};
    state.db.teachers = [];
    state.db.notifications = [];
    
    localStorage.setItem('eduflow_clean_mode', 'true');
    await saveDBToLocalStorage();
    
    // Re-render UI views cleanly
    renderDashboardStats();
    renderResultsRoster();
    renderAttendanceRoster();
    renderFeesTable();
    renderMasterAccountsTable();

    const btn = document.getElementById('clean-mode-toggle-btn');
    if (btn) btn.innerHTML = '✨ Load Sample Demo Data';

    alert("✓ Demo Data Cleared Successfully!\n\nYou are now in Clean Production Mode. You can add real students, assign form masters, and test all functions from scratch.");
  }
}

async function resetToFactoryDefaults() {
  if (confirm("✨ Reset to Sample Demo Data?\n\nThis will re-seed Eduflow OS with realistic sample students, attendance, and fee invoices for testing.")) {
    localStorage.removeItem('eduflow_clean_mode');
    localStorage.removeItem('eduflow_students');
    localStorage.removeItem('eduflow_attendance');
    localStorage.removeItem('eduflow_payments');
    
    state.db.students = DEFAULT_STUDENTS;
    state.db.attendance = DEFAULT_ATTENDANCE;
    state.db.payments = DEFAULT_PAYMENTS;
    state.db.timetable = DEFAULT_TIMETABLE;
    
    await saveDBToLocalStorage();
    
    renderDashboardStats();
    renderResultsRoster();
    renderAttendanceRoster();
    renderFeesTable();
    renderMasterAccountsTable();

    const btn = document.getElementById('clean-mode-toggle-btn');
    if (btn) btn.innerHTML = '🧹 Clean Mode (No Demo)';

    alert("✓ Sample Demo Data Loaded Successfully!");
  }
}

function toggleCleanProductionMode() {
  const isClean = localStorage.getItem('eduflow_clean_mode') === 'true' || (state.db.students && state.db.students.length === 0);
  if (isClean) {
    resetToFactoryDefaults();
  } else {
    wipeAllDatabaseData();
  }
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA Service Worker registered successfully!', reg.scope))
      .catch(err => console.warn('PWA Service Worker registration failed:', err));
  });
}

// 14. MASTER APP INITIALIZATION BOOTSTRAPPER
async function initApp() {
  try {
    await loadDBFromLocalStorage();
    if (typeof loadThemeColors === 'function') loadThemeColors();
    
    // Parse URL role parameter if provided (?role=admin, ?role=teacher, etc.)
    const searchString = (window.location && window.location.search) ? window.location.search : '';
    const urlParams = new URLSearchParams(searchString);
    const roleParam = urlParams.get('role');
    if (roleParam) {
      state.role = roleParam;
    } else {
      state.role = localStorage.getItem('eduflow_role') || 'admin';
    }

    // Populate Admin Class options across dropdowns
    const attSelect = document.getElementById('attendance-class-select');
    const resSelect = document.getElementById('results-class-select');
    if (attSelect) renderAdminClassOptions(attSelect);
    if (resSelect) renderAdminClassOptions(resSelect);

    // Boot UI role and active section
    switchRole(state.role);
    showSection(state.currentSection || 'home');
  } catch(err) {
    console.error("Critical error during Eduflow App initialization:", err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

