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
  syncOfflineQueue
} from './js/api.js';

// Global Signature Pads container
const sigPads = {};

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
