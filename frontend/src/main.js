import { SigPad } from './js/sigPad.js';
import {
  goToStep,
  nextStep,
  prevStep,
  buildPaxTable,
  setDefaultDTG,
  toggleVIP,
  toggleDG,
  toggleAgreement,
  acceptAllAgreements,
  collectFormData,
  currentStep
} from './js/formLogic.js';
import {
  getToken,
  removeToken,
  getCurrentUser,
  saveUser,
  setToken,
  updateRoleUI
} from './js/auth.js';
import {
  apiLogin,
  apiRegister,
  apiSubmitATR,
  queueOfflineATR,
  syncOfflineQueue,
  apiGetAllATRs,
  apiGetATR,
  apiSignOffATR
} from './js/api.js';

// Global Signature Pads container
const sigPads = {};
let currentSelectedAtrId = null;
let approvalSigPad = null;

// Setup Toast Notification helper
export function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const msgEl = document.getElementById('toastMsg');
  if (!toast) return;
  toast.className = `toast ${type}`;
  if (icon) icon.textContent = type === 'success' ? '✓' : '✕';
  if (msgEl) msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Save form draft to localStorage
export function saveDraft() {
  try {
    const data = collectFormData(sigPads);
    localStorage.setItem('atr_draft', JSON.stringify(data));
    showToast('Draft saved locally', 'success');
  } catch(e) {
    showToast('Could not save draft', 'error');
  }
}

// Silent load form draft
export function loadDraft() {
  try {
    const draftStr = localStorage.getItem('atr_draft');
    if (!draftStr) return;
    const data = JSON.parse(draftStr);

    // Auto-populate some fields if they exist
    if (data.section1) {
      if (data.section1.unit) document.getElementById('unit').value = data.section1.unit;
      if (data.section1.submissionDTG) document.getElementById('submissionDTG').value = data.section1.submissionDTG;
      if (data.section1.primaryContact?.name) document.getElementById('priName').value = data.section1.primaryContact.name;
      if (data.section1.primaryContact?.mobile) document.getElementById('priMobile').value = data.section1.primaryContact.mobile;
      if (data.section1.primaryContact?.email) document.getElementById('priEmail').value = data.section1.primaryContact.email;
      if (data.section1.alternateContact?.name) document.getElementById('altName').value = data.section1.alternateContact.name;
      if (data.section1.alternateContact?.mobile) document.getElementById('altMobile').value = data.section1.alternateContact.mobile;
      if (data.section1.alternateContact?.email) document.getElementById('altEmail').value = data.section1.alternateContact.email;
      if (data.section1.taskDate) document.getElementById('taskDate').value = data.section1.taskDate;
      if (data.section1.taskDateLatest) document.getElementById('taskDateLatest').value = data.section1.taskDateLatest;
    }
  } catch(e) {
    console.error('Failed to load draft silently:', e);
  }
}

// Download local JSON file
export function downloadJSON() {
  const data = collectFormData(sigPads);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.meta.reference || 'ATR-Draft'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('ATR downloaded as JSON', 'success');
}

// Open native mailto with filled details
export function emailForm() {
  const data = collectFormData(sigPads);
  const unit = document.getElementById('unit')?.value || '[Unit]';
  const date = document.getElementById('taskDate')?.value || '[Date]';
  const subject = encodeURIComponent(`ATR Submission — ${unit} — ${date}`);
  const body = encodeURIComponent(`Please find attached the Air Task Request from ${unit}.\n\nReference: ${data.meta.reference}\nSubmitted: ${new Date().toLocaleString()}\n\nPlease process at your earliest convenience.\n\nSent via ATR Digital Form v2.0`);
  window.open(`mailto:Pngdf.atr@outlook.com?subject=${subject}&body=${body}`);
}

// Print page trigger
export function printForm() {
  window.print();
}

// Clear specific signature canvas
export function clearSig(id) {
  if (sigPads[id]) sigPads[id].clear();
}

// Start empty new ATR
export function startNew() {
  if (confirm('Start a new ATR? Unsaved data will be lost.')) {
    localStorage.removeItem('atr_draft');
    location.reload();
  }
}

// Save to Google Drive placeholders
export function saveToGoogleDrive() {
  showToast('Google Drive connector initialized…', 'success');
  // For standard static backwards-compatibility support, render setup guidance dialog
  showGDriveInstructions();
}

