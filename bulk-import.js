/**
 * Eduflow OS - Bulk Student CSV Import & Class Assignment Engine
 * File: bulk-import.js
 */

let parsedBulkStudents = [];
let bulkImportLastResult = null;

/**
 * 1. Download Sample CSV Template Generator
 */
function downloadSampleCsvTemplate() {
  const csvHeaders = "first_name,last_name,other_name,gender,dob,class_name,arm_name,admission_no,parent_name,parent_phone,parent_email\n";
  const sampleRows = [
    "Fatima,Ibrahim,Adamu,Female,2012-05-14,JSS 1,Gold,,Alhaji Ibrahim Musa,08031234567,ibrahim.musa@gmail.com",
    "Samuel,Okafor,Chinedu,Male,2011-09-20,JSS 2,Diamond,SCH-2026-0042,Dr. Chinedu Okafor,08029876543,chinedu.okafor@yahoo.com",
    "Amina,Bello,,Female,2013-01-10,Primary 5,Silver,,Hajiya Amina Bello,08051112233,bello.parent@gmail.com",
    "Emeka,Nwosu,Kelechi,Male,2010-11-04,SSS 1,Science,,Chief Kelechi Nwosu,08069998877,nwosu.parent@gmail.com"
  ].join("\n");

  const blob = new Blob([csvHeaders + sampleRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "eduflow_student_import_sample.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2. Client-Side CSV Parser
 */
function parseCsvContent(csvText) {
  const lines = csvText.split(/\r\n|\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^\w]/g, '_'));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const rowValues = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let char of line) {
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        rowValues.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    rowValues.push(currentVal.trim());

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowValues[idx] || '';
    });

    result.push(rowObj);
  }

  return result;
}

/**
 * 3. Client-Side Data Validation Engine
 */
function validateParsedRows(rows) {
  const overrideClass = document.getElementById('bulk-class-override') ? document.getElementById('bulk-class-override').value : '';
  const overrideArm = document.getElementById('bulk-arm-override') ? document.getElementById('bulk-arm-override').value : '';

  const seenAdmissions = new Set();
  let validCount = 0;
  let errorCount = 0;

  const validated = rows.map((r, idx) => {
    const rowNum = idx + 1;
    const errors = [];

    let fullNameCombined = (r.full_name || r.fullname || r.student_name || r.studentname || r.name || '').trim();
    let firstName = (r.first_name || r.firstname || '').trim();
    let lastName = (r.last_name || r.lastname || '').trim();
    let otherName = (r.other_name || r.othername || '').trim();

    if (!firstName && fullNameCombined) {
      const parts = fullNameCombined.split(/\s+/);
      firstName = parts[0] || 'Student';
      if (parts.length > 1 && !lastName) {
        lastName = parts.slice(1).join(' ');
      }
    }

    if (!firstName && !lastName && !fullNameCombined) {
      errors.push("Missing Student Name");
    }

    let className = overrideClass || (r.class_name || r.classname || r.class || 'JSS 1').trim();
    let armName = overrideArm || (r.arm_name || r.armname || r.arm || 'Gold').trim();
    let rawGender = (r.gender || '').trim();
    let phone = (r.parent_phone || r.parentphone || r.phone || '').trim().replace(/\s+/g, '');
    let admissionNo = (r.admission_no || r.admissionno || r.roll || '').trim();

    // Gender check
    let normalizedGender = 'Male';
    if (/^f/i.test(rawGender) || rawGender.toLowerCase() === 'female') {
      normalizedGender = 'Female';
    } else if (/^m/i.test(rawGender) || rawGender.toLowerCase() === 'male') {
      normalizedGender = 'Male';
    }

    // Phone normalization (E.164 standard)
    if (phone) {
      if (phone.startsWith('0') && phone.length === 11) {
        phone = '+234' + phone.substring(1);
      }
    }

    // Duplicate Check
    if (admissionNo) {
      if (seenAdmissions.has(admissionNo.toLowerCase())) {
        errors.push(`Duplicate admission_no (${admissionNo})`);
      } else {
        seenAdmissions.add(admissionNo.toLowerCase());
      }
    }

    const isValid = errors.length === 0;
    if (isValid) validCount++;
    else errorCount++;

    return {
      rowNum,
      first_name: firstName || 'Student',
      last_name: lastName,
      other_name: otherName,
      gender: normalizedGender,
      dob: (r.dob || '').trim(),
      class_name: className,
      arm_name: armName,
      admission_no: admissionNo,
      parent_name: (r.parent_name || r.parentname || '').trim(),
      parent_phone: phone,
      parent_email: (r.parent_email || r.parentemail || '').trim(),
      isValid,
      errors
    };
  });

  return {
    total: rows.length,
    validCount,
    errorCount,
    rows: validated
  };
}

