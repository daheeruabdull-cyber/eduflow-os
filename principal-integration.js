/**
 * Eduflow OS - Centralized Principal Data Store & Real-Time Sync Engine
 * File: principal-integration.js
 */

const SchoolStore = {
  schoolId: null,
  currentSession: '2025/2026',
  currentTerm: 'First Term',
  classes: [],
  students: [],
  staff: [],
  summary: {
    students_count: 0,
    staff_count: 0,
    classes_count: 12,
    finance: { total_expected: 0, total_collected: 0, total_outstanding: 0, debtors_count: 0 }
  },
  listeners: [],

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  },

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this); } catch(e) { console.warn("SchoolStore listener error:", e); }
    });
  },

  _refreshTimer: null,
  refreshAll() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(async () => {
      this.schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
      console.log(`[SCHOOL STORE] Refreshing central state for tenant: ${this.schoolId}...`);

      try {
        await Promise.all([
          this.fetchSummary(),
          this.fetchClasses(),
          this.fetchStudents(),
          this.fetchStaff()
        ]);

        this.syncViews();
        this.notify();
        console.log(`[SCHOOL STORE] State sync complete. Students: ${this.students.length}, Staff: ${this.staff.length}`);
      } catch(err) {
        console.error("[SCHOOL STORE] Sync error:", err);
      }
    }, 300);
  },

  async fetchSummary() {
    try {
      const res = await fetch(`/api/principal/dashboard-summary?schoolId=${encodeURIComponent(this.schoolId)}`);
      const data = await res.json();
      if (data.success && data.summary) {
        this.summary = { ...this.summary, ...data.summary };
      }
    } catch(e) {}
  },

  async fetchClasses() {
    try {
      const res = await fetch(`/api/classes?schoolId=${encodeURIComponent(this.schoolId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.classes)) {
        this.classes = data.classes;
      }
    } catch(e) {}
  },

  async fetchStudents() {
    try {
      const res = await fetch(`/api/students?schoolId=${encodeURIComponent(this.schoolId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.students)) {
        this.students = data.students;
      }
    } catch(e) {}
  },

  async fetchStaff() {
    try {
      const res = await fetch(`/api/staff?schoolId=${encodeURIComponent(this.schoolId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        this.staff = data.staff;
      }
    } catch(e) {}
  },

  syncViews() {
    // 1. Update Home Dashboard Counters
    const stCountEl = document.getElementById('stat-total-students');
    const staffCountEl = document.getElementById('stat-active-teachers');
    const classCountEl = document.getElementById('stat-active-classes');

    if (stCountEl) stCountEl.textContent = this.summary.students_count || this.students.length || 0;
    if (staffCountEl) staffCountEl.textContent = this.summary.staff_count || this.staff.length || 0;
    if (classCountEl) classCountEl.textContent = this.summary.classes_count || this.classes.length || 12;

    // 2. Update Finance Overview Cards
    if (this.summary.finance) {
      const f = this.summary.finance;
      const expectedEl = document.getElementById('fin-stat-expected');
      const collectedEl = document.getElementById('fin-stat-collected');
      const debtEl = document.getElementById('fin-stat-debt');
      const debtorsEl = document.getElementById('fin-stat-count');

      if (expectedEl) expectedEl.textContent = `₦${(f.total_expected || 0).toLocaleString()}`;
      if (collectedEl) collectedEl.textContent = `₦${(f.total_collected || 0).toLocaleString()}`;
      if (debtEl) debtEl.textContent = `₦${(f.total_outstanding || 0).toLocaleString()}`;
      if (debtorsEl) debtorsEl.textContent = (f.debtors_count || 0);
    }

    // 3. Refresh Active Sub-module Views if available
    if (typeof loadIdCardStudentRoster === 'function') {
      try { loadIdCardStudentRoster(); } catch(e) {}
    }

    if (typeof loadDebtorsLedger === 'function') {
      try { loadDebtorsLedger(); } catch(e) {}
    }

    if (typeof fetchDebtorBroadcastTargets === 'function') {
      try { fetchDebtorBroadcastTargets(); } catch(e) {}
    }

    if (typeof renderMasterAccountsTable === 'function') {
      try { renderMasterAccountsTable(); } catch(e) {}
    }

    if (typeof renderResultsRoster === 'function') {
      try { renderResultsRoster(); } catch(e) {}
    }
  }
};

// Global Initialization & Tab Switch Sync Interceptor
document.addEventListener('DOMContentLoaded', () => {
  SchoolStore.refreshAll();

  // Intercept section switching to auto-sync state
  const originalShowSection = window.showSection;
  if (typeof originalShowSection === 'function') {
    window.showSection = function(sectionId) {
      originalShowSection(sectionId);
      SchoolStore.refreshAll();
    };
  }
});

// Export globally
window.SchoolStore = SchoolStore;
