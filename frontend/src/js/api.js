import { getToken } from './auth.js';

const API_BASE = '/api';

// Initialize IndexedDB for storing offline sync queues
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ATR_Offline_DB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Push a form data packet to IndexedDB
export async function queueOfflineATR(data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.add({ data, timestamp: new Date().toISOString() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Read all offline items
export async function getOfflineQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readonly');
    const store = transaction.objectStore('sync_queue');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Clear an item from the offline db
export async function removeOfflineItem(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync_queue'], 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// API Server Requests wrapper with Authorization Token
async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// Authenticated server actions
export async function apiLogin(username, password) {
  return fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function apiRegister(username, password, role) {
  return fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, role })
  });
}

export async function apiSubmitATR(data) {
  return fetchWithAuth('/atrs', {
    method: 'POST',
    body: JSON.stringify({
      refNumber: data.meta?.reference,
      formData: data,
      signature: null // No initial signature on creation; signed via advanceStatus
    })
  });
}

export async function apiGetAllATRs() {
  return fetchWithAuth('/atrs');
}

export async function apiGetATR(id) {
  return fetchWithAuth(`/atrs/${id}`);
}

export async function apiSignOffATR(id, signatureBlob, signedBy) {
  return fetchWithAuth(`/atrs/${id}/advance`, {
    method: 'PUT',
    body: JSON.stringify({
      signatureBlob,
      signedBy
    })
  });
}

// Sync local offline queued items with the server
export async function syncOfflineQueue(showToast) {
  if (!navigator.onLine) return;

  try {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    if (showToast) showToast(`Syncing ${queue.length} offline ATR(s)…`, 'success');

    for (const item of queue) {
      try {
        await apiSubmitATR(item.data);
        await removeOfflineItem(item.id);
      } catch (err) {
        console.error('Failed to sync item:', item, err);
      }
    }

    if (showToast) showToast('Offline ATRs synced successfully', 'success');
  } catch (error) {
    console.error('Offline synchronization error:', error);
  }
}