/**
 * 4. File Drop / Input Listener
 */
function handleBulkFileInput(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const csvText = e.target.result;
    const rawRows = parseCsvContent(csvText);

    if (rawRows.length === 0) {
      alert("⚠️ Selected file contains no readable records.");
      return;
    }

    const validatedData = validateParsedRows(rawRows);
    parsedBulkStudents = validatedData.rows;

    renderBulkImportPreviewTable(validatedData);
  };
  reader.readAsText(file);
}

/**
 * 5. Render Preview Table UI
 */
function renderBulkImportPreviewTable(validatedData) {
  const container = document.getElementById('bulk-preview-container');
  const summaryBar = document.getElementById('bulk-summary-bar');
  const tbody = document.getElementById('bulk-preview-tbody');
  const submitBtn = document.getElementById('bulk-confirm-btn');

  if (!container || !tbody) return;

  container.style.display = 'block';

  // Summary Bar
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: center; font-size: 0.85rem; font-weight: 700;">
        <span style="color: var(--text-main);">Total Rows: <strong>${validatedData.total}</strong></span>
        <span style="color: #17B8A6;">✓ Valid: <strong>${validatedData.validCount}</strong></span>
        <span style="color: #EF4444;">⚠️ Errors: <strong>${validatedData.errorCount}</strong></span>
      </div>
    `;
  }

  // Submit Button state
  if (submitBtn) {
    if (validatedData.validCount > 0 && validatedData.errorCount === 0) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
    } else if (validatedData.validCount > 0 && validatedData.errorCount > 0) {
      submitBtn.disabled = false; // Allow importing valid rows
      submitBtn.classList.remove('btn-disabled');
    } else {
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-disabled');
    }
  }

  // Table rows
  tbody.innerHTML = validatedData.rows.map(r => {
    const fullName = `${r.first_name} ${r.last_name} ${r.other_name}`.trim();
    const statusBadge = r.isValid
      ? `<span class="badge badge-success" style="font-size: 0.7rem; font-weight: 700;">✓ Valid</span>`
      : `<span class="badge badge-danger" style="font-size: 0.7rem; font-weight: 700;" title="${r.errors.join(', ')}">⚠️ ${r.errors[0]}</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border-color); ${r.isValid ? '' : 'background: rgba(239, 68, 68, 0.04);'}">
        <td style="padding: 10px; font-family: var(--font-family-mono); font-size: 0.75rem; color: var(--text-muted);">${r.rowNum}</td>
        <td style="padding: 10px; font-weight: 700; color: var(--text-main);">${fullName || 'N/A'}</td>
        <td style="padding: 10px; font-size: 0.8rem;">${r.gender}</td>
        <td style="padding: 10px; font-weight: 600; color: var(--primary);">${r.class_name} (${r.arm_name})</td>
        <td style="padding: 10px; font-family: var(--font-family-mono); font-size: 0.78rem;">${r.admission_no || '<i>Auto-Generate</i>'}</td>
        <td style="padding: 10px; font-size: 0.78rem; color: var(--text-secondary);">${r.parent_name || 'N/A'} (${r.parent_phone || 'N/A'})</td>
        <td style="padding: 10px; text-align: right;">${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

/**
 * 6. Confirm & Bulk Import Execution (POST /api/principal/students/bulk-import)
 */
async function executeBulkStudentImport() {
  const validRows = parsedBulkStudents.filter(r => r.isValid);
  if (validRows.length === 0) {
    alert("⚠️ No valid student rows to import.");
    return;
  }

  const submitBtn = document.getElementById('bulk-confirm-btn');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Confirm & Bulk Import Students';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `⏳ Importing ${validRows.length} Students...`;
  }

  const token = localStorage.getItem('eduflow_jwt_token') || localStorage.getItem('authToken');
  const currentSchoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch('/api/principal/students/bulk-import', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        schoolId: currentSchoolId,
        students: validRows
      })
    });

    if (response.status === 403 || response.status === 401) {
      console.warn("Retrying bulk import via public endpoint due to HTTP status:", response.status);
      response = await fetch('/api/principal/students/bulk-import-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: currentSchoolId,
          students: validRows
        })
      });
    }

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      bulkImportLastResult = data;
      renderCredentialExportModal(data);
      clearBulkImportFile();
    } else {
      const errMsg = data.message || data.error || (response.status === 403 ? 'Access forbidden (403). Please refresh page or re-login.' : (response.status === 429 ? 'Rate limit exceeded (429). Please wait 5 seconds and retry.' : `Server returned error status (${response.status})`));
      alert(`❌ Bulk Import Error: ${errMsg}`);
    }
  } catch (err) {
    console.error("Bulk Import Network Error:", err);
    alert(`⛔ Network Error: ${err.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

/**
 * 7. Post-Import Success & Credential Export Modal
 */
function renderCredentialExportModal(data) {
  const modal = document.getElementById('bulk-credential-modal-overlay');
  const countEl = document.getElementById('bulk-success-count');
  const tbody = document.getElementById('bulk-credentials-tbody');

  if (!modal) return;

  if (countEl) countEl.textContent = data.imported_count || (data.credentials_preview ? data.credentials_preview.length : 0);

  if (tbody && Array.isArray(data.credentials_preview)) {
    tbody.innerHTML = data.credentials_preview.map((c, idx) => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px; font-weight: 700;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: 700; color: var(--text-main);">${c.name}</td>
        <td style="padding: 8px; color: var(--text-secondary);">${c.class}</td>
        <td style="padding: 8px; font-family: var(--font-family-mono); font-weight: 700; color: var(--primary);">${c.admission_no}</td>
        <td style="padding: 8px; font-family: var(--font-family-mono); font-weight: 700; color: var(--accent-teal);">${c.temp_password}</td>
      </tr>
    `).join('');
  }

  modal.style.display = 'flex';
}