function showGDriveInstructions() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--border-bright);border-radius:12px;padding:28px;max-width:500px;width:100%">
      <h3 style="font-family:\'Rajdhani\',sans-serif;color:var(--gold);font-size:1.1rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px">Google Drive Setup Required</h3>
      <p style="font-size:0.82rem;color:var(--text-dim);line-height:1.6;margin-bottom:16px">To enable Google Drive saving, a Google Cloud OAuth2 Client ID needs to be configured by your IT administrator:</p>
      <ol style="font-size:0.78rem;color:var(--text-dim);padding-left:20px;line-height:2">
        <li>Go to <strong style="color:var(--steel-light)">console.cloud.google.com</strong></li>
        <li>Create a project → Enable <strong style="color:var(--steel-light)">Google Drive API</strong></li>
        <li>Create OAuth2 credentials → Web Application</li>
        <li>Add your domain to authorized origins</li>
        <li>Replace CLIENT_ID in api client settings</li>
      </ol>
      <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">
        <button id="modal-download-json-btn" style="background:var(--navy-light);border:1px solid var(--border-bright);color:var(--text);padding:10px 18px;border-radius:6px;font-family:\'Rajdhani\',sans-serif;font-weight:600;font-size:0.82rem;letter-spacing:0.08em;cursor:pointer;text-transform:uppercase">Download JSON Instead</button>
        <button id="modal-close-btn" style="background:var(--steel);border:none;color:#fff;padding:10px 18px;border-radius:6px;font-family:\'Rajdhani\',sans-serif;font-weight:600;font-size:0.82rem;letter-spacing:0.08em;cursor:pointer;text-transform:uppercase">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('modal-download-json-btn').onclick = () => {
    modal.remove();
    downloadJSON();
  };
  document.getElementById('modal-close-btn').onclick = () => {
    modal.remove();
  };
}

// Central ATR submission pipeline (Supports full Offline and online queues)
export async function submitATR() {
  const unit = document.getElementById('unit')?.value;
  if (!unit) {
    showToast('Please fill in the Requesting Unit (Step 1)', 'error');
    goToStep(0, sigPads);
    return;
  }

  const data = collectFormData(sigPads);
  const ref = data.meta.reference;
  const refEl = document.getElementById('atrRef');
  if (refEl) refEl.textContent = ref;

  if (!navigator.onLine) {
    // Save to IndexedDB sync queue
    try {
      await queueOfflineATR(data);
      showToast('Offline! ATR queued for sync once back online.', 'success');
      showSuccessScreen(ref);
    } catch (err) {
      showToast('Error storing ATR offline', 'error');
    }
    return;
  }

  // Submit via API
  try {
    showToast('Submitting ATR to server…', 'success');
    await apiSubmitATR(data);
    showToast('ATR submitted successfully!', 'success');
    showSuccessScreen(ref);
  } catch (err) {
    // If submission failed due to network glitch, fall back to offline queue
    try {
      await queueOfflineATR(data);
      showToast('Submission error. Saved locally to sync queue.', 'success');
      showSuccessScreen(ref);
    } catch (dbErr) {
      showToast(err.message || 'Error submitting ATR', 'error');
    }
  }
}

