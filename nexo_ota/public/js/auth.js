/**
 * NEXO Restaurant Suite - Terminal Engine
 * Native Frappe Session Integrity Controller
 */

const Auth = {
    login() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (!usernameInput || !passwordInput) return;

        const usr = usernameInput.value.trim();
        const pwd = passwordInput.value;

        if (!usr || !pwd) {
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Please enter both email and password.', 'error');
            } else {
                alert('Please enter both email and password.');
            }
            return;
        }

        this.setLoginButtonState(true);

        fetch('/api/method/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ usr: usr, pwd: pwd })
        })
        .then(response => {
            if (response.ok) {
                this.verifyOTARole(usr);
            } else {
                throw new Error("Login Failed: Check credentials.");
            }
        })
        .catch(error => {
            console.error('Authentication Failure Log:', error);
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast(error.message, 'error');
            } else {
                alert(error.message);
            }
            this.setLoginButtonState(false);
        });
    },

    verifyOTARole(email) {
        fetch(`/api/method/frappe.client.get_value?doctype=User&filters={"email":"${email}"}&fieldname=name`, {
            credentials: 'same-origin'
        })
        .then(res => res.json())
        .then(data => {
            localStorage.setItem('ota_session', JSON.stringify({ user: email }));
            
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (usernameInput) usernameInput.value = '';
            if (passwordInput) passwordInput.value = '';
            
            this.setLoginButtonState(false);
            this.checkSession();
        })
        .catch(err => {
            this.setLoginButtonState(false);
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Session initialization aborted.', 'error');
            }
        });
    },

    async validateSession() {
        try {
            const response = await fetch('/api/method/nexo_ota.api.get_waiter_context', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Frappe-CSRF-Token': window.frappe ? frappe.csrf_token : ''
                }
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            // Return the full context object when valid so callers can recover session data
            if (data && data.guest !== true && data.error !== true) {
                return data;
            }
            return false;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    },

    async checkSession() {
        const sessionData = localStorage.getItem('ota_session');

        // If a local session exists, restore the UI immediately to avoid
        // forcing the user back to login on hard refresh. Validate in background.
        if (sessionData) {
            const session = JSON.parse(sessionData);
            const loginScreen = document.getElementById('login-screen');
            const tableScreen = document.getElementById('table-screen');
            const appScreen = document.getElementById('app-screen');
            const userDisplay = document.getElementById('user-display');

            if (loginScreen) loginScreen.classList.add('hidden');
            if (tableScreen) tableScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.add('hidden');
            if (userDisplay) userDisplay.innerText = session.user;

            const view = sessionStorage.getItem('ota_active_view');
            if (view === 'app') {
                if (appScreen) appScreen.classList.remove('hidden');
            } else {
                if (tableScreen) tableScreen.classList.remove('hidden');
            }

            if (typeof App !== 'undefined') {
                App.init();
            }

            if (window.location.hash === '#login') {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }

            // Validate in background: if invalid, show a non-blocking notice.
            this.validateSession().then(isValid => {
                if (!isValid) {
                    console.warn('Background session validation failed. User may need to re-login for some actions.');
                    if (typeof App !== 'undefined' && App.showToast) {
                        App.showToast('Session may have expired. Some actions may require re-login.', 'error');
                    }
                }
            }).catch(() => {});

            return;
        }

        // No local session: try recovering from server context.
        const serverContext = await this.validateSession();
        if (!serverContext) {
            this.forceLoginView();
            return;
        }

        // Recreate a lightweight local session so the UI can persist across refreshes
        try {
            const userEmail = (serverContext.user && serverContext.user.email) || serverContext.user_id || '';
            localStorage.setItem('ota_session', JSON.stringify({ user: userEmail }));
        } catch (e) {}

        const loginScreen = document.getElementById('login-screen');
        const tableScreen = document.getElementById('table-screen');
        const appScreen = document.getElementById('app-screen');
        if (loginScreen) loginScreen.classList.add('hidden');
        if (tableScreen) tableScreen.classList.remove('hidden');
        if (appScreen) appScreen.classList.add('hidden');

        if (window.location.hash === '#login') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        if (typeof App !== 'undefined') {
            App.init();
        }
    },

    forceLoginView() {
        localStorage.removeItem('ota_session');
        const loginScreen = document.getElementById('login-screen');
        const tableScreen = document.getElementById('table-screen');
        const appScreen = document.getElementById('app-screen');

        if (appScreen) appScreen.classList.add('hidden');
        if (tableScreen) tableScreen.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');

        history.replaceState(null, '', window.location.pathname + window.location.search + '#login');
    },

    logout() {
        localStorage.removeItem('ota_session');
        if (typeof App !== 'undefined' && App.syncInterval) {
            clearInterval(App.syncInterval);
            App.syncInterval = null;
        }
        fetch('/api/method/logout').then(() => {
            localStorage.removeItem('ota_session');
            sessionStorage.removeItem('ota_selected_table');
            sessionStorage.removeItem('ota_active_view');
            location.reload();
        });
    },

    setLoginButtonState(isLoading) {
        const btn = document.querySelector('#login-screen button');
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="animate-spin h-4 w-4 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg> Verifying...
            `;
        } else {
            btn.disabled = false;
            btn.innerHTML = 'Initialize Terminal Session';
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if (typeof App !== 'undefined') {
        App.applyCustomBrandThemeColor();
        App.setupPasswordVisibilityToggle();
        App.setupPWAInstallation();
    }
    Auth.checkSession();
});
