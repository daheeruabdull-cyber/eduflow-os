/**
 * Eduflow OS - Tuition Billing, Debtor Tracking & Printable Receipt Module
 * File: finance-module.js
 */

let activeFinanceReceipt = null;

/**
 * 1. Finance Overview Stats Loader
 */
async function loadFinanceOverviewStats() {
  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  try {
    const res = await fetch(`/api/finance/overview-stats?schoolId=${encodeURIComponent(schoolId)}`);
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      const expectedEl = document.getElementById('fin-stat-expected');
      const collectedEl = document.getElementById('fin-stat-collected');
      const debtEl = document.getElementById('fin-stat-debt');
      const debtorsEl = document.getElementById('fin-stat-count');

      if (expectedEl) expectedEl.textContent = `₦${(s.total_expected || 0).toLocaleString()}`;
      if (collectedEl) collectedEl.textContent = `₦${(s.total_collected || 0).toLocaleString()}`;
      if (debtEl) debtEl.textContent = `₦${(s.total_outstanding || 0).toLocaleString()}`;
      if (debtorsEl) debtorsEl.textContent = (s.debtors_count || 0);
    }
  } catch(err) {
    console.warn("Error loading finance overview stats:", err);
  }
}

/**
 * 2. Fee Structure Line Item Form Handler
 */
async function handleSaveFeeStructure(event) {
  if (event) event.preventDefault();

  const classId = document.getElementById('fee-cfg-class').value;
  const category = document.getElementById('fee-cfg-category').value.trim();
  const amount = parseFloat(document.getElementById('fee-cfg-amount').value);

  if (!category || isNaN(amount) || amount <= 0) {
    alert("⚠️ Please enter a valid fee category name and amount.");
    return;
  }

  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const token = localStorage.getItem('eduflow_jwt_token') || localStorage.getItem('authToken');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/finance/fee-structure', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        schoolId,
        class_id: classId,
        fee_category: category,
        amount: amount,
        is_compulsory: 1
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert("✅ Fee line-item configured successfully!");
      document.getElementById('fee-cfg-category').value = '';
      document.getElementById('fee-cfg-amount').value = '';
      loadFinanceOverviewStats();
    } else {
      alert(`❌ Error: ${data.message}`);
    }
  } catch(err) {
    alert(`⛔ Network Error: ${err.message}`);
  }
}

/**
 * 3. Batch Bill Generation Engine
 */
async function generateTermInvoicesBatch() {
  const session = prompt("Enter Academic Session for billing:", "2025/2026");
  if (!session) return;

  const term = prompt("Enter Term for billing (First Term, Second Term, Third Term):", "First Term");
  if (!term) return;

  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const token = localStorage.getItem('eduflow_jwt_token') || localStorage.getItem('authToken');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/finance/generate-term-invoices', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        schoolId,
        academic_session: session,
        term: term
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert(`🎉 ${data.message}`);
      loadFinanceOverviewStats();
      loadDebtorsLedger();
    } else {
      alert(`❌ Invoice Generation Failed: ${data.message}`);
    }
  } catch(err) {
    alert(`⛔ Network Error: ${err.message}`);
  }
}

/**
 * 4. Record Payment Modal & API Call
 */
async function handleRecordPaymentSubmit(event) {
  if (event) event.preventDefault();

  const invoiceId = document.getElementById('pay-invoice-id').value;
  const amountPaid = parseFloat(document.getElementById('pay-amount').value);
  const paymentMethod = document.getElementById('pay-method').value;
  const paymentRef = document.getElementById('pay-ref').value.trim();
  const notes = document.getElementById('pay-notes').value.trim();

  if (!invoiceId || isNaN(amountPaid) || amountPaid <= 0) {
    alert("⚠️ Please enter a valid invoice ID and payment amount.");
    return;
  }

  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const token = localStorage.getItem('eduflow_jwt_token') || localStorage.getItem('authToken');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/finance/record-payment', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        schoolId,
        invoice_id: invoiceId,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        payment_reference: paymentRef,
        notes: notes
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      activeFinanceReceipt = data.receipt;
      closeRecordPaymentModal();
      alert(`✅ PAYMENT RECORDED SUCCESSFULLY!\n\nReceipt No: ${data.receipt.receipt_number}\nAmount Paid: ₦${amountPaid.toLocaleString()}\nBalance Due: ₦${data.receipt.balance_due.toLocaleString()}`);
      
      // Auto-open printable receipt
      renderPrintableReceiptModal(data.receipt);
      loadFinanceOverviewStats();
      loadDebtorsLedger();
    } else {
      alert(`❌ Payment Recording Failed: ${data.message}`);
    }
  } catch(err) {
    alert(`⛔ Network Error: ${err.message}`);
  }
}

