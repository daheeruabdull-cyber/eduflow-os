/**
 * Eduflow OS - Hardened Authentication Controller & Dynamic Role Router
 * File: login.js
 */

async function handleLoginSubmission(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  const identifierInput = document.getElementById('login-identifier') || document.getElementById('username') || document.getElementById('email');
  const passwordInput = document.getElementById('login-password') || document.getElementById('password');
  const submitBtn = document.getElementById('login-submit-btn') || document.getElementById('submit-btn');

  const identifier = identifierInput ? identifierInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  if (!identifier || !password) {
    alert('Please enter your login identifier (username/email) and password.');
    return false;
  }

  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign In';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Verifying credentials...';
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, username: identifier })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success && data.token) {
      routeUserToDashboard(data.user || { role: data.role, school_id: data.schoolId }, data.token);
      return false;
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
      alert(data.message || 'Authentication Failed: Invalid username or password.');
      return false;
    }
  } catch (err) {
    console.error("Authentication Network Error:", err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
    alert('⛔ Network Error: Server unreachable. Please verify connection.');
    return false;
  }
}

/**
 * Deterministic Frontend Role-Based Dashboard Router
 */
function routeUserToDashboard(user, token) {
  if (!user || !token) {
    alert('Authentication error: Missing user profile or session token.');
    return;
  }

  const normRole = (user.role || '').toLowerCase().trim();
  const schoolId = user.school_id || user.schoolId || localStorage.getItem('eduflow_school_id') || '';

  // Store session tokens & state
  localStorage.setItem('authToken', token);
  localStorage.setItem('eduflow_jwt_token', token);
  localStorage.setItem('userRole', normRole);
  localStorage.setItem('eduflow_role', normRole);
  
  if (schoolId) {
    localStorage.setItem('eduflow_school_id', schoolId);
  }

  if (user.full_name || user.fullName || user.name) {
    localStorage.setItem('eduflow_user_name', user.full_name || user.fullName || user.name);
  }

  console.log(`[ROUTER GATEWAY] User Authorized. Role: "${normRole}", Tenant ID: "${schoolId}"`);

  // Deterministic Route Switch Statement
  switch(normRole) {
    case 'superadmin':
      window.location.replace('/dashboard.html?role=superadmin');
      break;
    case 'principal':
    case 'admin':
      window.location.replace(`/dashboard.html?role=admin${schoolId ? '&schoolId=' + schoolId : ''}`);
      break;
    case 'form_master':
      window.location.replace(`/dashboard.html?role=form_master${schoolId ? '&schoolId=' + schoolId : ''}`);
      break;
    case 'teacher':
      window.location.replace(`/dashboard.html?role=teacher${schoolId ? '&schoolId=' + schoolId : ''}`);
      break;
    case 'student':
      window.location.replace(`/dashboard.html?role=student${schoolId ? '&schoolId=' + schoolId : ''}`);
      break;
    case 'parent':
      window.location.replace('/dashboard.html?role=parent');
      break;
    default:
      alert('Unknown role assigned. Please contact your school administrator.');
      localStorage.clear();
      window.location.replace('/index.html');
  }
}

window.handleLoginSubmission = handleLoginSubmission;
window.routeUserToDashboard = routeUserToDashboard;
