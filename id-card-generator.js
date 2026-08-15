/**
 * Eduflow OS - Student ID Card Studio Engine
 * File: id-card-generator.js
 */

let idCardActiveStudents = [];
let idCardSchoolInfo = {
  name: 'Eduflow International Academy',
  address: 'Azare Campus, Bauchi State, Nigeria',
  phone: '+234 803 123 4567',
  motto: 'Excellence & Character',
  primary_color: '#5B4FE0'
};
let idCardSelectedIds = new Set();
let idCardOrientation = 'portrait'; // 'portrait' | 'landscape'
let idCardActiveSignatureUrl = '';
let signaturePadInstance = null;

/**
 * 1. Pure SVG Code128 Barcode Generator
 */
function generateCode128Svg(text) {
  const code128Patterns = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
  ];

  let bars = "211214"; // Start Code B pattern
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code < 95) {
      bars += code128Patterns[code];
      checksum += code * (i + 1);
    }
  }

  const checkIndex = checksum % 103;
  bars += code128Patterns[checkIndex];
  bars += "2331112"; // Stop Pattern

  let svgWidth = 0;
  for (let char of bars) svgWidth += parseInt(char);

  let x = 0;
  let rects = "";
  for (let i = 0; i < bars.length; i++) {
    const width = parseInt(bars[i]);
    if (i % 2 === 0) {
      rects += `<rect x="${x}" y="0" width="${width}" height="28" fill="#000000"/>`;
    }
    x += width;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 36" width="100%" height="32">
    ${rects}
    <text x="${x / 2}" y="34" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle" fill="#000000">${text}</text>
  </svg>`;
}

/**
 * 2. Render Single CR80 Student ID Card HTML (Portrait & Landscape)
 */
function renderSingleIdCardHTML(student, school, orientation = 'portrait', side = 'front') {
  const primaryColor = school.primary_color || '#5B4FE0';
  const barcodeSvg = generateCode128Svg(student.admission_no);
  const activeSig = student.signature_url || idCardActiveSignatureUrl || '';

  const sigBlock = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
      <div style="height: 24px; width: 85px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #94A3B8; margin-bottom: 2px; background: rgba(0,0,0,0.02); overflow: hidden;">
        ${activeSig ? `<img id="idCardStudentSig" src="${activeSig}" alt="Signature" style="max-height: 22px; max-width: 100%; object-fit: contain;" />` : `<span id="idCardSigPlaceholder" style="font-size: 0.45rem; color: #94A3B8; font-style: italic;">No Signature</span>`}
      </div>
      <span style="font-size: 0.44rem; font-weight: 700; color: #475569; text-transform: uppercase;">Student Signature</span>
    </div>
  `;

  if (orientation === 'landscape') {
    if (side === 'front') {
      return `
        <div class="cr80-card cr80-landscape cr80-front" style="width: 336px; height: 212px; background: #ffffff; color: #0F172A; border-radius: 10px; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #CBD5E1; box-sizing: border-box; display: flex; flex-direction: column; font-family: system-ui, sans-serif;">
          <!-- Top Accent Color Bar -->
          <div style="background: ${primaryColor}; color: #ffffff; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
              <img id="idCardSchoolLogo" src="${school.logo_url || school.logo || '/assets/default-school-logo.png'}" alt="School Logo" style="width: 26px; height: 26px; object-fit: contain; border-radius: 50%; background: #ffffff; padding: 1.5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;" />
              <div style="overflow: hidden;">
                <div id="idCardSchoolName" style="font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${school.name}</div>
                <div id="idCardSchoolMotto" style="font-size: 0.48rem; opacity: 0.9; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${school.motto}</div>
              </div>
            </div>
            <span style="background: #ffffff; color: ${primaryColor}; font-size: 0.48rem; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0;">STUDENT</span>
          </div>

          <!-- Body Grid -->
          <div style="flex: 1; display: grid; grid-template-columns: 80px 1fr; gap: 10px; padding: 10px 12px; align-items: center;">
            <!-- Passport Photo -->
            <div style="text-align: center;">
              <div style="width: 74px; height: 84px; border-radius: 6px; border: 2px solid ${primaryColor}; overflow: hidden; background: #F1F5F9; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                ${student.passport_url ? `<img id="idCardStudentPhoto" src="${student.passport_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<svg width="42" height="42" fill="none" stroke="#94A3B8" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>`}
              </div>
            </div>

            <!-- Student Bio Details -->
            <div style="font-size: 0.68rem; line-height: 1.35;">
              <div id="idCardStudentName" style="font-size: 0.85rem; font-weight: 800; color: #0F172A; margin-bottom: 3px;">${student.full_name}</div>
              <div><span style="color: #64748B;">ADM NO:</span> <strong id="idCardAdmissionNo" style="font-family: monospace; color: ${primaryColor};">${student.admission_no}</strong></div>
              <div><span style="color: #64748B;">CLASS & ARM:</span> <strong id="idCardClassName">${student.class_name} (${student.arm_name})</strong></div>
              <div><span style="color: #64748B;">BLOOD / DOB:</span> <strong>${student.blood_group} | ${student.dob}</strong></div>
              <div><span style="color: #64748B;">SESSION / EXP:</span> <strong>${student.session} | ${student.expiry_date}</strong></div>
            </div>
          </div>

          <!-- Bottom Barcode Area -->
          <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 4px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="width: 180px;">${barcodeSvg}</div>
            <div style="font-size: 0.5rem; color: #64748B; font-weight: 800; text-transform: uppercase;">OFFICIAL IDENTITY CARD</div>
          </div>
        </div>
      `;
    } else {
      // Landscape Back
      return `
        <div class="cr80-card cr80-landscape cr80-back" style="width: 336px; height: 212px; background: #ffffff; color: #0F172A; border-radius: 10px; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #CBD5E1; box-sizing: border-box; display: flex; flex-direction: column; padding: 12px; font-family: system-ui, sans-serif;">
          <div style="font-size: 0.65rem; font-weight: 800; color: ${primaryColor}; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 8px;">TERMS & CONDITIONS</div>
          <p style="font-size: 0.55rem; color: #475569; margin: 0 0 10px 0; line-height: 1.35;">
            This card is non-transferable and remains the official property of <strong>${school.name}</strong>. If found, please return to the school campus at <em>${school.address}</em>.
          </p>
          <div style="font-size: 0.58rem; color: #0F172A; margin-bottom: 10px;">
            <div><strong>EMERGENCY CONTACT:</strong> ${school.phone}</div>
          </div>
          <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #CBD5E1; padding-top: 6px;">
            ${sigBlock}
            <div style="border: 1px dashed ${primaryColor}; padding: 2px 6px; border-radius: 4px; color: ${primaryColor}; font-size: 0.48rem; font-weight: 900;">
              ✓ OFFICIAL STAMP SEAL
            </div>
          </div>
        </div>
      `;
    }
  } else {
    // Portrait Standard (CR80 Portrait 212px x 336px)
    if (side === 'front') {
      return `
        <div class="cr80-card cr80-portrait cr80-front" style="width: 212px; height: 336px; background: #ffffff; color: #0F172A; border-radius: 10px; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #CBD5E1; box-sizing: border-box; display: flex; flex-direction: column; text-align: center; font-family: system-ui, sans-serif;">
          <!-- Top Accent Header -->
          <div style="background: ${primaryColor}; color: #ffffff; padding: 8px 8px 12px 8px; clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); display: flex; flex-direction: column; align-items: center;">
            <img id="idCardSchoolLogo" src="${school.logo_url || school.logo || '/assets/default-school-logo.png'}" alt="School Logo" style="width: 24px; height: 24px; object-fit: contain; border-radius: 50%; background: #ffffff; padding: 1.5px; margin-bottom: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" />
            <div id="idCardSchoolName" style="font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.1;">${school.name}</div>
            <div id="idCardSchoolMotto" style="font-size: 0.48rem; opacity: 0.9; font-style: italic; margin-top: 1px;">${school.motto}</div>
          </div>

          <!-- Photo Avatar -->
          <div style="margin-top: -12px; margin-bottom: 6px; z-index: 2;">
            <div style="width: 72px; height: 82px; border-radius: 6px; border: 2.5px solid #ffffff; overflow: hidden; background: #F1F5F9; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
              ${student.passport_url ? `<img id="idCardStudentPhoto" src="${student.passport_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<svg width="40" height="40" fill="none" stroke="#94A3B8" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>`}
            </div>
          </div>

          <!-- Student Name & Category Badge -->
          <div style="padding: 0 10px;">
            <div id="idCardStudentName" style="font-size: 0.8rem; font-weight: 800; color: #0F172A; margin-bottom: 2px;">${student.full_name}</div>
            <span style="background: ${primaryColor}; color: #ffffff; font-size: 0.48rem; font-weight: 900; padding: 1.5px 8px; border-radius: 10px; text-transform: uppercase;">STUDENT</span>
          </div>

          <!-- Bio Grid -->
          <div style="font-size: 0.58rem; line-height: 1.35; padding: 6px 10px; text-align: left; margin-top: 4px;">
            <div><span style="color: #64748B;">ADM NO:</span> <strong id="idCardAdmissionNo" style="font-family: monospace; color: ${primaryColor};">${student.admission_no}</strong></div>
            <div><span style="color: #64748B;">CLASS & ARM:</span> <strong id="idCardClassName">${student.class_name} (${student.arm_name})</strong></div>
            <div><span style="color: #64748B;">SESSION / EXP:</span> <strong>${student.session} | ${student.expiry_date}</strong></div>
          </div>

          <!-- Bottom Barcode SVG -->
          <div style="margin-top: auto; background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 4px 10px;">
            ${barcodeSvg}
          </div>
        </div>
      `;
    } else {
      // Portrait Back
      return `
        <div class="cr80-card cr80-portrait cr80-back" style="width: 212px; height: 336px; background: #ffffff; color: #0F172A; border-radius: 10px; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #CBD5E1; box-sizing: border-box; display: flex; flex-direction: column; padding: 12px; text-align: center; font-family: system-ui, sans-serif;">
          <div style="font-size: 0.65rem; font-weight: 800; color: ${primaryColor}; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 8px;">TERMS OF USE</div>
          <p style="font-size: 0.52rem; color: #475569; margin: 0 0 10px 0; line-height: 1.35; text-align: left;">
            This card is the official property of <strong>${school.name}</strong>. If found, please return to:
            <br><em>${school.address}</em>
          </p>
          <div style="font-size: 0.55rem; color: #0F172A; margin-bottom: 10px; text-align: left;">
            <div><strong>EMERGENCY:</strong> ${school.phone}</div>
          </div>
          <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #CBD5E1; padding-top: 6px;">
            ${sigBlock}
            <div style="border: 1.5px dashed ${primaryColor}; padding: 4px; border-radius: 4px; color: ${primaryColor}; font-size: 0.48rem; font-weight: 900; text-transform: uppercase;">
              ✓ OFFICIAL CAMPUS STAMP
            </div>
          </div>
        </div>
      `;
    }
  }
}

/**
 * 3. Load Student ID Cards Roster
 */
async function loadIdCardStudentRoster() {
  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const filterClass = document.getElementById('idcard-class-select') ? document.getElementById('idcard-class-select').value : '';

  try {
    const res = await fetch(`/api/students/id-cards?schoolId=${encodeURIComponent(schoolId)}${filterClass ? '&class=' + encodeURIComponent(filterClass) : ''}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.students)) {
      idCardActiveStudents = data.students;
      if (data.school) idCardSchoolInfo = { ...idCardSchoolInfo, ...data.school };

      renderIdCardStudentTable(idCardActiveStudents);

      // Auto-preview first student
      if (idCardActiveStudents.length > 0) {
        renderLiveIdCardPreview(idCardActiveStudents[0]);
      }
    }
  } catch(err) {
    console.warn("Error loading student ID card roster:", err);
  }
}