function openRecordPaymentModal(invoiceId, studentName, balanceDue) {
  const modal = document.getElementById('record-payment-modal-overlay');
  if (!modal) return;

  document.getElementById('pay-invoice-id').value = invoiceId || '';
  document.getElementById('pay-student-display').textContent = studentName || 'Selected Student';
  document.getElementById('pay-balance-display').textContent = `₦${(balanceDue || 0).toLocaleString()}`;
  document.getElementById('pay-amount').value = balanceDue || '';

  modal.style.display = 'flex';
}

function closeRecordPaymentModal() {
  const modal = document.getElementById('record-payment-modal-overlay');
  if (modal) modal.style.display = 'none';
}

/**
 * 5. Debtors Ledger Loader & Filter
 */
async function loadDebtorsLedger() {
  const schoolId = localStorage.getItem('eduflow_school_id') || 'school_demo';
  const tbody = document.getElementById('finance-debtors-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/finance/debtors?schoolId=${encodeURIComponent(schoolId)}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.debtors)) {
      if (data.debtors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--text-muted);">🎉 No outstanding debtors for active term! All fees cleared.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.debtors.map(d => {
        const studentName = d.student_name || `Student (${d.student_id})`;
        const studentClass = d.student_class || d.class_id || 'N/A';
        const parentPhone = d.parent_phone || '08030001122';

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px; font-weight: 700; color: var(--text-main);">${studentName}</td>
            <td style="padding: 10px; color: var(--primary); font-weight: 600;">${studentClass}</td>
            <td style="padding: 10px; font-family: var(--font-family-mono);">₦${(d.total_billed || 0).toLocaleString()}</td>
            <td style="padding: 10px; font-family: var(--font-family-mono); color: #17B8A6;">₦${(d.amount_paid || 0).toLocaleString()}</td>
            <td style="padding: 10px; font-family: var(--font-family-mono); font-weight: 800; color: #EF4444;">₦${(d.balance_due || 0).toLocaleString()}</td>
            <td style="padding: 10px; font-size: 0.78rem;">${parentPhone}</td>
            <td style="padding: 10px; text-align: right;">
              <button class="btn btn-secondary" onclick="openRecordPaymentModal('${d.id}', '${studentName.replace(/'/g, "\\'")}', ${d.balance_due})" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 700; margin-right: 4px;">💳 Pay</button>
              <button class="btn btn-secondary" onclick="sendWhatsAppFeeReminder('${studentName.replace(/'/g, "\\'")}', '${parentPhone}', ${d.balance_due})" style="padding: 4px 8px; font-size: 0.72rem; font-weight: 700; border-color: #25D366; color: #25D366;">💬 Reminder</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch(err) {
    console.warn("Error loading debtors ledger:", err);
  }
}

/**
 * 6. Send WhatsApp / SMS Fee Reminder Broadcast
 */
function sendWhatsAppFeeReminder(studentName, phone, balance) {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const targetPhone = cleanPhone.startsWith('234') ? cleanPhone : (cleanPhone.startsWith('0') ? '234' + cleanPhone.substring(1) : '234' + cleanPhone);
  
  const schoolName = localStorage.getItem('eduflow_school_name') || 'Eduflow Academy';
  const msg = encodeURIComponent(`Dear Parent/Guardian of ${studentName},\n\nThis is a friendly fee reminder from ${schoolName}. The outstanding tuition balance of ₦${balance.toLocaleString()} for First Term 2026 is now due. Kindly make payment to ensure seamless academic access.\n\nThank you!`);
  
  window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank');
}

/**
 * 7. Printable A4 / Slip Official Payment Receipt Template
 */
