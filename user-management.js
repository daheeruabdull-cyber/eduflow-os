/**
 * Eduflow OS - Frontend User Management & Account Persistence Handler
 * File: user-management.js
 */

async function createUserAccountInDatabase(payload) {
  const token = localStorage.getItem('eduflow_jwt_token') || localStorage.getItem('authToken');
  const currentSchoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';

  const fullPayload = {
    schoolId: currentSchoolId,
    school_id: currentSchoolId,
    ...payload
  };

  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[USER CREATION REQUEST] Dispatching account creation to /api/users/create:`, fullPayload);

  // 1. Real API Request Pipeline to Backend Server Database
  const response = await fetch('/api/users/create', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(fullPayload)
  });

  const data = await response.json().catch(() => ({}));

  // 2. Strict Response Validation: Block Local Mocking on Failure
  if (!response.ok || !data.success) {
    const errorMsg = data.message || `Server Database Error (Status ${response.status})`;
    console.error(`[USER CREATION FAILED] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`[USER CREATION SUCCESS] User account permanently inserted into database:`, data.user);
  return data.user;
}

/**
 * Account Creation Form Listener & Submission Controller
 */
async function submitUserCreationForm(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  const form = event.target || document.getElementById('create-user-form');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : document.getElementById('create-user-btn');

  const fullNameInput = document.getElementById('user-fullname') || document.getElementById('fullName');
  const usernameInput = document.getElementById('user-username') || document.getElementById('username');
  const passwordInput = document.getElementById('user-password') || document.getElementById('password');
  const roleSelect = document.getElementById('user-role') || document.getElementById('role');
  const classSelect = document.getElementById('user-class') || document.getElementById('classAssigned');
  const subjectInput = document.getElementById('user-subject') || document.getElementById('subjectsAssigned');

  const fullName = fullNameInput ? fullNameInput.value.trim() : '';
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  const role = roleSelect ? roleSelect.value.trim() : 'teacher';
  const classAssigned = classSelect ? classSelect.value.trim() : 'SSS 1 Science';
  const subjectsAssigned = subjectInput ? subjectInput.value.trim() : 'General';

  if (!fullName || !username || !password) {
    alert('⚠️ Validation Error: Full name, username, and password are required fields.');
    return false;
  }

  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Create Account';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Persisting to Database...';
  }

  try {
    const payload = {
      fullName,
      username,
      password,
      role,
      classAssigned,
      assigned_class_id: classAssigned,
      assigned_classes: [classAssigned],
      subjectsAssigned,
      assigned_subjects: [subjectsAssigned]
    };

    // Execute real API request and await DB commit
    const createdUser = await createUserAccountInDatabase(payload);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }

    alert(`✅ ACCOUNT CREATED & COMMITTED TO DATABASE!\n\nName: ${createdUser.full_name || fullName}\nRole: ${(createdUser.role || role).toUpperCase()}\nUsername: ${createdUser.username || username}\nStatus: Active`);

    if (form && typeof form.reset === 'function') {
      form.reset();
    }

    if (typeof renderMasterAccountsTable === 'function') {
      renderMasterAccountsTable();
    }

    return true;

  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }

    alert(`❌ Account Creation Failed: ${err.message}`);
    return false;
  }
}

window.createUserAccountInDatabase = createUserAccountInDatabase;
window.submitUserCreationForm = submitUserCreationForm;