function showSuccessScreen(ref) {
  // Hide all step cards
  document.querySelectorAll('.section-card').forEach(c => c.classList.remove('active'));
  const successScreen = document.getElementById('successScreen');
  if (successScreen) {
    successScreen.classList.add('success-screen', 'active');
    successScreen.style.display = 'block';
  }
  // Clear local draft since submitted successfully
  localStorage.removeItem('atr_draft');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== APPROVALS VIEW IMPLEMENTATION =====================
export function toggleApprovalsView() {
  // Hide all step cards, success screen
  document.querySelectorAll('.section-card').forEach(c => c.classList.remove('active'));
  const successScreen = document.getElementById('successScreen');
  if (successScreen) successScreen.style.display = 'none';

  // Hide progress bar wrap
  const progressWrap = document.querySelector('.progress-bar-wrap');
  if (progressWrap) progressWrap.style.display = 'none';

  // Show approvals view
  const approvalsView = document.getElementById('approvals-view');
  if (approvalsView) approvalsView.style.display = 'block';

  // Load the list of ATRs
  loadApprovalsList();
}

export function closeApprovalsView() {
  // Hide approvals view
  const approvalsView = document.getElementById('approvals-view');
  if (approvalsView) approvalsView.style.display = 'none';

  // Show progress bar wrap
  const progressWrap = document.querySelector('.progress-bar-wrap');
  if (progressWrap) progressWrap.style.display = 'block';

  // Show current wizard step
  goToStep(currentStep, sigPads);
}

export async function loadApprovalsList(statusFilter = '') {
  const container = document.getElementById('approvals-list-container');
  if (!container) return;

  container.innerHTML = `<div style="font-size: 0.8rem; text-align: center; color: var(--text-dim); padding: 40px 0;"><span class="spinner" style="display:inline-block"></span> Loading requests...</div>`;

  try {
    let atrs = await apiGetAllATRs();

    if (statusFilter) {
      atrs = atrs.filter(a => a.status === statusFilter);
    }

    if (atrs.length === 0) {
      container.innerHTML = `<div style="font-size: 0.8rem; text-align: center; color: var(--text-dim); padding: 40px 0;">No active ATRs found.</div>`;
      return;
    }

    container.innerHTML = '';
    atrs.forEach(atr => {
      const unit = atr.formData?.section1?.unit || 'Unknown Unit';
      const date = atr.formData?.section1?.taskDate || 'Unknown Date';
      const ref = atr.refNumber;

      const item = document.createElement('div');
      item.style.cssText = `
        background: var(--input-bg);
        border: 1px solid var(--border-bright);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 8px;
      `;
      item.onclick = () => selectAtrForApproval(atr.id);

      if (currentSelectedAtrId === atr.id) {
        item.style.borderColor = 'var(--gold)';
        item.style.boxShadow = '0 0 0 2px rgba(201, 168, 76, 0.2)';
      }

      item.innerHTML = `
        <div style="font-family: 'Share Tech Mono', monospace; font-size: 0.82rem; color: var(--gold);">${ref}</div>
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text); margin-top: 4px;">${unit}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 0.68rem; color: var(--text-dim);">${date}</span>
          <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: rgba(201, 168, 76, 0.1); color: var(--gold); border: 1px solid rgba(201, 168, 76, 0.3); text-transform: uppercase;">${atr.status}</span>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="font-size: 0.8rem; text-align: center; color: var(--red); padding: 40px 0;">Error: ${err.message || 'Failed to load list'}</div>`;
  }
}

export async function selectAtrForApproval(id) {
  currentSelectedAtrId = id;

  // Refresh highlighting on list
  const items = document.getElementById('approvals-list-container').children;
  // Re-load list structure is simpler to keep in sync:
  const container = document.getElementById('approvals-list-container');
  if (container) {
    Array.from(container.children).forEach(child => {
      // Find the item corresponding to id and apply style
      const clickHandlerStr = child.onclick ? child.onclick.toString() : '';
      if (clickHandlerStr.includes(id)) {
        child.style.borderColor = 'var(--gold)';
        child.style.boxShadow = '0 0 0 2px rgba(201, 168, 76, 0.2)';
      } else {
        child.style.borderColor = 'var(--border-bright)';
        child.style.boxShadow = 'none';
      }
    });
  }

  const detailPanel = document.getElementById('approvals-detail-panel');
  if (!detailPanel) return;

  detailPanel.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 300px; color: var(--text-dim);"><span class="spinner" style="display:inline-block"></span> Loading details...</div>`;

  try {
    const atr = await apiGetATR(id);
    const data = atr.formData;
    const user = getCurrentUser();

    // Map current status to expected role responsible
    const statusToRoleMap = {
      'AMS': 'AMS',
      'SO3_AIR_PREP': 'SO3 Air Prep',
      'D_AIR': 'D Air',
      'COMD': 'COMD',
      'ADS': 'ADS'
    };

    const isCurrentSigner = user && statusToRoleMap[atr.status] === user.role;

    // Render passengers list
    const passengers = data.passengerList?.passengers || [];
    let paxRows = '';
    if (passengers.length === 0) {
      paxRows = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 10px;">No passengers specified</td></tr>';
    } else {
      passengers.forEach(p => {
        paxRows += `
          <tr>
            <td style="border: 1px solid var(--border); padding: 6px; text-align:center;">${p.serial}</td>
            <td style="border: 1px solid var(--border); padding: 6px;">${p.service || ''}</td>
            <td style="border: 1px solid var(--border); padding: 6px;">${p.rank || ''}</td>
            <td style="border: 1px solid var(--border); padding: 6px;">${p.name || ''}</td>
            <td style="border: 1px solid var(--border); padding: 6px; text-align:center;">${p.from || ''}</td>
            <td style="border: 1px solid var(--border); padding: 6px; text-align:center;">${p.to || ''}</td>
          </tr>
        `;
      });
    }

    // Render signatures collected so far
    let signaturesHtml = '';
    const sigs = atr.signatures || [];
    if (sigs.length === 0) {
      signaturesHtml = '<div style="font-size: 0.75rem; color: var(--text-dim);">No signatures collected yet.</div>';
    } else {
      sigs.forEach(s => {
        signaturesHtml += `
          <div style="background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
            <div style="flex-shrink: 0; width: 120px; height: 50px; background: #060e1d; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <img src="${s.imageBlob}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--gold); text-transform: uppercase;">${s.role}</div>
              <div style="font-size: 0.7rem; color: var(--text); margin-top: 2px;">Signed by: ${s.signedBy}</div>
              <div style="font-size: 0.65rem; color: var(--text-dim); margin-top: 2px;">Date: ${new Date(s.signedAt).toLocaleString()}</div>
            </div>
          </div>
        `;
      });
    }

    // Show Signature pad section if isCurrentSigner is true
    let approvalSigPadHtml = '';
    if (isCurrentSigner) {
      approvalSigPadHtml = `
        <div class="field-group" style="margin-top: 10px; border-color: var(--gold);">
          <div class="field-group-title" style="color: var(--gold);">CAPTURE YOUR SIGNATURE (${user.role})</div>
          <div class="sig-wrap" style="margin-bottom: 12px;">
            <canvas class="sig-canvas" id="sig-approval-canvas" width="800" height="100"></canvas>
            <div class="sig-controls">
              <span class="sig-hint">Sign inside the box</span>
              <button class="btn-clear-sig" onclick="clearApprovalSig()">Clear</button>
            </div>
          </div>
          <button class="btn-submit" onclick="submitSignOffApproval('${id}')" style="width:100%; justify-content: center;">
            Confirm Sign Off & Advance Status
          </button>
        </div>
      `;
    } else {
      approvalSigPadHtml = `
        <div style="background: rgba(201, 168, 76, 0.05); border: 1px solid rgba(201, 168, 76, 0.15); border-radius: 8px; padding: 12px; font-size: 0.75rem; color: var(--text-dim); text-align: center; margin-top: 10px;">
          ${user ? `Status is currently awaiting <strong>${statusToRoleMap[atr.status] || atr.status}</strong>. Your role is <strong>${user.role}</strong>.` : 'Log in to sign off this request.'}
        </div>
      `;
    }

    detailPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
        <div>
          <h2 style="font-family: 'Rajdhani', sans-serif; font-size: 1.3rem; color: var(--gold); letter-spacing: 0.05em;">${atr.refNumber}</h2>
          <p style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">Created on ${new Date(atr.createdAt).toLocaleString()}</p>
        </div>
        <span style="font-size: 0.75rem; font-family: 'Rajdhani', sans-serif; font-weight: 700; background: rgba(39, 174, 96, 0.1); color: var(--green); border: 1px solid rgba(39, 174, 96, 0.3); padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
          Status: ${atr.status}
        </span>
      </div>

      <div style="overflow-y: auto; max-height: 400px; display: flex; flex-direction: column; gap: 16px; padding-right: 4px;">
        <div>
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--steel-light); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">1. Organisation & Contact</div>
          <div style="font-size: 0.8rem; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; line-height: 1.6;">
            <strong>Requesting Unit:</strong> ${data.section1?.unit || ''}<br>
            <strong>Primary Contact:</strong> ${data.section1?.primaryContact?.name || ''} (${data.section1?.primaryContact?.mobile || ''} | ${data.section1?.primaryContact?.email || ''})<br>
            <strong>Task Date:</strong> ${data.section1?.taskDate || ''} ${data.section1?.taskDateLatest ? `to ${data.section1.taskDateLatest}` : ''}
          </div>
        </div>

        <div>
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--steel-light); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">2. Task Description & Route</div>
          <div style="font-size: 0.8rem; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 10px; line-height: 1.6;">
            <strong>Description:</strong> ${data.section2?.supportDescription || ''}<br>
            <strong>Route:</strong> ${data.section2?.locations || ''} (${data.section2?.departureICAO || ''} → ${data.section2?.destinationICAO || ''})<br>
            <strong>Aircraft:</strong> ${data.section2?.acftType || ''} | <strong>DTG:</strong> ${data.section2?.supportDTG || ''}
          </div>
        </div>

        <div>
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--steel-light); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">3. Passenger List</div>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
              <thead>
                <tr style="background: var(--navy-light);">
                  <th style="border: 1px solid var(--border); padding: 6px;">#</th>
                  <th style="border: 1px solid var(--border); padding: 6px;">Service</th>
                  <th style="border: 1px solid var(--border); padding: 6px;">Rank</th>
                  <th style="border: 1px solid var(--border); padding: 6px;">Name</th>
                  <th style="border: 1px solid var(--border); padding: 6px;">From</th>
                  <th style="border: 1px solid var(--border); padding: 6px;">To</th>
                </tr>
              </thead>
              <tbody>
                ${paxRows}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--steel-light); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">4. Workflow Sign-offs</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${signaturesHtml}
          </div>
        </div>
      </div>

      ${approvalSigPadHtml}
    `;

    // Instantiate SigPad dynamically for approvals
    if (isCurrentSigner) {
      setTimeout(() => {
        approvalSigPad = new SigPad('sig-approval-canvas');
        if (approvalSigPad) approvalSigPad.resize();
      }, 100);
    }
  } catch (err) {
    detailPanel.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 300px; color: var(--red); font-size: 0.85rem;">Error loading ATR: ${err.message || 'Unknown error'}</div>`;
  }
}