function renderPrintableReceiptModal(receipt) {
  const modal = document.getElementById('official-receipt-modal-overlay');
  const container = document.getElementById('printable-receipt-container');

  if (!modal || !container || !receipt) return;

  const dateFormatted = new Date(receipt.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  container.innerHTML = `
    <div class="printable-receipt-card" style="background: #ffffff; color: #0F172A; padding: 32px; border-radius: 12px; font-family: system-ui, -apple-system, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #E2E8F0;">
      
      <!-- Receipt Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #5B4FE0; padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 1.3rem; font-weight: 900; color: #5B4FE0; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${receipt.school_name || 'EDUFLOW INTERNATIONAL ACADEMY'}</h2>
          <p style="font-size: 0.78rem; color: #64748B; margin: 4px 0 0 0;">Official Tuition & Fees Payment Receipt</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.7rem; text-transform: uppercase; font-family: monospace; color: #64748B;">RECEIPT NUMBER</div>
          <div style="font-size: 1rem; font-weight: 800; color: #0F172A; font-family: monospace;">${receipt.receipt_number}</div>
        </div>
      </div>

      <!-- Metadata Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: #F8FAFC; padding: 14px; border-radius: 8px; font-size: 0.8rem;">
        <div>
          <div><span style="color: #64748B;">Student Name:</span> <strong>${receipt.student_name}</strong></div>
          <div style="margin-top: 4px;"><span style="color: #64748B;">Admission No:</span> <strong style="font-family: monospace;">${receipt.admission_no}</strong></div>
          <div style="margin-top: 4px;"><span style="color: #64748B;">Class & Arm:</span> <strong>${receipt.class || 'SSS 1 Science'}</strong></div>
        </div>
        <div>
          <div><span style="color: #64748B;">Payment Date:</span> <strong>${dateFormatted}</strong></div>
          <div style="margin-top: 4px;"><span style="color: #64748B;">Payment Method:</span> <strong>${receipt.payment_method}</strong></div>
          <div style="margin-top: 4px;"><span style="color: #64748B;">Transaction Ref:</span> <strong style="font-family: monospace;">${receipt.payment_reference}</strong></div>
        </div>
      </div>

      <!-- Breakdown Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.82rem;">
        <thead>
          <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
            <th style="padding: 8px; text-align: left;">Item Description</th>
            <th style="padding: 8px; text-align: right;">Total Billed</th>
            <th style="padding: 8px; text-align: right;">Paid Previously</th>
            <th style="padding: 8px; text-align: right;">Amount Paid Now</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px; font-weight: 700;">Termly School Tuition & Educational Levies</td>
            <td style="padding: 10px; text-align: right; font-family: monospace;">₦${(receipt.total_billed || 0).toLocaleString()}</td>
            <td style="padding: 10px; text-align: right; font-family: monospace;">₦${(receipt.previous_paid || 0).toLocaleString()}</td>
            <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: 800; color: #10B981;">₦${(receipt.amount_paid || 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <!-- Ledger Summary Cards -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
        <div style="width: 260px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Total Paid to Date:</span>
            <strong style="font-family: monospace;">₦${((receipt.previous_paid || 0) + (receipt.amount_paid || 0)).toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #CBD5E1; padding-top: 6px; font-weight: 800; font-size: 0.9rem;">
            <span>Outstanding Balance:</span>
            <strong style="font-family: monospace; color: ${receipt.balance_due > 0 ? '#EF4444' : '#10B981'};">₦${(receipt.balance_due || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <!-- Stamp Seal & Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #CBD5E1; padding-top: 16px;">
        <div style="font-size: 0.7rem; color: #64748B;">
          <div>Issued By: <strong>${receipt.cashier || 'Bursar'}</strong></div>
          <div style="margin-top: 2px;">Official Disclaimer: <em>Fees paid are non-refundable.</em></div>
        </div>
        <div style="text-align: center;">
          <div style="border: 2px dashed #10B981; padding: 6px 14px; border-radius: 6px; color: #10B981; font-weight: 900; font-size: 0.7rem; text-transform: uppercase;">
            ✓ PAYMENT CONFIRMED<br>OFFICIAL BURSARY SEAL
          </div>
        </div>
      </div>

    </div>
  `;

  modal.style.display = 'flex';
}

function closePrintableReceiptModal() {
  const modal = document.getElementById('official-receipt-modal-overlay');
  if (modal) modal.style.display = 'none';
}

// Global exports
window.loadFinanceOverviewStats = loadFinanceOverviewStats;
window.handleSaveFeeStructure = handleSaveFeeStructure;
window.generateTermInvoicesBatch = generateTermInvoicesBatch;
window.openRecordPaymentModal = openRecordPaymentModal;
window.closeRecordPaymentModal = closeRecordPaymentModal;
window.handleRecordPaymentSubmit = handleRecordPaymentSubmit;
window.loadDebtorsLedger = loadDebtorsLedger;
window.sendWhatsAppFeeReminder = sendWhatsAppFeeReminder;
window.renderPrintableReceiptModal = renderPrintableReceiptModal;
window.closePrintableReceiptModal = closePrintableReceiptModal;
