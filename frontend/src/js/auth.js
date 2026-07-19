// Authentication utilities for frontend
export function getToken() {
  return localStorage.getItem('atr_jwt');
}

export function setToken(token) {
  localStorage.setItem('atr_jwt', token);
}

export function removeToken() {
  localStorage.removeItem('atr_jwt');
  localStorage.removeItem('atr_user_role');
  localStorage.removeItem('atr_user_username');
}

export function getCurrentUser() {
  const role = localStorage.getItem('atr_user_role');
  const username = localStorage.getItem('atr_user_username');
  if (!role || !username) return null;
  return { role, username };
}

export function saveUser(user) {
  localStorage.setItem('atr_user_role', user.role);
  localStorage.setItem('atr_user_username', user.username);
}

// Dynamically handle element visibility based on current user role
export function updateRoleUI() {
  const user = getCurrentUser();
  const loginSection = document.getElementById('auth-login-section');
  const userStatusSection = document.getElementById('auth-user-status-section');
  const officeOnlyBadges = document.querySelectorAll('.office-only-badge');
  const approvalsNavBtn = document.getElementById('approvals-nav-btn');

  if (user) {
    if (loginSection) loginSection.style.display = 'none';
    if (userStatusSection) {
      userStatusSection.style.display = 'flex';
      const usernameEl = document.getElementById('auth-user-email'); // Retain DOM ID for backwards compatibility
      const roleEl = document.getElementById('auth-user-role');
      if (usernameEl) usernameEl.textContent = user.username;
      if (roleEl) roleEl.textContent = user.role;
    }

    // Role-specific field disabling/enabling
    // Requesters can't sign off or view office use badges
    const isOfficeRole = ['AMS', 'SO3 Air Prep', 'D Air', 'COMD', 'ADS'].includes(user.role);

    officeOnlyBadges.forEach(badge => {
      badge.style.display = isOfficeRole ? 'inline-block' : 'none';
    });

    if (approvalsNavBtn) {
      approvalsNavBtn.style.display = isOfficeRole ? 'inline-block' : 'none';
    }

    // Disable signature pad buttons or canvas if not authorized for that role
    const padToRoleMap = {
      'sig-dair': 'D Air',
      'sig-comd': 'COMD',
      'sig-so2': 'ADS',
      'sig-dcp': 'ADS',
      'sig-hads': 'ADS'
    };

    Object.entries(padToRoleMap).forEach(([padId, allowedRole]) => {
      const padContainer = document.getElementById(padId)?.closest('.field-group');
      if (padContainer) {
        if (user.role === allowedRole) {
          padContainer.style.opacity = '1';
          padContainer.querySelectorAll('input, textarea, canvas, button').forEach(el => el.removeAttribute('disabled'));
        } else {
          padContainer.style.opacity = '0.6';
          padContainer.querySelectorAll('input, textarea, canvas, button').forEach(el => el.setAttribute('disabled', 'true'));
        }
      }
    });

  } else {
    if (loginSection) loginSection.style.display = 'block';
    if (userStatusSection) userStatusSection.style.display = 'none';

    officeOnlyBadges.forEach(badge => {
      badge.style.display = 'none';
    });

    if (approvalsNavBtn) {
      approvalsNavBtn.style.display = 'none';
    }

    // Hide approvals view if not logged in
    const approvalsView = document.getElementById('approvals-view');
    if (approvalsView) approvalsView.style.display = 'none';

    // Restore progress bar
    const progressWrap = document.querySelector('.progress-bar-wrap');
    if (progressWrap) progressWrap.style.display = 'block';

    // Disable all office sections by default if not logged in
    const officeSections = ['sig-dair', 'sig-comd', 'sig-so2', 'sig-dcp', 'sig-hads'];
    officeSections.forEach(id => {
      const container = document.getElementById(id)?.closest('.field-group');
      if (container) {
        container.style.opacity = '0.5';
        container.querySelectorAll('input, textarea, canvas, button').forEach(el => el.setAttribute('disabled', 'true'));
      }
    });
  }
}
