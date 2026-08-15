/**
 * Eduflow OS - WhatsApp & SMS Fee Reminder Broadcast Engine
 * File: debtor-broadcast.js
 */

let broadcastActiveTargets = [];
let broadcastSelectedIds = new Set();
let broadcastLastResult = null;

const DEFAULT_WHATSAPP_TEMPLATE = `📢 *[School Name] - Tuition Fee Payment Reminder* 📢

Dear *[Parent Name]*,

This is a gentle reminder regarding the outstanding school fees for your child, *[Student Full Name]* (*[Class & Arm]*), for *[Term]*, *[Academic Session]*.

💳 *Fee Summary:*
• Total Billed: ₦[Total Billed]
• Total Paid: ₦[Amount Paid]
• *Outstanding Balance: ₦[Balance Due]*
• Payment Deadline: [Due Date]

🏦 *School Bank Payment Details:*
• Bank Name: [School Bank Name]
• Account Name: [School Account Name]
• Account Number: [School Account Number]

_Please send proof of payment or bank transaction receipt to the bursary office or reply to this message. Thank you for your continued partnership._`;

/**
 * 1. Dynamic Placeholder Replacement
 */
function interpolateBroadcastTemplate(template, target) {
  if (!target) return template;

  return template
    .replace(/\[School Name\]/g, target.school_name || 'Eduflow Academy')
    .replace(/\[Parent Name\]/g, target.parent_name || 'Parent/Guardian')
    .replace(/\[Student Full Name\]/g, target.student_name || 'Student')
    .replace(/\[Class & Arm\]/g, target.class_name || 'Class')
    .replace(/\[Term\]/g, target.term || 'First Term')
    .replace(/\[Academic Session\]/g, target.session || '2025/2026')
    .replace(/\[Total Billed\]/g, (target.total_billed || 0).toLocaleString())
    .replace(/\[Amount Paid\]/g, (target.amount_paid || 0).toLocaleString())
    .replace(/\[Balance Due\]/g, (target.balance_due || 0).toLocaleString())
    .replace(/\[Due Date\]/g, target.due_date || '2026-09-30')
    .replace(/\[School Bank Name\]/g, target.bank_name || 'First Bank')
    .replace(/\[School Account Name\]/g, target.account_name || 'Eduflow Operations')
    .replace(/\[School Account Number\]/g, target.account_number || '2039810293');
}

/**
 * 2. Fetch Debtor Targets API Call
 */