/**
 * 4. Render Student Checklist Table
 */
function renderIdCardStudentTable(students) {
  const tbody = document.getElementById('idcard-students-tbody');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">🎓 No registered students found for this class filter. Select "All Classes" or add students.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s, idx) => `
    <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="previewStudentIdCard('${s.id}')">
      <td style="padding: 10px;" onclick="event.stopPropagation()">
        <input type="checkbox" class="idcard-row-checkbox" value="${s.id}" onchange="toggleStudentIdSelection('${s.id}', this.checked)">
      </td>
      <td style="padding: 10px; font-weight: 700; color: var(--text-main);">${s.full_name}</td>
      <td style="padding: 10px; font-family: var(--font-family-mono); font-size: 0.78rem;">${s.admission_no}</td>
      <td style="padding: 10px; font-weight: 600; color: var(--primary);">${s.class_name} (${s.arm_name})</td>
      <td style="padding: 10px; text-align: right;">
        <button class="btn btn-secondary" onclick="event.stopPropagation(); previewStudentIdCard('${s.id}')" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 700;">👁️ Preview</button>
      </td>
    </tr>
  `).join('');
}

function toggleStudentIdSelection(studentId, isSelected) {
  if (isSelected) idCardSelectedIds.add(String(studentId));
  else idCardSelectedIds.delete(String(studentId));
}

function toggleSelectAllIdCards(masterChecked) {
  const checkboxes = document.querySelectorAll('.idcard-row-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = masterChecked;
    if (masterChecked) idCardSelectedIds.add(cb.value);
    else idCardSelectedIds.clear();
  });
}

function previewStudentIdCard(studentId) {
  const student = idCardActiveStudents.find(s => String(s.id) === String(studentId));
  if (student) renderLiveIdCardPreview(student);
}

function renderLiveIdCardPreview(student) {
  const frontContainer = document.getElementById('idcard-live-preview-front');
  const backContainer = document.getElementById('idcard-live-preview-back');

  if (frontContainer) frontContainer.innerHTML = renderSingleIdCardHTML(student, idCardSchoolInfo, idCardOrientation, 'front');
  if (backContainer) backContainer.innerHTML = renderSingleIdCardHTML(student, idCardSchoolInfo, idCardOrientation, 'back');
}

function setIdCardOrientation(orientation) {
  idCardOrientation = orientation;
  if (idCardActiveStudents.length > 0) {
    renderLiveIdCardPreview(idCardActiveStudents[0]);
  }
}

/**
 * 5. Batch A4 Print Sheet Generator
 */
function printBatchIdCardsA4() {
  const selectedStudents = idCardActiveStudents.filter(s => idCardSelectedIds.has(String(s.id)));
  const targetList = selectedStudents.length > 0 ? selectedStudents : idCardActiveStudents;

  if (targetList.length === 0) {
    alert("⚠️ No students selected for ID card batch printing.");
    return;
  }

  const modal = document.getElementById('idcard-batch-print-modal');
  const container = document.getElementById('idcard-batch-a4-sheet');

  if (!modal || !container) return;

  // Grid of 8-10 cards per A4 page with cut guidelines
  const cardsHtml = targetList.map((st, idx) => `
    <div style="page-break-inside: avoid; margin: 6px; display: inline-block; border: 1px dashed #CBD5E1; padding: 4px; border-radius: 8px;">
      ${renderSingleIdCardHTML(st, idCardSchoolInfo, idCardOrientation, 'front')}
    </div>
  `).join('');

  container.innerHTML = `
    <div class="a4-print-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; padding: 12px; background: #ffffff;">
      ${cardsHtml}
    </div>
  `;

  modal.style.display = 'flex';
}

function closeBatchIdCardModal() {
  const modal = document.getElementById('idcard-batch-print-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * 6. High-Precision HTML5 Canvas Signature Pad Engine
 */
let isSigDrawing = false;
let sigLastX = 0;
let sigLastY = 0;
let sigHasStrokes = false;

function openSignaturePadModal(studentId) {
  const modal = document.getElementById('idcard-signature-modal');
  if (!modal) return;

  modal.style.display = 'flex';
  if (studentId) window.activeSignatureStudentId = studentId;

  // Allow DOM layout pass to compute display dimensions before initializing canvas
  setTimeout(() => {
    initSignatureCanvas();
  }, 60);
}

function initSignatureCanvas() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const displayW = rect.width > 0 ? rect.width : (canvas.offsetWidth || 470);
  const displayH = rect.height > 0 ? rect.height : (canvas.offsetHeight || 180);

  // Set internal resolution
  canvas.width = displayW;
  canvas.height = displayH;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, displayW, displayH);
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  sigHasStrokes = false;

  if (canvas.dataset.sigEngineBound === "true") return;
  canvas.dataset.sigEngineBound = "true";

  const getCanvasCoordinates = (e) => {
    const cRect = canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    return [clientX - cRect.left, clientY - cRect.top];
  };

  const startSignature = (e) => {
    isSigDrawing = true;
    const [x, y] = getCanvasCoordinates(e);
    sigLastX = x;
    sigLastY = y;
  };

  const drawSignature = (e) => {
    if (!isSigDrawing) return;
    if (e.touches) e.preventDefault();

    const [x, y] = getCanvasCoordinates(e);
    const cCtx = canvas.getContext("2d");
    cCtx.beginPath();
    cCtx.moveTo(sigLastX, sigLastY);
    cCtx.lineTo(x, y);
    cCtx.strokeStyle = "#0F172A";
    cCtx.lineWidth = 2.5;
    cCtx.lineCap = "round";
    cCtx.lineJoin = "round";
    cCtx.stroke();

    sigLastX = x;
    sigLastY = y;
    sigHasStrokes = true;
  };

  const stopSignature = () => {
    isSigDrawing = false;
  };

  // Mouse Listeners
  canvas.addEventListener("mousedown", startSignature);
  canvas.addEventListener("mousemove", drawSignature);
  canvas.addEventListener("mouseup", stopSignature);
  canvas.addEventListener("mouseleave", stopSignature);

  // Touch Listeners
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); startSignature(e); }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); drawSignature(e); }, { passive: false });
  canvas.addEventListener("touchend", stopSignature);
}

function clearSignaturePad() {
  const canvas = document.getElementById('signatureCanvas');
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  sigHasStrokes = false;
}

function isCanvasImageDrawn(canvas) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
  try {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] > 0) return true;
    }
  } catch(e) {}
  return false;
}

function handleSignatureFileUpload(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    idCardActiveSignatureUrl = e.target.result;
    if (idCardActiveStudents.length > 0) {
      renderLiveIdCardPreview(idCardActiveStudents[0]);
    }
    alert("✅ Transparent signature image uploaded and applied to ID card!");
    closeSignaturePadModal();
  };
  reader.readAsDataURL(file);
}

function saveAndApplyDigitalSignature() {
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  if (sigHasStrokes || isCanvasImageDrawn(canvas)) {
    idCardActiveSignatureUrl = canvas.toDataURL("image/png");
    if (idCardActiveStudents.length > 0) {
      renderLiveIdCardPreview(idCardActiveStudents[0]);
    }
    alert("✍️ Digital signature saved and applied to student ID cards!");
    closeSignaturePadModal();
  } else if (idCardActiveSignatureUrl) {
    if (idCardActiveStudents.length > 0) {
      renderLiveIdCardPreview(idCardActiveStudents[0]);
    }
    closeSignaturePadModal();
  } else {
    alert("⚠️ Please draw a signature on the canvas pad or upload a transparent PNG signature file first.");
  }
}

function closeSignaturePadModal() {
  const modal = document.getElementById('idcard-signature-modal');
  if (modal) modal.style.display = 'none';
}

// Global exports
window.generateCode128Svg = generateCode128Svg;
window.renderSingleIdCardHTML = renderSingleIdCardHTML;
window.loadIdCardStudentRoster = loadIdCardStudentRoster;
window.toggleSelectAllIdCards = toggleSelectAllIdCards;
window.toggleStudentIdSelection = toggleStudentIdSelection;
window.previewStudentIdCard = previewStudentIdCard;
window.setIdCardOrientation = setIdCardOrientation;
window.printBatchIdCardsA4 = printBatchIdCardsA4;
window.closeBatchIdCardModal = closeBatchIdCardModal;
window.openSignaturePadModal = openSignaturePadModal;
window.clearSignaturePad = clearSignaturePad;
window.handleSignatureFileUpload = handleSignatureFileUpload;
window.saveAndApplyDigitalSignature = saveAndApplyDigitalSignature;
window.closeSignaturePadModal = closeSignaturePadModal;

document.addEventListener('DOMContentLoaded', () => {
  loadIdCardStudentRoster();
});