export function clearApprovalSig() {
  if (approvalSigPad) approvalSigPad.clear();
}

export async function submitSignOffApproval(id) {
  if (!approvalSigPad || approvalSigPad.isEmpty()) {
    showToast('Please capture your signature before signing off', 'error');
    return;
  }

  const signatureBlob = approvalSigPad.toDataURL();
  const user = getCurrentUser();
  const signedBy = user ? user.username : 'Unknown User';

  try {
    showToast('Submitting approval...', 'success');
    await apiSignOffATR(id, signatureBlob, signedBy);
    showToast('ATR successfully signed off!', 'success');

    // Refresh list and detail pane
    await loadApprovalsList();
    await selectAtrForApproval(id);
  } catch (err) {
    showToast(err.message || 'Approval failed', 'error');
  }
}

// Window init
window.addEventListener('load', async () => {
  // Initialize signature pads
  ['sig-dair', 'sig-comd', 'sig-so2', 'sig-dcp', 'sig-hads'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      sigPads[id] = new SigPad(id);
    }
  });

  buildPaxTable();
  setDefaultDTG();
  loadDraft();
  updateRoleUI();

  // Try to sync offline queue if online
  if (navigator.onLine) {
    await syncOfflineQueue(showToast);
  }

  // Configure online/offline status banners
  window.addEventListener('online', () => {
    showToast('Internet connection restored. Synchronizing...', 'success');
    syncOfflineQueue(showToast);
  });
  window.addEventListener('offline', () => {
    showToast('Working offline mode.', 'error');
  });
});