async function fetchDebtorBroadcastTargets() {
  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const filterClass = document.getElementById('bcast-class-select') ? document.getElementById('bcast-class-select').value : '';
  const minDebt = document.getElementById('bcast-mindebt-input') ? document.getElementById('bcast-mindebt-input').value : '0';

  try {
    const res = await fetch(`/api/finance/debtors/broadcast-targets?schoolId=${encodeURIComponent(schoolId)}&minDebt=${encodeURIComponent(minDebt)}${filterClass ? '&class=' + encodeURIComponent(filterClass) : ''}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.targets)) {
      broadcastActiveTargets = data.targets;
      renderDebtorChecklistTable(broadcastActiveTargets);
      updateLiveMessagePreview();
    }
  } catch(err) {
    console.warn("Error fetching broadcast targets:", err);
  }
}

/**
 * 3. Render Recipient Checklist Table
 */
function renderDebtorChecklistTable(targets) {
  const tbody = document.getElementById('bcast-debtors-tbody');
  const countBadge = document.getElementById('bcast-selected-count');
  if (!tbody) return;

  if (countBadge) countBadge.textContent = `${broadcastSelectedIds.size} / ${targets.length} Selected`;

  if (targets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--text-muted);">🎉 No debtors match the selected filter criteria!</td></tr>`;
    return;
  }

  tbody.innerHTML = targets.map((t, idx) => {
    const isChecked = broadcastSelectedIds.has(String(t.invoice_id));
    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 8px;">
          <input type="checkbox" class="bcast-target-checkbox" value="${t.invoice_id}" ${isChecked ? 'checked' : ''} onchange="toggleDebtorTargetSelection('${t.invoice_id}', this.checked)">
        </td>
        <td style="padding: 8px; font-weight: 700; color: var(--text-main);">${t.student_name}</td>
        <td style="padding: 8px; color: var(--primary); font-weight: 600;">${t.class_name}</td>
        <td style="padding: 8px; font-weight: 700; color: #EF4444; font-family: var(--font-family-mono);">₦${(t.balance_due || 0).toLocaleString()}</td>
        <td style="padding: 8px; font-size: 0.78rem;">${t.parent_name}</td>
        <td style="padding: 8px; font-size: 0.78rem; font-family: var(--font-family-mono);">${t.parent_phone}</td>
        <td style="padding: 8px; text-align: right;">
          <button class="btn btn-secondary" onclick="previewTargetMessage('${t.invoice_id}')" style="padding: 3px 8px; font-size: 0.7rem; font-weight: 700;">👁️ Preview</button>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleDebtorTargetSelection(id, isSelected) {
  if (isSelected) broadcastSelectedIds.add(String(id));
  else broadcastSelectedIds.delete(String(id));

  const countBadge = document.getElementById('bcast-selected-count');
  if (countBadge) countBadge.textContent = `${broadcastSelectedIds.size} / ${broadcastActiveTargets.length} Selected`;
}

function toggleSelectAllDebtorTargets(masterChecked) {
  const checkboxes = document.querySelectorAll('.bcast-target-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = masterChecked;
    if (masterChecked) broadcastSelectedIds.add(cb.value);
    else broadcastSelectedIds.clear();
  });

  const countBadge = document.getElementById('bcast-selected-count');
  if (countBadge) countBadge.textContent = `${broadcastSelectedIds.size} / ${broadcastActiveTargets.length} Selected`;
}

/**
 * 4. Update Live Message Preview Box
 */
function updateLiveMessagePreview() {
  const textarea = document.getElementById('bcast-template-textarea');
  const previewBox = document.getElementById('bcast-live-preview-box');

  const templateText = textarea ? textarea.value : DEFAULT_WHATSAPP_TEMPLATE;
  const sampleTarget = broadcastActiveTargets.length > 0 ? broadcastActiveTargets[0] : null;

  if (previewBox) {
    if (sampleTarget) {
      previewBox.innerHTML = interpolateBroadcastTemplate(templateText, sampleTarget).replace(/\n/g, '<br>');
    } else {
      previewBox.innerHTML = `<em>Select a debtor recipient to preview dynamic message rendering.</em>`;
    }
  }
}

function previewTargetMessage(invoiceId) {
  const target = broadcastActiveTargets.find(t => String(t.invoice_id) === String(invoiceId));
  const textarea = document.getElementById('bcast-template-textarea');
  const previewBox = document.getElementById('bcast-live-preview-box');

  const templateText = textarea ? textarea.value : DEFAULT_WHATSAPP_TEMPLATE;
  if (previewBox && target) {
    previewBox.innerHTML = interpolateBroadcastTemplate(templateText, target).replace(/\n/g, '<br>');
  }
}

/**
 * 5. Execute Batch Reminders Broadcast
 */
async function executeDebtorBroadcastDispatch() {
  const selectedTargets = broadcastActiveTargets.filter(t => broadcastSelectedIds.has(String(t.invoice_id)));
  const targetsToDispatch = selectedTargets.length > 0 ? selectedTargets : broadcastActiveTargets;

  if (targetsToDispatch.length === 0) {
    alert("⚠️ No debtor targets selected for broadcast.");
    return;
  }

  const channel = document.getElementById('bcast-channel-select') ? document.getElementById('bcast-channel-select').value : 'whatsapp';
  const textarea = document.getElementById('bcast-template-textarea');
  const messageTemplate = textarea ? textarea.value : DEFAULT_WHATSAPP_TEMPLATE;

  const submitBtn = document.getElementById('bcast-dispatch-btn');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : '🚀 Dispatch Batch Reminders';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `⏳ Dispatching to ${targetsToDispatch.length} Parents...`;
  }

  const token = localStorage.getItem('eduflow_jwt_token') || localStorage.getItem('authToken');
  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/finance/debtors/send-broadcast', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        schoolId,
        targets: targetsToDispatch,
        channel: channel,
        message_template: messageTemplate
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      broadcastLastResult = data;
      alert(`🎉 BROADCAST DISPATCH COMPLETE!\n\nDispatched: ${data.dispatched_count} Parent Fee Reminders\nChannel: ${channel.toUpperCase()}\nStatus: Delivered to Notification Audit Log`);
      
      if (channel === 'whatsapp' && Array.isArray(data.whatsapp_links) && data.whatsapp_links.length > 0) {
        renderWhatsAppLauncherDrawer(data.whatsapp_links);
      }
    } else {
      alert(`❌ Broadcast Dispatch Error: ${data.message}`);
    }
  } catch(err) {
    alert(`⛔ Network Error: ${err.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

/**
 * 6. WhatsApp Web Click-to-Chat Launcher Drawer
 */
function renderWhatsAppLauncherDrawer(links) {
  const drawer = document.getElementById('bcast-whatsapp-drawer');
  const tbody = document.getElementById('bcast-whatsapp-tbody');

  if (!drawer || !tbody) return;

  tbody.innerHTML = links.map(l => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 8px; font-weight: 700;">${l.student_name}</td>
      <td style="padding: 8px; font-family: var(--font-family-mono);">${l.phone}</td>
      <td style="padding: 8px; text-align: right;">
        <a href="${l.url}" target="_blank" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700; background: #25D366; color: #ffffff; border: none; text-decoration: none;">
          💬 Launch WhatsApp Chat
        </a>
      </td>
    </tr>
  `).join('');

  drawer.style.display = 'block';
}

function resetDefaultBroadcastTemplate() {
  const textarea = document.getElementById('bcast-template-textarea');
  if (textarea) {
    textarea.value = DEFAULT_WHATSAPP_TEMPLATE;
    updateLiveMessagePreview();
  }
}

// Global exports
window.fetchDebtorBroadcastTargets = fetchDebtorBroadcastTargets;
window.toggleDebtorTargetSelection = toggleDebtorTargetSelection;
window.toggleSelectAllDebtorTargets = toggleSelectAllDebtorTargets;
window.updateLiveMessagePreview = updateLiveMessagePreview;
window.previewTargetMessage = previewTargetMessage;
window.executeDebtorBroadcastDispatch = executeDebtorBroadcastDispatch;
window.resetDefaultBroadcastTemplate = resetDefaultBroadcastTemplate;
