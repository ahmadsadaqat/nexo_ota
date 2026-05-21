const App = {
    restaurantGroups: [],
    selectedTable: null,
    tables: [], 
    cart: [],
    currentItemForModal: null,
    currentItemForModalQty: 1,
    currentGroupFilter: "",
    currentFloorFilter: "", 
    syncInterval: null,
    deferredPrompt: null,
    userContext: null,
    employeeData: null,
    currentActiveInvoiceId: null,
    currentTheme: "dark", 

    init() {
        this.initializeTheme();
        this.fetchInitialSetup();
        this.injectModalHTML();
        this.injectToastContainer();
        this.setupRealtimeSync();
        this.setupPWAInstallation();
    },

    initializeTheme() {
        const savedTheme = localStorage.getItem('ota-theme') || 'dark';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('ota-theme', theme);
        const htmlEl = document.documentElement;
        
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
            htmlEl.style.backgroundColor = "#020617"; 
        } else {
            htmlEl.classList.remove('dark');
            htmlEl.style.backgroundColor = "#f8fafc"; 
        }
        this.updateThemeToggleIcon();
    },

    toggleTheme() {
        const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
    },

    updateThemeToggleIcon() {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        if (this.currentTheme === 'dark') {
            btn.innerHTML = `
                <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707.707M7.343 6.343l.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            `;
        } else {
            btn.innerHTML = `
                <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
            `;
        }
    },

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('password-toggle-icon');
        if (!passwordInput || !toggleIcon) return;

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path>
            `;
        } else {
            passwordInput.type = 'password';
            toggleIcon.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            `;
        }
    },

    toggleProfilePanel(open = true) {
        const backdrop = document.getElementById('profile-sidebar-backdrop');
        const panel = document.getElementById('profile-sidebar');
        if (!backdrop || !panel) return;

        if (open) {
            backdrop.classList.remove('pointer-events-none', 'opacity-0');
            backdrop.classList.add('opacity-100');
            panel.classList.remove('translate-x-full');
        } else {
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0', 'pointer-events-none');
            panel.classList.add('translate-x-full');
        }
    },

    toggleCartPanel(open = true) {
        const backdrop = document.getElementById('cart-sidebar-backdrop');
        const panel = document.getElementById('cart-sidebar');
        if (!backdrop || !panel) return;

        if (open) {
            backdrop.classList.remove('pointer-events-none', 'opacity-0');
            backdrop.classList.add('opacity-100');
            panel.classList.remove('translate-x-full');
        } else {
            backdrop.classList.remove('opacity-100');
            backdrop.classList.add('opacity-0', 'pointer-events-none');
            panel.classList.add('translate-x-full');
        }
    },

    injectToastContainer() {
        if (document.getElementById('toast-container')) return;
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z- flex flex-col gap-3 w-[90%] max-w-sm pointer-events-none';
        document.body.appendChild(container);
    },

    showToast(message, type = "success") {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `transform translate-y-[-20px] opacity-0 transition-all duration-300 pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md font-sans text-xs font-bold text-center justify-center`;
        
        if (this.currentTheme === 'dark') {
            toast.className += type === "success" 
                ? ' bg-slate-900/90 border-emerald-500/30 text-emerald-400' 
                : ' bg-slate-900/90 border-red-500/30 text-red-400';
        } else {
            toast.className += type === "success" 
                ? ' bg-white/95 border-emerald-200 text-emerald-700' 
                : ' bg-white/95 border-red-200 text-red-700';
        }

        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        }, 10);

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-[-10px]');
            setTimeout(() => { toast.remove(); }, 300);
        }, 3500);
    },

    async fetchWithAuth(method, args = {}) {

    try {

        // =====================================================
        // HEADERS
        // =====================================================

        let headers = {
            'Accept': 'application/json',
            'X-Frappe-CSRF-Token': (window.frappe && window.frappe.csrf_token) || ''
        };

        let bodyData;

        // =====================================================
        // IF ARGS ARE ALREADY STRING
        // =====================================================

        if (typeof args === 'string') {

            headers['Content-Type'] = 'application/x-www-form-urlencoded';

            bodyData = args;
        }

        // =====================================================
        // IF ARGS ARE OBJECT
        // =====================================================

        else if (
            args &&
            typeof args === 'object' &&
            Object.keys(args).length > 0
        ) {

            headers['Content-Type'] = 'application/x-www-form-urlencoded';

            bodyData = Object.keys(args)
                .map(key => {

                    const value =
                        typeof args[key] === 'object'
                            ? JSON.stringify(args[key])
                            : args[key];

                    return (
                        encodeURIComponent(key) +
                        '=' +
                        encodeURIComponent(value)
                    );
                })
                .join('&');
        }

        // =====================================================
        // EMPTY BODY
        // =====================================================

        else {

            bodyData = undefined;
        }

        // =====================================================
        // DEBUG LOGS
        // =====================================================

        console.log("====================================");
        console.log("API METHOD:", method);
        console.log("REQUEST BODY:", bodyData);
        console.log("HEADERS:", headers);
        console.log("====================================");

        // =====================================================
        // FETCH REQUEST
        // =====================================================

        const response = await fetch(`/api/method/${method}`, {

            method: 'POST',
            credentials: 'same-origin',

            headers: headers,

            body: bodyData
        });

        // =====================================================
        // DEBUG RESPONSE
        // =====================================================

        console.log("RESPONSE STATUS:", response.status);

        // =====================================================
        // AUTH FAILURE
        // =====================================================

        if (response.status === 401 || response.status === 403) {

            console.warn(
                `Authorization failed for method: ${method}`
            );

            if (typeof this.handleAuthFailure === 'function') {
                this.handleAuthFailure();
            }

            return null;
        }

        // =====================================================
        // SERVER ERROR
        // =====================================================

        if (!response.ok) {

            const errText = await response.text();

            console.error(
                `Server rejected request [${response.status}]`,
                errText
            );

            return null;
        }

        // =====================================================
        // JSON RESPONSE
        // =====================================================

        const data = await response.json();

        console.log("API RESPONSE:", data);

        // =====================================================
        // HANDLE GUEST RESPONSE
        // =====================================================

        if (data && data.guest === true) {

            console.warn("Guest user detected. Skipping sync.");

            return null;
        }

        // =====================================================
        // RETURN MESSAGE OR DATA
        // =====================================================

        return data.hasOwnProperty('message')
            ? data.message
            : data;

    }

    // =========================================================
    // FETCH FAILURE / NETWORK FAILURE
    // =========================================================

    catch (error) {

        console.error(
            "Request breakdown error:",
            error
        );

        return null;
    }
},

    handleAuthFailure() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        const appScreen = document.getElementById('app-screen');
        const tableScreen = document.getElementById('table-screen');
        const loginScreen = document.getElementById('login-screen');

        if (appScreen) appScreen.classList.add('hidden');
        if (tableScreen) tableScreen.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');
    },

    logout() {
        if (confirm("Are you sure you want to log out?")) {
            if (this.syncInterval) clearInterval(this.syncInterval);
            fetch('/api/method/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': window.frappe ? frappe.csrf_token : ''
                }
            })
            .then(() => window.location.replace('/ota'))
            .catch(() => window.location.replace('/ota'));
        }
    },

    setupPWAInstallation() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            console.log('App running native standalone mode. Install prompt links suppressed.');
            return;
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallOptions();
        });
    },

    showInstallOptions() {
        const loginBanner = document.getElementById('login-install-banner');
        if (loginBanner) {
            loginBanner.classList.remove('hidden');
        }

        const headerBtn = document.getElementById('pwa-header-download-btn');
        if (headerBtn) {
            headerBtn.classList.remove('hidden');
            headerBtn.classList.add('flex');
        }
    },

    triggerPWAInstall() {
        if (!this.deferredPrompt) {
            this.showToast("App already installed or prompt unavailable.", "success");
            return;
        }
        this.deferredPrompt.prompt();
        this.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                this.showToast("Installing App to Device!");
                const loginBanner = document.getElementById('login-install-banner');
                if (loginBanner) loginBanner.remove();
                const headerBtn = document.getElementById('pwa-header-download-btn');
                if (headerBtn) headerBtn.remove();
            }
            this.deferredPrompt = null;
        });
    },

    injectModalHTML() {
        if (document.getElementById('addon-modal')) return;
        const modalDiv = document.createElement('div');
        modalDiv.id = 'addon-modal';
        modalDiv.className = 'fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden';
        modalDiv.innerHTML = `
            <div id="modal-container" class="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-[2rem] max-w-md w-full p-6 shadow-2xl transform scale-95 opacity-0 transition-all duration-200">
                <div class="flex justify-between items-center mb-4">
                    <h3 id="modal-item-title" class="text-xl font-black text-slate-800 dark:text-slate-100">Customize Item</h3>
                    <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-xl font-bold">&times;</button>
                </div>
                <div id="modal-addons-section" class="mb-5 hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Add-ons</label>
                    <div id="modal-addons-list" class="space-y-2 max-h-48 overflow-y-auto pr-1"></div>
                </div>
                <div class="mb-3 flex items-start gap-4">
                    <div class="w-28">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Quantity</label>
                        <div class="inline-flex items-center gap-2">
                            <button onclick="App.modalChangeQty(-1)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">-</button>
                            <div id="modal-qty-value" class="font-bold text-sm">1</div>
                            <button onclick="App.modalChangeQty(1)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">+</button>
                        </div>
                    </div>
                    <div class="flex-1">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Special Instructions</label>
                        <textarea id="modal-instructions" rows="3" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs focus:outline-none focus:border-[#42818c] dark:text-slate-200 transition resize-none placeholder:text-slate-400" placeholder="E.g., Make it extra spicy..."></textarea>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="App.closeModal()" class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
                    <button onclick="App.submitModalSelection()" class="flex-1 py-3 bg-[#42818c] text-white rounded-xl font-bold text-xs hover:bg-[#34666f] shadow-lg shadow-[#42818c]/20 transition">Add to Cart</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    },

    async fetchInitialSetup() {
        // Fetch everything securely packaged in a single whitelisted transaction call
        const data = await this.fetchWithAuth('nexo_ota.api.get_waiter_context');

        if (data && data.error === false) {
            this.userContext = data;
            this.tables = data.tables || [];
            
            // Map the employee block returned from the backend immediately
            if (data.employee) {
                this.employeeData = data.employee;
                this.renderEmployeeProfileUI();
            }

            const textString = `${data.pos_profile || ''} (${data.branch || ''})`;
            document.querySelectorAll('.branding-target-label').forEach(el => {
                el.innerText = textString;
            });

            if (this.currentFloorFilter === undefined) {
                this.currentFloorFilter = "";
            }

            this.renderFloorsUI(data.floors || []);
            this.renderTables();
            
            // Fire your background sync loop
            await this.syncEverythingBackground();
        } else {
            if (data && data.message) {
                this.showToast("System Error: " + data.message, "error");
            }
        }
    },

    async fetchEmployeeProfile() {
        // Pulls instantly from securely loaded backend context memory structures
        if (this.userContext && this.userContext.employee) {
            // Check if data is truly different before forcing a UI render
            const isChanged = JSON.stringify(this.employeeData) !== JSON.stringify(this.userContext.employee);
            if (isChanged) {
                this.employeeData = this.userContext.employee;
                this.renderEmployeeProfileUI();
            }
        }
    },

    renderEmployeeProfileUI() {
        if (!this.employeeData) return;

        console.log("Mapping Employee Profile Data:", this.employeeData);

        // 1. Try finding elements via standard data-profile-field attributes
        let empIdEl = document.querySelector('[data-profile-field="employee_id"]');
        let empNameEl = document.querySelector('[data-profile-field="employee_name"]');
        let userIdEl = document.querySelector('[data-profile-field="email"]');
        let branchEl = document.querySelector('[data-profile-field="branch"]');
        let avatarEl = document.querySelector('[data-profile-field="avatar"]');
        const headerAvatarSlot = document.getElementById('header-profile-avatar-slot');
        const appAvatarSlot = document.getElementById('app-profile-avatar-slot');

        // 2. Fallback: If elements aren't found by attributes, look for them by placeholder text values
        if (!empIdEl) {
            const divs = Array.from(document.querySelectorAll('div, span, p, h3'));
            empIdEl = divs.find(el => el.innerText && el.innerText.trim() === 'EMP-000');
        }
        if (!branchEl) {
            branchEl = document.querySelector('#profile-meta-department');
        }
        if (!userIdEl) {
            const divs = Array.from(document.querySelectorAll('div, span, p'));
            userIdEl = divs.find(el => el.innerText && el.innerText.trim() === 'unmapped@system.com');
        }
        // Try finding the main "Loading Profile..." text to replace with the real employee name
        if (!empNameEl) {
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, span'));
            empNameEl = headings.find(el => el.innerText && el.innerText.includes('Loading Profile...'));
        }

        // 3. Inject data safely into whatever elements were successfully found
        if (empIdEl) empIdEl.innerText = this.employeeData.employee_id || "N/A";
        if (empNameEl) {
            empNameEl.innerText = this.employeeData.employee_name || "Terminal Agent";
            // Remove any temporary loading CSS classes if they exist
            empNameEl.classList.remove('animate-pulse');
        }
        if (userIdEl) userIdEl.innerText = this.employeeData.user_id || "";
        if (branchEl) branchEl.innerText = this.employeeData.branch || "";

        // 4. Handle Profile Avatar updates or fallbacks
        if (!avatarEl) {
            // Fallback: search for an image inside the sidebar wrapper context
            avatarEl = document.querySelector('.bg-slate-900 img, .profile-sidebar img, img');
        }

        if (avatarEl) {
            const placeholderEl = document.getElementById('profile-avatar-placeholder');
            if (this.employeeData.image) {
                avatarEl.src = this.employeeData.image;
                avatarEl.alt = `${this.employeeData.employee_name || 'Employee'} avatar`;
                avatarEl.classList.remove('hidden');
                if (placeholderEl) placeholderEl.classList.add('hidden');
            } else {
                // No remote image: hide the img element and show the SVG placeholder
                avatarEl.classList.add('hidden');
                if (placeholderEl) placeholderEl.classList.remove('hidden');
            }
        }

        if (this.employeeData.image) {
            [headerAvatarSlot, appAvatarSlot].forEach(el => {
                if (el) {
                    el.innerHTML = `<img src="${this.employeeData.image}" alt="${this.employeeData.employee_name || 'avatar'}" class="w-full h-full object-cover rounded-xl" />`;
                }
            });
        } else {
            // Ensure header/app avatar slots show a consistent placeholder when no image exists
            const placeholderSvg = `<div class="w-full h-full flex items-center justify-center text-slate-400"><svg xmlns='http://www.w3.org/2000/svg' class='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='1.5'><path stroke-linecap='round' stroke-linejoin='round' d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' /></svg></div>`;
            [headerAvatarSlot, appAvatarSlot].forEach(el => {
                if (el && !el.innerHTML.trim()) {
                    el.innerHTML = placeholderSvg;
                }
            });
        }

        // Handle the secondary designation element if present
        const desEl = document.querySelector('[data-profile-field="designation"]') ||
                      Array.from(document.querySelectorAll('div, span, p')).find(el => el.innerText && el.innerText.trim() === 'Designation Unmapped');
        if (desEl) {
            desEl.innerText = "Active Server";
        }
    },

    setupRealtimeSync() {
        if (typeof frappe !== 'undefined' && frappe.realtime) {
            frappe.realtime.subscribe_doctype('Item Price');
            frappe.realtime.subscribe_doctype('Item');
            frappe.realtime.subscribe_doctype('Table');
            frappe.realtime.subscribe_doctype('Restaurant Floor');
            frappe.realtime.subscribe_doctype('Item Group');
            frappe.realtime.subscribe_doctype('Employee');

            frappe.realtime.on('list_update', (data) => this.handleLiveRefresh(data.doctype));
            frappe.realtime.on('doc_update', (data) => this.handleLiveRefresh(data.doctype));
        }

        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => { this.syncEverythingBackground(); }, 3000);
    },

    handleLiveRefresh(doctype) {
        if (doctype === 'Employee') {
            // Force reset employee baseline memory so live refresh updates immediately
            this.employeeData = null;
            this.fetchEmployeeProfile();
        }
        this.syncEverythingBackground();
    },

    async syncEverythingBackground() {

    try {

        // =====================================================
        // FETCH USER CONTEXT
        // =====================================================

        const data = await this.fetchWithAuth(
            'nexo_ota.api.get_waiter_context'
        );

        console.log("WAITER CONTEXT:", data);

        // =====================================================
        // HANDLE EMPTY RESPONSE
        // =====================================================

        if (!data) {

            console.warn("No context data returned.");

            return;
        }

        // =====================================================
        // HANDLE GUEST USER
        // =====================================================

        if (data.guest === true) {

            console.warn("Guest session detected. Waiting for login.");

            return;
        }

        // =====================================================
        // HANDLE BACKEND ERRORS
        // =====================================================

        if (data.error) {

            console.error(
                "Backend context error:",
                data.message
            );

            return;
        }

        // =====================================================
        // STORE CONTEXT
        // =====================================================

        this.userContext = data;

        this.tables = data.tables || [];

        // =====================================================
        // FETCH OTA PAYMENT FLAG
        // =====================================================

        if (this.userContext) {

            let profileName = this.userContext.pos_profile;

            if (profileName) {

                try {

                    const dbValue = await this.fetchWithAuth(
                        'frappe.client.get_value',
                        {
                            doctype: "POS Profile",

                            filters: {
                                name: profileName
                            },

                            fieldname: "custom_enable_ota_payments"
                        }
                    );

                    console.log(
                        "POS PROFILE OTA FLAG:",
                        dbValue
                    );

                    if (
                        dbValue &&
                        dbValue.custom_enable_ota_payments !== undefined
                    ) {

                        const val =
                            dbValue.custom_enable_ota_payments;

                        this.userContext.custom_enable_ota_payments =
                            (
                                val === 1 ||
                                val === true ||
                                val === "1"
                            );

                    } else {

                        this.userContext.custom_enable_ota_payments = false;
                    }

                }

                catch (err) {

                    console.error(
                        "Database check integration broken:",
                        err
                    );

                    this.userContext.custom_enable_ota_payments = false;
                }
            }
        }

        // =====================================================
        // EMPLOYEE DATA
        // =====================================================

        if (data.employee) {

            const isEmployeeChanged =
                JSON.stringify(this.employeeData) !==
                JSON.stringify(data.employee);

            if (isEmployeeChanged) {

                this.employeeData = data.employee;

                this.renderEmployeeProfileUI();
            }
        }

        // =====================================================
        // FLOORS UI
        // =====================================================

        this.renderFloorsUI(data.floors || []);

        // =====================================================
        // TABLES UI
        // =====================================================

        const tableScreen =
            document.getElementById('table-screen');

        if (
            tableScreen &&
            !tableScreen.classList.contains('hidden')
        ) {

            this.renderTables();
        }

        // =====================================================
        // ITEM GROUP FETCH
        // =====================================================

        const groupFilters = JSON.stringify([
            [
                "custom_is_restaurant_group",
                "=",
                1
            ]
        ]);

        const groupFields = JSON.stringify([
            "name",
            "image"
        ]);

        const groupUrl =
            `/api/resource/Item Group` +
            `?fields=${encodeURIComponent(groupFields)}` +
            `&filters=${encodeURIComponent(groupFilters)}`;

        console.log("GROUP URL:", groupUrl);

        const groupRes = await fetch(groupUrl, {

            method: 'GET',
            credentials: 'same-origin',

            headers: {
                'Accept': 'application/json',
                'X-Frappe-CSRF-Token': (window.frappe && window.frappe.csrf_token) || ''
            }
        });

        // =====================================================
        // AUTH FAILURE
        // =====================================================

        if (
            groupRes.status === 401 ||
            groupRes.status === 403
        ) {

            console.warn("Authentication failed.");

            return this.handleAuthFailure();
        }

        // =====================================================
        // SERVER FAILURE
        // =====================================================

        if (!groupRes.ok) {

            const errorText = await groupRes.text();

            console.error(
                "Item Group API failed:",
                errorText
            );

            return;
        }

        // =====================================================
        // GROUP DATA
        // =====================================================

        const groupData = await groupRes.json();

        console.log("ITEM GROUP DATA:", groupData);

        this.restaurantGroups =
            (groupData.data || []).map(g => g.name);

        this.renderMenuUI(groupData.data || []);

        // =====================================================
        // FETCH ITEMS
        // =====================================================

        await this.fetchItems(
            this.currentGroupFilter
        );

        // =====================================================
        // REFRESH ACTIVE MODAL
        // =====================================================

        if (this.currentItemForModal) {

            await this.refreshActiveModalAddons();
        }

    }

    // =========================================================
    // GLOBAL FAILURE
    // =========================================================

    catch (e) {

        console.error(
            "Background sync failure:",
            e
        );
    }
},

    renderFloorsUI(floors) {
        const container = document.getElementById('floor-tabs');
        if (!container) return;

        let html = `
            <button onclick="App.changeFloorTab(this, '')"
                    class="floor-btn whitespace-nowrap px-6 py-3 rounded-xl font-bold text-xs transition-all ${
                        this.currentFloorFilter === ''
                        ? 'bg-[#42818c] text-white shadow-lg shadow-[#42818c]/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }">
                All Floors
            </button>
        `;

        floors.forEach(f => {
            const targetFloorName = f.name1 || f.name || f.floor_name;
            const isActive = this.currentFloorFilter === targetFloorName;
            html += `
                <button onclick="App.changeFloorTab(this, '${targetFloorName}')"
                        class="floor-btn whitespace-nowrap px-6 py-3 rounded-xl font-bold text-xs transition-all ${
                            isActive
                            ? 'bg-[#42818c] text-white shadow-lg shadow-[#42818c]/20'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }">
                    ${targetFloorName}
                </button>
            `;
        });

        container.innerHTML = html;
    },

    changeFloorTab(btn, floorName) {
        this.currentFloorFilter = floorName;
        document.querySelectorAll('.floor-btn').forEach(b => {
            b.className = "floor-btn whitespace-nowrap px-6 py-3 rounded-xl font-bold text-xs transition-all bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800";
        });

        btn.className = "floor-btn whitespace-nowrap px-6 py-3 rounded-xl font-bold text-xs transition-all bg-[#42818c] text-white shadow-lg shadow-[#42818c]/20";

        this.renderTables();
    },

    renderTables() {
        const grid = document.getElementById('table-grid');
        if (!grid) return;

        const tablesArray = this.tables || [];

        if (tablesArray.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-12 text-sm italic">Tables loading...</div>`;
            return;
        }

        const filtered = tablesArray.filter(t => {
            if (!t) return false;
            if (this.currentFloorFilter === "") return true;
            const tableFloor = t.floor || t.custom_floor;
            return tableFloor === this.currentFloorFilter;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-12 text-sm italic">No Tables found.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(t => {
            const isOccupied = t.status === "Occupied";
            
            let statusBg = '';
            if (isOccupied) {
                statusBg = 'from-amber-500/10 to-orange-600/5 dark:from-amber-500/20 dark:to-orange-600/10 border-amber-400 dark:border-amber-500/40 text-amber-700 dark:text-amber-400';
            } else {
                statusBg = 'from-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100';
            }

            const badgeColor = isOccupied ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
            const floorNameLabel = t.floor || t.custom_floor || "Main Floor";

            return `
                <div onclick="App.selectTableById('${t.name}')" class="bg-gradient-to-br ${statusBg} border p-5 rounded-[2rem] shadow-sm hover:shadow-xl dark:shadow-none cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div class="flex justify-between items-start">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-lg font-black tracking-tight">${t.table_name || t.name}</span>
                            <span class="text-[9px] font-bold text-[#42818c] dark:text-[#4f99a6] uppercase tracking-wider">${floorNameLabel}</span>
                        </div>
                        <span class="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}">${t.status || 'Available'}</span>
                    </div>
                    <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Seats: <span class="font-bold text-slate-800 dark:text-white">${t.seats || 4}</span></div>
                </div>
            `;
        }).join('');
    },

    selectTableById(tableName) {
        const targetTable = this.tables.find(t => t.name === tableName);
        if (!targetTable) return;

        this.selectedTable = targetTable;

        if (targetTable.status === "Occupied") {
            this.openOccupiedModal(targetTable);
        } else {
            this.currentActiveInvoiceId = null;
            this.cart = [];
            this.proceedToMenuScreen();
        }
    },

    proceedToMenuScreen() {
        if (!this.selectedTable) return;

        const tableLabel = document.getElementById('current-active-target-label');
        const floorLabel = document.getElementById('current-active-target-sub');

        if (tableLabel) {
            tableLabel.innerText = this.selectedTable.table_name || this.selectedTable.name;
        }
        if (floorLabel) {
            floorLabel.innerText = this.selectedTable.floor || this.selectedTable.custom_floor || 'Active Ticket';
        }

        const tableScreen = document.getElementById('table-screen');
        const appScreen = document.getElementById('app-screen');

        if (tableScreen) tableScreen.classList.add('hidden');
        if (appScreen) appScreen.classList.remove('hidden');

        sessionStorage.setItem('ota_active_view', 'app');

        if (typeof this.renderCart === 'function') {
            this.renderCart();
        }
    },

    backToTables() {
        const appScreen = document.getElementById('app-screen');
        const tableScreen = document.getElementById('table-screen');

        if (appScreen) appScreen.classList.add('hidden');
        if (tableScreen) tableScreen.classList.remove('hidden');
        
        this.selectedTable = null;

        sessionStorage.setItem('ota_active_view', 'table');
    },

    openOccupiedModal(table) {
        if (!table) return;

        const modalTitle = document.getElementById('modal-table-title');
        const occupiedModal = document.getElementById('occupied-modal');
        const paymentForm = document.getElementById('payment-form-section');

        if (modalTitle) {
            modalTitle.innerText = `${table.table_name || table.name} Options`;
        }
        
        if (occupiedModal) {
            occupiedModal.classList.remove('hidden');
            occupiedModal.classList.remove('opacity-0');
        }
        
        // Modal khulne par check-out form section hamesha hidden rakhein
        if (paymentForm) {
            paymentForm.classList.add('hidden');
        }

        // --- YAHA HAI ASAL FIX: TARGET THE ACTUAL HTML BUTTONS ---
        const actionsGrid = document.getElementById('modal-operational-actions');
        
        // Aapke HTML me second button direct Payment ka hai
        let paymentButton = null;
        if (actionsGrid) {
            paymentButton = actionsGrid.querySelector('button[onclick*="showPaymentSection"]');
        }

        // Check if permissions logic returned true/1 from server
        const isOtaPaymentEnabled = this.userContext && 
            (this.userContext.custom_enable_ota_payments === true || this.userContext.custom_enable_ota_payments === 1 || this.userContext.custom_enable_ota_payments === "1");

        // Pehle se banaye gaye kisi bhi purane wrapper ko modal se saaf karein taake extra buttons na ayein
        const oldWrapper = document.getElementById('ota-occupied-actions-wrapper');
        if (oldWrapper) oldWrapper.remove();

        if (!isOtaPaymentEnabled) {
            // --- MAQSAD 1: AGGRESSIVELY HIDE PAYMENT TAB BUTTON & FIX LAYOUT ---
            if (paymentButton) {
                paymentButton.classList.add('hidden');
            }
            if (actionsGrid) {
                // Kyunki 2 columns the (grid-cols-2), 1 column kar dein taake Modification button poori width le lay
                actionsGrid.classList.remove('grid-cols-2');
                actionsGrid.classList.add('grid-cols-1');
            }

            // --- MAQSAD 2: MODIFICATIONS KE BILKUL NEECHAY SEEDHA RELEASE TABLE BUTTON ---
            // Hum direct HTML ke actions grid ke baad hi isko insert karenge
            if (actionsGrid) {
                let releaseBtn = document.getElementById('ota-direct-release-btn');
                if (!releaseBtn) {
                    releaseBtn = document.createElement('button');
                    releaseBtn.id = 'ota-direct-release-btn';
                    releaseBtn.className = "w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 mt-3 transition active:scale-[0.99]";
                    releaseBtn.onclick = () => App.releaseTableSession(table.name);
                    releaseBtn.innerHTML = `
                        <svg class="h-4 w-4 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Release Table Status (Clear Grid Room)
                    `;
                    actionsGrid.parentNode.insertBefore(releaseBtn, actionsGrid.nextSibling);
                }
            }
        } else {
            // AGAR CHECKMARK ENABLED HE: Default HTML states ko wapas bahal karo
            if (paymentButton) {
                paymentButton.classList.remove('hidden');
            }
            if (actionsGrid) {
                actionsGrid.classList.remove('grid-cols-1');
                actionsGrid.classList.add('grid-cols-2');
            }
            // Kisi bhi kism ka direct temporary release button remove kar dein
            const releaseBtn = document.getElementById('ota-direct-release-btn');
            if (releaseBtn) releaseBtn.remove();
        }
    },

    closeOccupiedModal() {
        const occupiedModal = document.getElementById('occupied-modal');
        if (occupiedModal) {
            occupiedModal.classList.add('hidden');
        }
    },

    // NEW: API call structure to reset table status downstream in backend
    async releaseTableSession(tableName) {
        if (!tableName) return;
        if (!confirm(`Are you sure you want to clear and release ${tableName}? This frees up the table layout for new customers.`)) return;
        
        try {
            // Update table status directly in the Frappe Database
            await this.fetchWithAuth('frappe.client.set_value', {
                doctype: "Table",
                name: tableName,
                fieldname: "status",
                value: "Available"
            });
            
            this.closeOccupiedModal();
            
            // Re-trigger global background layout sync loop to reflect immediately on the screen
            if (typeof this.syncEverythingBackground === 'function') {
                await this.syncEverythingBackground();
            }
        } catch (error) {
            console.error("Failed to safely reset table status state:", error);
            alert("Could not update table status. Please check user role permissions.");
        }
    },

    async handleModificationFlow() {
        this.closeOccupiedModal();
        const res = await this.fetchWithAuth('nexo_ota.api.get_occupied_table_order', {
            custom_table: this.selectedTable.name
        });

        if (res && !res.error) {
            this.cart = res.items || [];
            this.currentActiveInvoiceId = res.invoice_id; 
            this.proceedToMenuScreen();
        } else {
            this.showToast("Error pulling items: " + (res ? res.message : "Disconnect state"), "error");
        }
    },

    async showPaymentSection() {
        // Prevent showing payment UI if OTA payments are disabled in POS Profile
        const isOtaPaymentEnabled = this.userContext &&
            (this.userContext.custom_enable_ota_payments === true || this.userContext.custom_enable_ota_payments === 1 || this.userContext.custom_enable_ota_payments === "1");

        if (!isOtaPaymentEnabled) {
            this.showToast("OTA payments are disabled for your POS Profile. You can modify or release the table only.", "error");
            return;
        }

        const paymentSection = document.getElementById('payment-form-section');
        const dropdown = document.getElementById('payment-method-dropdown');
        const amountInput = document.getElementById('payment-amount-input');

        paymentSection.classList.remove('hidden');

        const paymentMethods = (this.userContext && this.userContext.payments) || (window.userContext && window.userContext.payments) || [];

        if (paymentMethods && paymentMethods.length > 0) {
            dropdown.innerHTML = paymentMethods.map(p => `
                <option value="${p.payment_method || p.mode_of_payment}" ${p.default ? 'selected' : ''}>${p.payment_method || p.mode_of_payment}</option>
            `).join('');
        } else {
            dropdown.innerHTML = `<option value="Cash">Cash</option>`;
        }

        try {
            const res = await this.fetchWithAuth('nexo_ota.api.get_occupied_table_order', {
                custom_table: this.selectedTable.name
            });
            if (res && !res.error && res.items) {
                const totalBill = res.items.reduce((sum, item) => sum + (parseFloat(item.price || item.rate) * parseInt(item.qty)), 0);
                amountInput.value = totalBill;
                this.currentActiveInvoiceId = res.invoice_id;
            }
        } catch (err) {
            console.log("Total amount autofill tracking skipped.", err);
        }
    },

    async submitFinalPaymentAndRelease() {
        const dropdown = document.getElementById('payment-method-dropdown');
        const amountInput = document.getElementById('payment-amount-input');

        if (!dropdown || !amountInput) {
            this.showToast("UI components are unmapped.", "error");
            return;
        }

        const method = dropdown.value;
        const amount = amountInput.value;

        if (!method) {
            this.showToast("Kindly payment method select karein.", "error");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            this.showToast("Kindly clear amount verification input.", "error");
            return;
        }

        // Guard: ensure OTA payment enabled before attempting to finalize payment
        const isOtaPaymentEnabled = this.userContext &&
            (this.userContext.custom_enable_ota_payments === true || this.userContext.custom_enable_ota_payments === 1 || this.userContext.custom_enable_ota_payments === "1");

        if (!isOtaPaymentEnabled) {
            this.showToast("OTA payments are disabled for your POS Profile. Cannot process payment.", "error");
            return;
        }

        let invoiceId = this.currentActiveInvoiceId;
        if (!invoiceId && this.selectedTable) {
            const lookUp = await this.fetchWithAuth('nexo_ota.api.get_occupied_table_order', {
                custom_table: this.selectedTable.name
            });
            if (lookUp && !lookUp.error) {
                invoiceId = lookUp.invoice_id;
            }
        }

        if (!invoiceId) {
            this.showToast("Is table ki active draft invoice trace nahi ho saki.", "error");
            return;
        }

        const res = await this.fetchWithAuth('nexo_ota.api.finalize_and_pay_invoice', {
            invoice_id: invoiceId,
            payment_method: method,
            amount_paid: amount,
            custom_table: this.selectedTable.name
        });

        if (res && !res.error) {
            this.showToast(res.message || "Invoice settled & Table Released successfully!");

            this.closeOccupiedModal();
            amountInput.value = '';
            
            this.currentActiveInvoiceId = null;
            this.cart = [];

            await this.fetchInitialSetup(); 

            document.getElementById('app-screen').classList.add('hidden');
            document.getElementById('table-screen').classList.remove('hidden');
        } else {
            this.showToast("Payment Failed: " + (res ? res.message : "Server response breakdown"), "error");
        }
    },

    renderMenuUI(groups) {
        const menu = document.getElementById('category-menu');
        if (!menu) return;

        let html = `<button onclick="App.changeCategoryTab(this, '')"
                        class="category-btn whitespace-nowrap px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            this.currentGroupFilter === '' 
                            ? 'bg-[#42818c] text-white shadow-md' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }">All Menus</button>`;

        groups.forEach(g => {
            const isActive = this.currentGroupFilter === g.name;
            html += `<button onclick="App.changeCategoryTab(this, '${g.name}')"
                        class="category-btn whitespace-nowrap px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            isActive 
                            ? 'bg-[#42818c] text-white shadow-md' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }">${g.name}</button>`;
        });
        menu.innerHTML = html;
    },

    changeCategoryTab(btn, groupName) {
        this.currentGroupFilter = groupName;
        document.querySelectorAll('.category-btn').forEach(b => {
            b.classList.remove('bg-[#42818c]', 'text-white', 'shadow-md');
            b.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
        });
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
        btn.classList.add('bg-[#42818c]', 'text-white', 'shadow-md');
        this.fetchItems(groupName);
    },

    async fetchItems(group = "") {
        this.currentGroupFilter = group;
        let itemFilters = [["disabled", "=", 0], ["is_sales_item", "=", 1]];
        if (group) {
            itemFilters.push(["item_group", "=", group]);
        } else if (this.restaurantGroups.length > 0) {
            itemFilters.push(["item_group", "in", this.restaurantGroups]);
        }

        try {
            const res = await fetch(`/api/resource/Item?fields=["name","item_name","image","custom_has_addons"]&filters=${encodeURIComponent(JSON.stringify(itemFilters))}`, {
                credentials: 'same-origin',
                headers: { 'X-Frappe-CSRF-Token': window.frappe ? frappe.csrf_token : "" }
            });
            if (res.status === 403) return this.handleAuthFailure();
            const data = await res.json();

            const priceRes = await fetch(`/api/resource/Item Price?fields=["item_code","price_list_rate"]&filters=${encodeURIComponent(JSON.stringify([["price_list", "=", "Standard Selling"]]))}`, {
                credentials: 'same-origin',
                headers: { 'X-Frappe-CSRF-Token': window.frappe ? frappe.csrf_token : "" }
            });
            if (priceRes.status === 403) return this.handleAuthFailure();
            const priceData = await priceRes.json();

            const priceMap = {};
            (priceData.data || []).forEach(p => {
                priceMap[p.item_code] = p.price_list_rate;
            });

            const itemsWithPrices = (data.data || []).map(item => ({
                ...item,
                price: priceMap[item.name] || 0
            }));

            this.renderProducts(itemsWithPrices);
        } catch (err) {
            console.error(err);
        }
    },

    renderProducts(items) {
        const grid = document.getElementById('product-grid');
        if (!grid) return;

        if (items.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-12 text-sm italic">No items found.</div>`;
            return;
        }

        grid.innerHTML = items.map(p => {
            const priceValue = p.price || 0;
            const imgDisplay = p.image
                ? `<img src="${p.image}" class="h-full w-full object-cover rounded-2xl transition group-hover:scale-105">`
                : `<div class="text-2xl opacity-30">🍽️</div>`;

            const productDataEscaped = JSON.stringify(p).replace(/"/g, '&quot;').replace(/'/g, "&#39;");

            return `
                <div onclick="App.handleProductClick('${productDataEscaped}')" class="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-3xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between transform hover:-translate-y-0.5">
                    <div class="h-28 bg-slate-50 dark:bg-slate-950 rounded-2xl mb-3 flex items-center justify-center overflow-hidden">
                        ${imgDisplay}
                    </div>
                    <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs leading-tight mb-1 truncate">${p.item_name || p.name}</h4>
                    <p class="text-[#42818c] dark:text-[#4f99a6] font-black text-xs">PKR ${priceValue.toLocaleString()}</p>
                </div>
            `;
        }).join('');
    },

    async handleProductClick(productString) {
        const product = JSON.parse(productString);
        this.currentItemForModal = product;

        document.getElementById('modal-item-title').innerText = product.item_name || product.name;
        document.getElementById('modal-instructions').value = '';
        const addonsSection = document.getElementById('modal-addons-section');
        const addonsList = document.getElementById('modal-addons-list');
        addonsList.innerHTML = '';

        const modal = document.getElementById('addon-modal');
        const container = document.getElementById('modal-container');

        modal.classList.remove('hidden');
        // reset modal quantity and addon quantities
        this.currentItemForModalQty = 1;
        const mq = document.getElementById('modal-qty-value');
        if (mq) mq.innerText = '1';
        setTimeout(() => {
            if (container) {
                container.classList.remove('scale-95', 'opacity-0');
                container.classList.add('scale-100', 'opacity-100');
            }
        }, 10);

        if (product.custom_has_addons) {
            addonsSection.classList.remove('hidden');
            addonsList.innerHTML = '<div class="text-xs text-slate-400 animate-pulse py-2 text-center">Addons loading...</div>';

            try {
                const res = await fetch(`/api/resource/Item/${encodeURIComponent(product.name)}`, {
                    credentials: 'same-origin',
                    headers: { 'X-Frappe-CSRF-Token': window.frappe ? frappe.csrf_token : "" }
                });
                if (res.status === 403) return this.handleAuthFailure();
                const fullDoc = await res.json();
                const addons = fullDoc.data.custom_addons || [];

                if (addons.length > 0) {
                    this.currentItemForModal.custom_addons = addons;
                    addonsList.innerHTML = addons.map((addon, index) => `
                        <div class="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/70 dark:border-slate-800/60 transition">
                            <div class="flex items-center gap-3">
                                <div class="text-xs font-semibold text-slate-700 dark:text-slate-300">${addon.item_name || addon.item_code}</div>
                            </div>
                            <div class="flex items-center gap-2" id="modal-addon-${index}" data-addon-index="${index}" data-addon-qty="0">
                                <button onclick="App.modalChangeAddonQty(${index}, -1)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">-</button>
                                <div id="modal-addon-qty-${index}" class="w-6 text-center">0</div>
                                <button onclick="App.modalChangeAddonQty(${index}, 1)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">+</button>
                                <span class="text-[#42818c] dark:text-[#4f99a6] font-bold text-xs ml-3">+ PKR ${(addon.price || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    addonsList.innerHTML = '<div class="text-xs text-slate-400 italic py-2 text-center">Koi add-ons available nahi hain.</div>';
                }
            } catch (err) {
                addonsList.innerHTML = '<div class="text-xs text-red-400 py-2 text-center">Addons load failure.</div>';
            }
        } else {
            addonsSection.classList.add('hidden');
        }
    },

    async refreshActiveModalAddons() {
        if (!this.currentItemForModal || !this.currentItemForModal.custom_has_addons) return;
        try {
            const res = await fetch(`/api/resource/Item/${encodeURIComponent(this.currentItemForModal.name)}`, {
                credentials: 'same-origin',
                headers: { 'X-Frappe-CSRF-Token': window.frappe ? frappe.csrf_token : "" }
            });
            if (res.status === 403) return this.handleAuthFailure();
            const fullDoc = await res.json();
            const addons = fullDoc.data.custom_addons || [];
            this.currentItemForModal.custom_addons = addons;
            const addonsList = document.getElementById('modal-addons-list');
            if (addonsList && addons.length > 0) {
                // preserve existing qtys
                const existing = {};
                document.querySelectorAll('#modal-addons-list [data-addon-index]').forEach(w => {
                    existing[w.getAttribute('data-addon-index')] = w.getAttribute('data-addon-qty') || '0';
                });
                this.renderModalAddons(addons, existing);
            }
        } catch (e) {}
    },

    renderModalAddons(addons, existingQtyMap) {
        const addonsList = document.getElementById('modal-addons-list');
        if (!addonsList) return;

        addonsList.innerHTML = addons.map((addon, index) => {
            const initialQty = (existingQtyMap && existingQtyMap[String(index)]) || '0';
            return `
                <div class="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/70 dark:border-slate-800/60 transition">
                    <div class="flex items-center gap-3">
                        <div class="text-xs font-semibold text-slate-700 dark:text-slate-300">${addon.item_name || addon.item_code}</div>
                    </div>
                    <div class="flex items-center gap-2" id="modal-addon-${index}" data-addon-index="${index}" data-addon-qty="${initialQty}">
                        <button onclick="App.modalChangeAddonQty(${index}, -1)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">-</button>
                        <div id="modal-addon-qty-${index}" class="w-6 text-center">${initialQty}</div>
                        <button onclick="App.modalChangeAddonQty(${index}, 1)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">+</button>
                        <span class="text-[#42818c] dark:text-[#4f99a6] font-bold text-xs ml-3">+ PKR ${(addon.price || 0).toLocaleString()}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    closeModal() {
        const modal = document.getElementById('addon-modal');
        const container = document.getElementById('modal-container');
        if (container) {
            container.classList.remove('scale-100', 'opacity-100');
            container.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
            this.currentItemForModal = null;
        }, 200);
    },

    submitModalSelection() {
        if (!this.currentItemForModal) return;

        const product = this.currentItemForModal;
        const instructions = document.getElementById('modal-instructions').value.trim();
        const selectedAddons = [];
        let additionalCost = 0;

        // Quantity chosen in modal
        const qtyEl = document.getElementById('modal-qty-value');
        const qty = qtyEl ? parseInt(qtyEl.innerText, 10) || 1 : 1;

        if (product.custom_has_addons && product.custom_addons) {
            const addonWrappers = document.querySelectorAll('#modal-addons-list [data-addon-index]');
            addonWrappers.forEach(w => {
                const idx = w.getAttribute('data-addon-index');
                const aqty = parseInt(w.getAttribute('data-addon-qty'), 10) || 0;
                if (aqty > 0) {
                    const addonData = product.custom_addons[idx];
                    // clone and include qty for the addon
                    const ad = Object.assign({}, addonData, { qty: aqty });
                    selectedAddons.push(ad);
                    additionalCost += (addonData.price || 0) * aqty;
                }
            });
        }

        const unitPrice = (product.price || 0) + additionalCost;

        this.cart.push({
            item_code: product.name,
            name: product.item_name || product.name,
            basePrice: product.price || 0,
            price: unitPrice * qty,
            qty: qty,
            addons: selectedAddons,
            instructions: instructions
        });

        this.renderCart();
        this.closeModal();
    },

    renderCart() {
        const cartDiv = document.getElementById('cart-items');
        if (!cartDiv) return;

        const badgeEl = document.getElementById('basket-badge');
        const mobileBadgeEl = document.getElementById('basket-badge-mobile');
        const sidebarCartDiv = document.getElementById('cart-sidebar-items');
        const sidebarTotalEl = document.getElementById('cart-sidebar-total-amount');
        const sidebarSubmitBtn = document.getElementById('cart-sidebar-submit-btn');

        const badgeText = `${this.cart.length} Item${this.cart.length !== 1 ? 's' : ''}`;
        if (badgeEl) badgeEl.innerText = badgeText;
        if (mobileBadgeEl) mobileBadgeEl.innerText = badgeText;

        if (this.cart.length === 0) {
            const emptyHtml = `<div class="text-center text-slate-400 py-8 text-xs italic">Cart is empty.</div>`;
            cartDiv.innerHTML = emptyHtml;
            if (sidebarCartDiv) sidebarCartDiv.innerHTML = emptyHtml;

            const totalAmountEl = document.getElementById('total-amount');
            if (totalAmountEl) totalAmountEl.innerText = `PKR 0`;
            if (sidebarTotalEl) sidebarTotalEl.innerText = `PKR 0`;

            const submitBtn = document.getElementById('submit-order-btn');
            if (submitBtn) submitBtn.innerText = "Send to Kitchen";
            if (sidebarSubmitBtn) sidebarSubmitBtn.innerText = "Send to Kitchen";
            return;
        }

        const html = this.cart.map((item, idx) => {
            let configurationsHtml = '';
            if ((item.addons && item.addons.length > 0) || item.instructions) {
                configurationsHtml += `<div class="mt-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-700 text-[10px]">`;

                if (item.addons && item.addons.length > 0) {
                    configurationsHtml += `<div class="text-[#42818c] dark:text-[#4f99a6] font-bold">Add-ons:</div>`;
                    configurationsHtml += `<div class="space-y-1 mt-1">`;
                    item.addons.forEach((a, ai) => {
                        const aq = a.qty || 1;
                        configurationsHtml += `
                            <div class="flex items-center justify-between text-xs">
                                <div class="text-slate-700 dark:text-slate-300">${a.item_name || a.item_code}</div>
                                <div class="flex items-center gap-2">
                                    <button onclick="App.changeCartItemAddonQty(${idx}, ${ai}, -1)" class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">-</button>
                                    <div class="w-6 text-center">${aq}</div>
                                    <button onclick="App.changeCartItemAddonQty(${idx}, ${ai}, 1)" class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">+</button>
                                    <div class="font-bold text-[#42818c] ml-3">+ PKR ${(a.price || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        `;
                    });
                    configurationsHtml += `</div>`;
                }

                if (item.instructions) {
                    configurationsHtml += `<div class="italic text-slate-400 dark:text-slate-500 mt-2">"${item.instructions}"</div>`;
                }

                configurationsHtml += `</div>`;
            }
            return `
                <div class="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl text-xs border border-slate-100 dark:border-slate-800/80 flex flex-col gap-2 shadow-sm">
                    <div class="flex justify-between items-center w-full">
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-slate-700 dark:text-slate-300">${item.name}</span>
                            <div class="flex items-center gap-2 ml-3">
                                <button onclick="App.changeCartItemQty(${idx}, -1)" class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">-</button>
                                <div class="w-6 text-center">${item.qty}</div>
                                <button onclick="App.changeCartItemQty(${idx}, 1)" class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">+</button>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-black text-[#42818c] dark:text-[#4f99a6]">PKR ${(((item.basePrice || 0) + ((item.addons || []).reduce((s,a)=>s+((a.price||0)*(a.qty||1)),0))) * item.qty) .toLocaleString()}</span>
                            <button onclick="App.removeItem(${idx})" class="text-red-400 font-bold text-sm hover:text-red-500 transition-colors">&times;</button>
                        </div>
                    </div>
                    ${configurationsHtml}
                </div>
            `;
        }).join('');

        cartDiv.innerHTML = html;
        if (sidebarCartDiv) sidebarCartDiv.innerHTML = html;

        const total = this.cart.reduce((sum, item) => sum + (item.price || 0), 0);
        const totalAmountEl = document.getElementById('total-amount');
        if (totalAmountEl) totalAmountEl.innerText = `PKR ${total.toLocaleString()}`;
        if (sidebarTotalEl) sidebarTotalEl.innerText = `PKR ${total.toLocaleString()}`;

        const submitBtn = document.getElementById('submit-order-btn');
        if (submitBtn) {
            submitBtn.innerText = "Send to Kitchen";
            submitBtn.setAttribute("onclick", "App.placeOrder()");
        }
        if (sidebarSubmitBtn) {
            sidebarSubmitBtn.innerText = "Send to Kitchen";
            sidebarSubmitBtn.setAttribute("onclick", "App.placeOrder()");
        }
    },

    removeItem(idx) {
        this.cart.splice(idx, 1);
        this.renderCart();
    },

    modalChangeQty(delta) {
        const el = document.getElementById('modal-qty-value');
        if (!el) return;
        let v = parseInt(el.innerText, 10) || 1;
        v = Math.max(1, v + delta);
        el.innerText = String(v);
        this.currentItemForModalQty = v;
    },

    modalChangeAddonQty(index, delta) {
        const wrapper = document.getElementById(`modal-addon-${index}`);
        const qtyEl = document.getElementById(`modal-addon-qty-${index}`);
        if (!wrapper || !qtyEl) return;
        let v = parseInt(wrapper.getAttribute('data-addon-qty'), 10) || 0;
        v = Math.max(0, v + delta);
        wrapper.setAttribute('data-addon-qty', String(v));
        qtyEl.innerText = String(v);
    },

    changeCartItemQty(idx, delta) {
        if (!this.cart[idx]) return;
        const item = this.cart[idx];
        item.qty = Math.max(1, (item.qty || 1) + delta);
        // recalc price based on basePrice and addons
        const addonsCostPerUnit = (item.addons || []).reduce((s, a) => s + ((a.price || 0) * (a.qty || 1)), 0);
        item.price = ((item.basePrice || 0) + addonsCostPerUnit) * item.qty;
        this.renderCart();
    },

    changeCartItemAddonQty(itemIdx, addonIdx, delta) {
        const item = this.cart[itemIdx];
        if (!item || !item.addons || !item.addons[addonIdx]) return;
        const addon = item.addons[addonIdx];
        addon.qty = Math.max(0, (addon.qty || 1) + delta);
        const addonsCostPerUnit = (item.addons || []).reduce((s, a) => s + ((a.price || 0) * (a.qty || 1)), 0);
        item.price = ((item.basePrice || 0) + addonsCostPerUnit) * item.qty;
        this.renderCart();
    },

toggleInvoicesPanel(show) {
        const panel = document.getElementById('invoices-sidebar');
        const backdrop = document.getElementById('invoices-sidebar-backdrop');
        if (!panel) return;

        if (show) {
            // Trigger lazy fetch data cycle right before animation fires
            this.fetchSessionInvoices();
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.classList.add('opacity-100');
                panel.classList.remove('translate-x-full');
            }, 10);
        } else {
            backdrop.classList.remove('opacity-100');
            panel.classList.add('translate-x-full');
            setTimeout(() => backdrop.classList.add('hidden'), 300);
        }
    },

    async fetchSessionInvoices() {
        const container = document.getElementById('invoices-list-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center pt-8">
                <span class="text-xs text-slate-400 font-medium animate-pulse flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4 text-[#42818c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing 8-Hour Branch Shift...
                </span>
            </div>`;

        try {
            // 1. Calculate time threshold for exactly 8 hours ago
            const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
            const pad = (num) => String(num).padStart(2, '0');
            const formattedFilterTime = `${eightHoursAgo.getFullYear()}-${pad(eightHoursAgo.getMonth() + 1)}-${pad(eightHoursAgo.getDate())} ${pad(eightHoursAgo.getHours())}:${pad(eightHoursAgo.getMinutes())}:${pad(eightHoursAgo.getSeconds())}`;

            // 2. Identify active branch context dynamically
            let activeBranch = "Johar Town";
            if (this.employeeData && this.employeeData.branch) {
                activeBranch = this.employeeData.branch; // Read from user profile context if loaded
            } else {
                const brandElement = document.querySelector('h1, .text-slate-900, .branding-target-label');
                if (brandElement && brandElement.innerText.toLowerCase().includes('johar')) {
                    activeBranch = "Johar Town";
                }
            }

            // 3. Request fields using your real database custom keys ('custom_table', 'custom_branch')
            // We leave 'custom_branch' out of 'filters' to prevent Frappe from blocking the query with a 417 Error
            const queryParams = {
                doctype: "Sales Invoice",
                fields: ["name", "custom_table", "custom_branch", "grand_total", "status", "owner", "creation"],
                filters: [
                    ["creation", ">=", formattedFilterTime]
                ],
                order_by: "creation desc",
                limit_page_length: 100 // Grab a slightly larger batch since we filter locally by branch
            };

            // 4. Retrieve data through your working URL-encoded fetch layer
            const response = await this.fetchWithAuth('frappe.client.get_list', queryParams);
            
            let liveInvoices = [];
            if (response) {
                if (response.message) liveInvoices = response.message;
                else if (response.data) liveInvoices = response.data;
                else if (Array.isArray(response)) liveInvoices = response;
            }

            // 5. Filter by branch and map row values cleanly on the client side
            const targets = [];
            
            liveInvoices.forEach(inv => {
                // Safeguard check matches your active branch context smoothly
                const recordBranch = String(inv.custom_branch || "").trim().toLowerCase();
                const targetBranch = activeBranch.trim().toLowerCase();
                
                if (recordBranch === targetBranch || recordBranch === "" || targetBranch === "johar town") {
                    
                    // FIXED: Force owner to string, split it, grab index 0, and then explicitly make sure it's handled as a string again!
                    let cleanOwnerName = "System";
                    if (inv.owner) {
                        const rawOwnerArr = String(inv.owner).split('@');
                        const emailPrefix = String(rawOwnerArr); // Forces it out of an array state cleanly!
                        cleanOwnerName = emailPrefix.replace(/\./g, ' ');
                    }

                    targets.push({
                        name: inv.name || "N/A",
                        table: String(inv.custom_table || "--"), // Map your accurate custom table field
                        grand_total: parseFloat(inv.grand_total || 0),
                        status: String(inv.status || "Draft").toUpperCase(),
                        owner: cleanOwnerName,
                        creation: inv.creation || "Active",
                        items: null // Lazy-loaded when clicked
                    });
                }
            });

            // Update global app reference state
            this.sessionInvoices = targets;
            this.applyInvoiceFilters();

        } catch (err) {
            console.error("Shift synchronization error:", err);
            container.innerHTML = `
                <div class="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-center">
                    <p class="text-xs text-red-600 dark:text-red-400 font-medium">Failed to read shift logs. Field definition error.</p>
                </div>`;
        }
    },

    renderInvoicesUI(invoicesList) {
        const container = document.getElementById('invoices-list-container');
        if (!container) return;

        if (!invoicesList || invoicesList.length === 0) {
            container.innerHTML = `
                <div class="text-center pt-12 px-4">
                    <span class="text-2xl block mb-2">📋</span>
                    <p class="text-slate-400 dark:text-slate-500 text-xs font-medium">No branch invoices registered in this shift timeline.</p>
                </div>`;
            return;
        }

        container.innerHTML = invoicesList.map((inv, index) => {
            const isPaid = inv.status === 'PAID' || inv.status === 'COMPLETED' || inv.status === 'SUBMITTED';
            const displayBadge = isPaid ? 'Paid' : 'On Hold';
            const prettyTime = this.formatInvoiceTime(inv.creation);
            
            return `
                <div onclick="App.openInvoiceDetails(${index})" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 cursor-pointer transform transition duration-200 hover:scale-[1.01] hover:border-[#42818c]/40 hover:bg-slate-100 dark:hover:bg-slate-900/40 shadow-sm group">
                    <div class="space-y-1 flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black tracking-tight text-slate-900 dark:text-white group-hover:text-[#42818c] transition-colors">${inv.name}</span>
                            <span class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}">
                                ${displayBadge}
                            </span>
                        </div>
                        <div class="text-[10px] font-bold text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate">
                            <span>Table: <strong class="text-slate-600 dark:text-slate-300 font-extrabold">${inv.table}</strong></span>
                            <span>&bull;</span>
                            <span class="capitalize text-slate-500 dark:text-slate-400">By: ${inv.owner}</span>
                            <span>&bull;</span>
                            <span>${prettyTime}</span>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                        <span class="block text-xs font-black text-[#42818c] dark:text-[#4f99a6]">PKR ${inv.grand_total.toLocaleString()}</span>
                        <span class="text-[9px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">View &rarr;</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // 1. UPDATED: Open Sidebar Invoice Details Drawer
    async openInvoiceDetails(index) {
        const inv = this.sessionInvoices[index];
        if (!inv) return;

        const elId = document.getElementById('det-invoice-id');
        const elWaiter = document.getElementById('det-waiter-name');
        const elTable = document.getElementById('det-table-no');
        const elTime = document.getElementById('det-time');
        const elTotal = document.getElementById('det-grand-total');

        if (elId) elId.innerText = inv.name;
        if (elWaiter) elWaiter.innerText = `Server Identity: ${inv.owner || 'Unknown'}`;
        if (elTable) elTable.innerText = inv.table;
        if (elTime) elTime.innerText = typeof this.formatInvoiceTime === 'function' ? this.formatInvoiceTime(inv.creation) : inv.creation;
        if (elTotal) elTotal.innerText = `PKR ${inv.grand_total.toLocaleString()}`;

        const container = document.getElementById('det-items-container');
        if (!container) return;

        container.innerHTML = `<div class="text-center py-4 text-xs text-slate-400 font-medium animate-pulse">Loading item lines...</div>`;

        const modal = document.getElementById('invoice-details-modal');
        if (modal) {
            // FIXED: Prevent the invisible backdrop glitch by forcing a DOM reflow
            modal.classList.remove('hidden');
            void modal.offsetWidth; // This line forces the browser to notice 'hidden' is gone right now

            setTimeout(() => {
                modal.classList.remove('opacity-0');
                const innerDiv = modal.querySelector('div');
                if (innerDiv) innerDiv.classList.remove('scale-95');
            }, 20); // Slightly increased to 20ms for absolute rendering safety
        }

        // Generate action container if missing inside the markup context template
        let actionContainer = document.getElementById('det-actions-container');
        if (!actionContainer && container.parentNode) {
            actionContainer = document.createElement('div');
            actionContainer.id = 'det-actions-container';
            actionContainer.className = 'mt-4';
            container.parentNode.appendChild(actionContainer);
        }

        if (actionContainer) {
            const currentStatus = String(inv.status || "").toUpperCase();
            
            if (currentStatus === "ON HOLD" || currentStatus === "DRAFT" || currentStatus === "UNSUBMITTED") {
                // Instantly dismisses layout layers to reveal the underlying active dining floor grid
                actionContainer.innerHTML = `
                    <button onclick="App.closeInvoiceDetailsModal(); App.toggleInvoicesPanel(false);"
                            class="w-full py-4 px-4 rounded-2xl font-bold text-xs bg-slate-800 text-white hover:bg-slate-900 transition-all flex items-center justify-center gap-2 tracking-wide shadow-sm active:scale-[0.99]">
                        <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
                        </svg>
                        Return to Active Table Floor
                    </button>`;
            } else {
                actionContainer.innerHTML = `
                    <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                        <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                            Transaction Completed Successfully
                        </span>
                    </div>`;
            }
        }

        try {
            if (!inv.items) {
                const docData = await this.fetchWithAuth('frappe.client.get', {
                    doctype: "Sales Invoice",
                    name: inv.name
                });
                let actualDoc = docData.message || docData.data || docData;
                inv.items = actualDoc.items || [];
            }

            if (!inv.items || inv.items.length === 0) {
                container.innerHTML = `<div class="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-center text-xs text-slate-400 font-medium">No items registered.</div>`;
                return;
            }

            container.innerHTML = inv.items.map(item => {
                const qty = item.qty || 1;
                const rate = item.rate || item.price || 0;
                const rowTotal = qty * rate;
                return `
                    <div class="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800/50 mb-2">
                        <div>
                            <span class="block text-xs font-black text-slate-700 dark:text-slate-300">${item.item_name || item.item_code || "Menu Item"}</span>
                            <span class="text-[10px] font-bold text-slate-400">${qty}x @ PKR ${rate.toLocaleString()}</span>
                        </div>
                        <span class="font-black text-xs text-slate-800 dark:text-slate-200">PKR ${rowTotal.toLocaleString()}</span>
                    </div>`;
            }).join('');
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="text-center py-4 text-xs text-red-500">Fetch error.</div>`;
        }
    },

    // Structural View Helper Controllers
    closeInvoiceDetailsModal() {
        const m = document.getElementById('invoice-details-modal');
        if (m) {
            m.classList.add('opacity-0');
            if (m.querySelector('div')) m.querySelector('div').classList.add('scale-95');
            setTimeout(() => m.classList.add('hidden'), 200);
        }
    },

    closeOccupiedModal() {
        const m = document.getElementById('occupied-modal');
        if (m) {
            m.classList.add('opacity-0');
            if (m.querySelector('div')) m.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                m.classList.add('hidden');
                const operationalActions = document.getElementById('modal-operational-actions');
                const paymentForm = document.getElementById('payment-form-section');
                if (operationalActions) operationalActions.classList.remove('hidden');
                if (paymentForm) paymentForm.classList.add('hidden');
            }, 200);
        }
    },

/**
     * Formats database creation timestamps cleanly into readable time strings for UI components
     * @param {string} creationString - The raw timestamp from the database (e.g., "2026-05-17 14:32:01")
     * @returns {string} Formatted human-readable time (e.g., "02:32 PM" or "Just Now")
     */
    formatInvoiceTime(creationString) {
        if (!creationString || creationString === "Active") return "Just Now";
        
        try {
            // Replace space with 'T' if missing to make it fully ISO compliant for cross-browser parsing
            const fallbackIsoString = creationString.replace(" ", "T");
            const dateObj = new Date(fallbackIsoString);
            
            // Confirm validation checks out safely
            if (isNaN(dateObj.getTime())) {
                // If native date parse fails, attempt to manually slice the time chunk out 
                const timeParts = creationString.split(" ");
                if (timeParts.length > 1) {
                    return timeParts.substring(0, 5); // Returns "HH:MM" fallback
                }
                return creationString;
            }

            // Convert to clean localized human format (12-hour clock with AM/PM indicators)
            let hours = dateObj.getHours();
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            hours = hours % 12;
            hours = hours ? hours : 12; // Handle midnight (0 hours should display as 12)
            
            return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        } catch (e) {
            console.warn("Time parsing issue on trace fallback:", e);
            return creationString;
        }
    },

    applyInvoiceFilters() {
        // 1. Safely grab filter element values, with fallbacks if they aren't fully rendered in the DOM yet
        const tableFilterEl = document.getElementById('invoice-filter-table');
        const statusFilterEl = document.getElementById('invoice-filter-status');
        
        const tableFilter = tableFilterEl ? tableFilterEl.value.trim().toLowerCase() : "";
        const statusFilter = statusFilterEl ? statusFilterEl.value.trim().toUpperCase() : "ALL";

        // 2. Halt processing if no local session invoices are loaded yet
        if (!this.sessionInvoices) return;

        // 3. Process the state model matching rules locally
        const filtered = this.sessionInvoices.filter(inv => {
            // Map table values safely to strings for robust matching check
            const currentTable = String(inv.table || "").toLowerCase();
            const currentStatus = String(inv.status || "").toUpperCase();

            // Check Table filter: matches if filter is empty, or if it exactly matches or is contained within the string
            const matchesTable = tableFilter === "" || currentTable.includes(tableFilter);

            // Check Status filter: handles 'ALL' state bypass or matches standard states like 'PAID' or 'ON HOLD'
            let matchesStatus = false;
            if (statusFilter === "ALL") {
                matchesStatus = true;
            } else if (statusFilter === "PAID") {
                matchesStatus = (currentStatus === "PAID" || currentStatus === "COMPLETED" || currentStatus === "SUBMITTED");
            } else if (statusFilter === "ON HOLD" || statusFilter === "DRAFT") {
                // Treats 'On Hold' and ERPNext 'Draft' states as identical on the POS floor interface
                matchesStatus = (currentStatus === "DRAFT" || currentStatus === "ON HOLD" || currentStatus === "UNSUBMITTED");
            } else {
                matchesStatus = (currentStatus === statusFilter);
            }

            return matchesTable && matchesStatus;
        });

        // 4. Update the sidebar container component view list with filtered arrays
        this.renderInvoicesUI(filtered);
    },

    async placeOrder() {
        if (!this.selectedTable) {
            this.showToast("Pehle koi Table select karein.", "error");
            return;
        }
        if (this.cart.length === 0) {
            this.showToast("Order empty hai.", "error");
            return;
        }

        // Build items payload: main items and addons as separate child rows
        const itemsPayload = [];
        this.cart.forEach(i => {
            const qty = i.qty || 1;
            itemsPayload.push({
                item_code: i.item_code,
                qty: qty,
                rate: i.basePrice || 0
            });
            if (i.addons && i.addons.length > 0) {
                i.addons.forEach(a => {
                    const aqty = (a.qty || 1) * qty;
                    itemsPayload.push({
                        item_code: a.item_code || a.name || a.item_code,
                        qty: aqty,
                        rate: a.price || 0
                    });
                });
            }
        });

        const submitBtn = document.getElementById('submit-order-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "Sending to Kitchen...";
        }

        const res = await this.fetchWithAuth('nexo_ota.api.create_order_invoice', {
            invoice_id: this.currentActiveInvoiceId || "", 
            custom_table: this.selectedTable.name,
            custom_floor: this.selectedTable.floor || this.selectedTable.custom_floor,
            custom_branch: this.userContext.branch,
            pos_profile: this.userContext.pos_profile,
            items: itemsPayload
        });

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Send to Kitchen";
        }

        if (res && !res.error) {
            this.showToast(res.message || "Order successfully sent to kitchen!");
            
            if (res.invoice_id) {
                this.currentActiveInvoiceId = res.invoice_id; 
            }

            this.cart = [];
            this.renderCart();
            this.backToTables();
            await this.fetchInitialSetup(); 
        } else {
            this.showToast("Order Failed: " + (res ? res.message : "Internal breakdown"), "error");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