window.addEventListener('resize', () => {
  Object.values(sigPads).forEach(p => {
    if (p && typeof p.resize === 'function') p.resize();
  });
  if (approvalSigPad) {
    approvalSigPad.resize();
  }
});

// Expose methods to window context for onclick handlers (maintaining strict backwards compatibility)
window.goToStep = (n) => goToStep(n, sigPads);
window.nextStep = () => nextStep(sigPads);
window.prevStep = () => prevStep(sigPads);
window.toggleVIP = toggleVIP;
window.toggleDG = toggleDG;
window.toggleAgreement = toggleAgreement;
window.acceptAllAgreements = () => acceptAllAgreements(showToast);
window.clearSig = clearSig;
window.saveDraft = saveDraft;
window.downloadJSON = downloadJSON;
window.emailForm = emailForm;
window.printForm = printForm;
window.saveToGoogleDrive = saveToGoogleDrive;
window.submitATR = submitATR;
window.startNew = startNew;

// Approvals dashboard navigation
window.toggleApprovalsView = toggleApprovalsView;
window.closeApprovalsView = closeApprovalsView;
window.loadApprovalsList = loadApprovalsList;
window.selectAtrForApproval = selectAtrForApproval;
window.clearApprovalSig = clearApprovalSig;
window.submitSignOffApproval = submitSignOffApproval;

// Client auth triggers
window.handleLogin = async (event) => {
  if (event) event.preventDefault();
  const username = document.getElementById('login-email')?.value; // Mapping DOM input element to Username parameter
  const password = document.getElementById('login-password')?.value;
  if (!username || !password) {
    showToast('Please fill in username and password', 'error');
    return;
  }
  try {
    const res = await apiLogin(username, password);
    setToken(res.token);
    saveUser(res.user);
    showToast('Logged in successfully', 'success');
    updateRoleUI();
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  }
};

window.handleRegister = async (event) => {
  if (event) event.preventDefault();
  const username = document.getElementById('reg-email')?.value; // Mapping DOM input element to Username parameter
  const password = document.getElementById('reg-password')?.value;
  const role = document.getElementById('reg-role')?.value;
  if (!username || !password || !role) {
    showToast('Please fill in all register fields', 'error');
    return;
  }
  try {
    const res = await apiRegister(username, password, role);
    setToken(res.token);
    saveUser(res.user);
    showToast('Registered and logged in!', 'success');
    updateRoleUI();
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  }
};

window.handleLogout = () => {
  removeToken();
  showToast('Logged out successfully', 'success');
  updateRoleUI();
};