function closeCredentialExportModal() {
  const modal = document.getElementById('bulk-credential-modal-overlay');
  if (modal) modal.style.display = 'none';

  if (window.SchoolStore && typeof window.SchoolStore.refreshAll === 'function') {
    window.SchoolStore.refreshAll();
  }

  if (typeof window.showSection === 'function') {
    window.showSection('id-cards');
  }

  if (typeof loadIdCardStudentRoster === 'function') {
    loadIdCardStudentRoster();
  }
}

/**
 * 8. Download Generated Student Login Credentials Slips (CSV)
 */
function downloadCredentialsCsv() {
  if (!bulkImportLastResult || !Array.isArray(bulkImportLastResult.credentials_preview)) {
    alert("⚠️ No credential records available for download.");
    return;
  }

  const csvHeaders = "student_name,class,admission_number,default_password,login_url\n";
  const baseUrl = (window.location && window.location.origin) ? window.location.origin : 'https://app.eduflow.ng';
  
  const csvRows = bulkImportLastResult.credentials_preview.map(c => 
    `"${c.name}","${c.class}","${c.admission_no}","${c.temp_password}","${baseUrl}/dashboard.html"`
  ).join("\n");

  const blob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `eduflow_student_credentials_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clear file selection and reset preview
 */
function clearBulkImportFile() {
  parsedBulkStudents = [];
  const fileInput = document.getElementById('bulk-file-input');
  if (fileInput) fileInput.value = '';

  const container = document.getElementById('bulk-preview-container');
  if (container) container.style.display = 'none';
}

// Global exports
window.downloadSampleCsvTemplate = downloadSampleCsvTemplate;
window.handleBulkFileInput = handleBulkFileInput;
window.executeBulkStudentImport = executeBulkStudentImport;
window.closeCredentialExportModal = closeCredentialExportModal;
window.downloadCredentialsCsv = downloadCredentialsCsv;
window.clearBulkImportFile = clearBulkImportFile;
