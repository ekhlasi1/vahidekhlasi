/**
 * ============================================================
 * گروه مشاورین املاک اخلاصی
 * سیستم مدیریت فایل‌های ملکی و قراردادهای اجاره
 * نسخه کامل با توکن جدید و خروجی Word/PDF
 * ============================================================
 */

(function() {
    "use strict";

    // ===== تنظیمات گیت‌هاب (توکن جدید) =====
    const GITHUB_CONFIG = {
        token: "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",
        owner: "ekhlasi1",
        repo: "vahidekhlasi",
        listingsPath: "data/listings.json",
        contractsPath: "data/contracts.json",
        usersPath: "data/users.json",
        backupPath: "backups/backup-latest.json"
    };

    // ===== کلیدهای ذخیره‌سازی =====
    const LS_SESSION = "ekhlasi_session_v1";
    const LS_REMEMBER = "ekhlasi_remember_v1";
    const LS_CONTRACT_DRAFT = "ekhlasi_contract_draft_v1";

    // ===== فاصله پشتیبان‌گیری (۳ ساعت) =====
    const BACKUP_INTERVAL = 10800000;

    // ===== کاربران ثابت =====
    const FALLBACK_USERS = [
        { username: "admin", password: "ekhlasi1404", displayName: "مدیر سامانه", role: "admin" },
        { username: "reza", password: "reza1404", displayName: "رضا احمدی", role: "agent" }
    ];

    // ===== کاربران =====
    let USERS = [];
    let isDataLoaded = false;

    // ===== ابزارها =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const fa = (n) => Number(n || 0).toLocaleString("fa-IR");

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function toast(msg, type) {
        const container = $("#toastContainer");
        if (!container) return;
        const el = document.createElement("div");
        el.className = `toast${type ? ' toast-' + type : ''}`;
        el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i> ${msg}`;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
            setTimeout(() => el.remove(), 300);
        }, 2800);
    }

    function escapeHtml(s) {
        return String(s || "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[c]));
    }

    const TYPE_LABEL = { apartment: "آپارتمان", villa: "ویلا", land: "زمین" };
    const DEAL_LABEL = { sale: "فروش", rent: "اجاره" };
    const STATUS_LABEL = { available: "موجود", reserved: "بیعانه‌شده", sold: "فروخته/اجاره‌شده" };

    // ===== GitHub API =====
    const GitHubAPI = {
        getHeaders() {
            return {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            };
        },

        async getFile(path) {
            try {
                const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
                const response = await fetch(url, { headers: this.getHeaders() });
                if (!response.ok) {
                    if (response.status === 404) return null;
                    if (response.status === 401) {
                        toast('❌ توکن گیت‌هاب نامعتبر است. لطفاً توکن جدیدی در تنظیمات وارد کنید.', 'danger');
                        throw new Error('Invalid token');
                    }
                    throw new Error(`GitHub API Error: ${response.status}`);
                }
                const data = await response.json();
                const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                return { content, sha: data.sha };
            } catch (error) {
                console.error('Error reading file from GitHub:', error);
                return null;
            }
        },

        async getRawFile(path) {
            try {
                const url = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/main/${path}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Error reading raw file:', error);
                return null;
            }
        },

        async saveFile(path, content, message, sha = null) {
            try {
                const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
                const body = {
                    message: message || `به‌روزرسانی - ${new Date().toLocaleString('fa-IR')}`,
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))))
                };
                if (sha) body.sha = sha;

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(body)
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        toast('❌ توکن گیت‌هاب نامعتبر است. لطفاً توکن جدیدی در تنظیمات وارد کنید.', 'danger');
                        throw new Error('Invalid token');
                    }
                    const errorText = await response.text();
                    console.error('GitHub API Error Response:', errorText);
                    throw new Error(`GitHub API Error: ${response.status} - ${errorText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error saving file to GitHub:', error);
                throw error;
            }
        },

        async loadListings() {
            let result = await this.getFile(GITHUB_CONFIG.listingsPath);
            if (result) return result.content;
            result = await this.getRawFile(GITHUB_CONFIG.listingsPath);
            if (result) return result;
            return [];
        },

        async loadContracts() {
            let result = await this.getFile(GITHUB_CONFIG.contractsPath);
            if (result) return result.content;
            result = await this.getRawFile(GITHUB_CONFIG.contractsPath);
            if (result) return result;
            return [];
        },

        async loadUsers() {
            let result = await this.getFile(GITHUB_CONFIG.usersPath);
            if (result) return result.content;
            result = await this.getRawFile(GITHUB_CONFIG.usersPath);
            if (result) return result;
            return FALLBACK_USERS;
        },

        async saveListings(data) {
            const existing = await this.getFile(GITHUB_CONFIG.listingsPath);
            return await this.saveFile(
                GITHUB_CONFIG.listingsPath,
                data,
                'به‌روزرسانی فایل‌های ملکی',
                existing ? existing.sha : null
            );
        },

        async saveContracts(data) {
            const existing = await this.getFile(GITHUB_CONFIG.contractsPath);
            return await this.saveFile(
                GITHUB_CONFIG.contractsPath,
                data,
                'به‌روزرسانی قراردادها',
                existing ? existing.sha : null
            );
        },

        async saveUsers(data) {
            const existing = await this.getFile(GITHUB_CONFIG.usersPath);
            return await this.saveFile(
                GITHUB_CONFIG.usersPath,
                data,
                'به‌روزرسانی کاربران',
                existing ? existing.sha : null
            );
        },

        async createFullBackup() {
            try {
                const listings = await this.loadListings();
                const contracts = await this.loadContracts();
                const users = await this.loadUsers();

                const backupData = {
                    version: "1.0",
                    timestamp: Date.now(),
                    date: new Date().toISOString(),
                    data: { listings, contracts, users }
                };

                const existing = await this.getFile(GITHUB_CONFIG.backupPath);
                await this.saveFile(
                    GITHUB_CONFIG.backupPath,
                    backupData,
                    `پشتیبان کامل - ${new Date().toLocaleString('fa-IR')}`,
                    existing ? existing.sha : null
                );

                return { success: true };
            } catch (error) {
                console.error('Error creating backup:', error);
                return { success: false, error: error.message };
            }
        }
    };

    // ===== مدیریت داده‌ها =====
    const DataStore = {
        _listings: [],
        _contracts: [],
        _users: [],

        async loadAll() {
            try {
                const [listings, contracts, users] = await Promise.all([
                    GitHubAPI.loadListings(),
                    GitHubAPI.loadContracts(),
                    GitHubAPI.loadUsers()
                ]);

                this._listings = listings || [];
                this._contracts = contracts || [];
                this._users = users || FALLBACK_USERS;
                USERS = this._users;

                isDataLoaded = true;
                console.log('✅ داده‌ها با موفقیت بارگذاری شدند');
                return true;
            } catch (error) {
                console.error('Error loading data:', error);
                return false;
            }
        },

        getListings() { return this._listings || []; },
        getContracts() { return this._contracts || []; },
        getUsers() { return this._users || FALLBACK_USERS; },

        async addListing(item) {
            const list = this.getListings();
            item.id = uid();
            item.code = this.nextCode(list);
            item.createdAt = Date.now();
            list.unshift(item);
            await GitHubAPI.saveListings(list);
            this._listings = list;
            return item;
        },

        async updateListing(id, patch) {
            const list = this.getListings();
            const idx = list.findIndex((l) => l.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...patch };
            await GitHubAPI.saveListings(list);
            this._listings = list;
            return list[idx];
        },

        async deleteListing(id) {
            let list = this.getListings();
            list = list.filter((l) => l.id !== id);
            await GitHubAPI.saveListings(list);
            this._listings = list;
        },

        async addContract(item) {
            const list = this.getContracts();
            item.id = uid();
            item.createdAt = Date.now();
            list.unshift(item);
            await GitHubAPI.saveContracts(list);
            this._contracts = list;
            return item;
        },

        async updateContract(id, patch) {
            const list = this.getContracts();
            const idx = list.findIndex((l) => l.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...patch };
            await GitHubAPI.saveContracts(list);
            this._contracts = list;
            return list[idx];
        },

        async deleteContract(id) {
            let list = this.getContracts();
            list = list.filter((c) => c.id !== id);
            await GitHubAPI.saveContracts(list);
            this._contracts = list;
        },

        async addUser(user) {
            const list = this.getUsers();
            list.push(user);
            await GitHubAPI.saveUsers(list);
            this._users = list;
            USERS = list;
        },

        async deleteUser(username) {
            let list = this.getUsers();
            list = list.filter((u) => u.username !== username);
            await GitHubAPI.saveUsers(list);
            this._users = list;
            USERS = list;
        },

        nextCode(list) {
            const nums = list
                .map((l) => parseInt((l.code || "").replace(/\D/g, ""), 10))
                .filter((n) => !isNaN(n));
            const next = (nums.length ? Math.max(...nums) : 1000) + 1;
            return "EKH-" + next;
        }
    };

    // ===== احراز هویت =====
    const Auth = {
        async login(username, password) {
            try {
                const users = DataStore.getUsers();
                const user = users.find((u) => u.username === username && u.password === password);
                if (user) return user;
                return FALLBACK_USERS.find((u) => u.username === username && u.password === password) || null;
            } catch (error) {
                return FALLBACK_USERS.find((u) => u.username === username && u.password === password) || null;
            }
        },
        setSession(user, remember) {
            const payload = JSON.stringify({ username: user.username, displayName: user.displayName, role: user.role });
            sessionStorage.setItem(LS_SESSION, payload);
            if (remember) localStorage.setItem(LS_REMEMBER, payload);
            else localStorage.removeItem(LS_REMEMBER);
        },
        getSession() {
            const s = sessionStorage.getItem(LS_SESSION) || localStorage.getItem(LS_REMEMBER);
            if (!s) return null;
            try { return JSON.parse(s); } catch { return null; }
        },
        logout() {
            sessionStorage.removeItem(LS_SESSION);
            localStorage.removeItem(LS_REMEMBER);
        },
        isLoggedIn() {
            return !!this.getSession();
        },
        isAdmin() {
            const session = this.getSession();
            return session && session.role === 'admin';
        }
    };

    // ===== وضعیت =====
    let editingId = null;
    let pendingDeleteId = null;
    let pendingContractDeleteId = null;
    let editingContractId = null;
    let currentDeal = "sale";
    let currentType = "apartment";
    let currentFilter = "all";
    let currentTab = "listings";
    let isLoggedIn = false;
    let isAdmin = false;
    let previewData = null;
    let restoreData = null;
    let currentStep = 1;
    const totalSteps = 5;
    let autoSaveTimer = null;
    let backupTimer = null;
    let timeoutId = null;
    let contractTimeoutId = null;

    // ===== رندر فایل‌ها =====
    function getFilteredListings() {
        const q = ($("#searchInput") ? $("#searchInput").value : "").trim().toLowerCase();
        let list = DataStore.getListings();

        if (currentFilter !== "all") {
            list = list.filter((l) => l.dealType === currentFilter);
        }

        if (q) {
            list = list.filter((l) => {
                const title = (l.title || "").toLowerCase();
                const code = (l.code || "").toLowerCase();
                return title.includes(q) || code.includes(q);
            });
        }

        list.sort((a, b) => b.createdAt - a.createdAt);
        return list;
    }

    function priceLine(item) {
        if (item.dealType === "rent") {
            return `رهن ${fa(item.deposit)} / اجاره <b>${fa(item.price)}</b> <small>تومان</small>`;
        }
        return `${fa(item.price)} <small>تومان</small>`;
    }

    function imagesHTML(images) {
        if (!images || !images.length) return '<span class="no-img">🏠</span>';
        return `<div class="images-thumb">${images.map(src => `<img src="${escapeHtml(src)}" alt="تصویر" loading="lazy" />`).join('')}</div>`;
    }

    function renderCard(item) {
        const div = document.createElement("div");
        div.className = "listing-card";

        const statusClass = item.status === 'sold' ? 'sold' :
            item.status === 'reserved' ? 'reserved' : 'available';

        div.innerHTML = `
            <div class="card-media">
                ${imagesHTML(item.images)}
                <div class="card-badges">
                    <span class="card-status status-${statusClass}">${STATUS_LABEL[item.status]}</span>
                    <span class="deal-badge">${DEAL_LABEL[item.dealType]}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-code">${item.code} · ${TYPE_LABEL[item.propertyType]}</div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <div class="card-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.region)}</div>
                <div class="card-meta">
                    <span><i class="fas fa-ruler-combined"></i> ${fa(item.area)} متر</span>
                    ${item.rooms ? `<span><i class="fas fa-bed"></i> ${fa(item.rooms)} خواب</span>` : ""}
                </div>
                <div class="card-price">${priceLine(item)}</div>
                <div class="card-actions">
                    <button class="btn-outline" data-action="view" data-id="${item.id}">
                        <i class="fas fa-eye"></i> مشاهده
                    </button>
                    ${isLoggedIn ? `<button class="btn-gold" data-action="edit" data-id="${item.id}">
                        <i class="fas fa-edit"></i> ویرایش
                    </button>` : ''}
                </div>
            </div>
        `;
        return div;
    }

    function renderListings() {
        const grid = $("#listingsGrid");
        if (!grid) return;
        const list = getFilteredListings();
        grid.innerHTML = "";
        if (!list.length) {
            $("#emptyState").classList.remove("hidden");
        } else {
            $("#emptyState").classList.add("hidden");
            list.forEach((item) => grid.appendChild(renderCard(item)));
        }
        const total = DataStore.getListings().length;
        const meta = $("#resultsMeta");
        if (meta) meta.textContent = `${fa(list.length)} فایل از ${fa(total)} فایل ثبت‌شده`;
        updateStats();
    }

    function updateStats() {
        const all = DataStore.getListings();
        const totalEl = $("#statTotal");
        const saleEl = $("#statSale");
        const rentEl = $("#statRent");
        const availEl = $("#statAvailable");
        if (totalEl) totalEl.textContent = fa(all.length);
        if (saleEl) saleEl.textContent = fa(all.filter((l) => l.dealType === "sale").length);
        if (rentEl) rentEl.textContent = fa(all.filter((l) => l.dealType === "rent").length);
        if (availEl) availEl.textContent = fa(all.filter((l) => l.status === "available").length);
    }

    // ===== رندر قراردادها =====
    function renderContracts() {
        const grid = $("#contractsGrid");
        if (!grid) return;
        const q = ($("#contractSearchInput") ? $("#contractSearchInput").value : "").trim().toLowerCase();
        let list = DataStore.getContracts();

        if (q) {
            list = list.filter((c) => {
                const mojer = `${c.mojer_name || ''} ${c.mojer_family || ''}`.toLowerCase();
                const mostaajer = `${c.mostaajer_name || ''} ${c.mostaajer_family || ''}`.toLowerCase();
                const address = (c.property_address || '').toLowerCase();
                return mojer.includes(q) || mostaajer.includes(q) || address.includes(q);
            });
        }

        list.sort((a, b) => b.createdAt - a.createdAt);
        grid.innerHTML = "";

        if (!list.length) {
            $("#contractEmptyState").classList.remove("hidden");
        } else {
            $("#contractEmptyState").classList.add("hidden");
            list.forEach((contract) => {
                const div = document.createElement("div");
                div.className = "contract-card";
                div.innerHTML = `
                    <div class="contract-header">
                        <span class="code"><i class="fas fa-file-signature"></i> ${contract.contract_number || 'شماره ثبت نشده'}</span>
                        <span class="date"><i class="fas fa-calendar"></i> ${new Date(contract.createdAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                    <div class="contract-body">
                        <div class="row"><span class="label">موجر:</span><span class="value">${escapeHtml(contract.mojer_name || '')} ${escapeHtml(contract.mojer_family || '')}</span></div>
                        <div class="row"><span class="label">مستاجر:</span><span class="value">${escapeHtml(contract.mostaajer_name || '')} ${escapeHtml(contract.mostaajer_family || '')}</span></div>
                        <div class="row"><span class="label">آدرس ملک:</span><span class="value" style="font-size:12px;">${escapeHtml(contract.property_address || '')}</span></div>
                        <div class="row"><span class="label">اجاره ماهانه:</span><span class="value">${fa(contract.monthly_rent || 0)} ریال</span></div>
                    </div>
                    <div class="contract-actions">
                        <button class="btn-outline" data-action="viewContract" data-id="${contract.id}">
                            <i class="fas fa-eye"></i> پیش‌نمایش
                        </button>
                        ${isLoggedIn ? `<button class="btn-gold" data-action="editContract" data-id="${contract.id}">
                            <i class="fas fa-edit"></i> ویرایش
                        </button>` : ''}
                        ${isLoggedIn ? `<button class="btn-danger" data-action="deleteContract" data-id="${contract.id}">
                            <i class="fas fa-trash"></i> حذف
                        </button>` : ''}
                    </div>
                `;
                grid.appendChild(div);
            });
        }
        const meta = $("#contractResultsMeta");
        if (meta) meta.textContent = `${fa(list.length)} قرارداد ثبت شده`;
    }

    // ===== رندر کاربران =====
    function renderUserList() {
        const container = $("#userList");
        if (!container) return;
        const users = DataStore.getUsers();
        container.innerHTML = users.map(u => `
            <div class="user-item">
                <div class="user-info">
                    <strong>${escapeHtml(u.displayName)}</strong>
                    <span>@${escapeHtml(u.username)}</span>
                    <span class="role-badge ${u.role === 'admin' ? 'admin' : ''}">${u.role === 'admin' ? 'مدیر' : 'مشاور'}</span>
                </div>
                ${isAdmin && u.username !== 'admin' ? `<button class="btn-danger" style="padding:4px 12px;font-size:11px;min-height:30px;" data-user="${escapeHtml(u.username)}">
                    <i class="fas fa-times"></i>
                </button>` : ''}
                ${u.username === 'admin' ? '<span style="font-size:11px;color:var(--gold);font-weight:600;"><i class="fas fa-crown"></i> مدیر اصلی</span>' : ''}
            </div>
        `).join('');

        container.querySelectorAll('button[data-user]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.user;
                const currentUsers = DataStore.getUsers();
                if (currentUsers.length <= 1) { toast('حداقل یک کاربر باید باقی بماند.'); return; }
                await DataStore.deleteUser(username);
                renderUserList();
                toast('کاربر حذف شد.', 'success');
            });
        });
    }

    // ===== وضعیت گیت‌هاب =====
    function updateGitHubStatus() {
        const statusEl = $("#githubStatus");
        if (!statusEl) return;
        const hasToken = GITHUB_CONFIG.token && GITHUB_CONFIG.token.length > 10;
        statusEl.innerHTML = `
            <span class="status-dot ${hasToken ? 'online' : 'offline'}"></span>
            <span>${hasToken ? `✅ متصل به گیت‌هاب (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo})` : '❌ توکن گیت‌هاب تنظیم نشده است'}</span>
        `;
    }

    // ===== فرم فایل =====
    function setSeg(container, value) {
        $$(`#${container} button`).forEach((b) => b.classList.toggle("active", b.dataset.val === value));
    }

    function toggleDealFields() {
        const isRent = currentDeal === "rent";
        const label = $("#priceLabel");
        const deposit = $("#depositField");
        if (label) label.textContent = isRent ? "اجاره ماهانه (تومان)" : "قیمت (تومان)";
        if (deposit) deposit.style.display = isRent ? "block" : "none";
    }

    function toggleTypeFields() {
        const rooms = $("#roomsField");
        if (rooms) rooms.style.display = currentType === "land" ? "none" : "block";
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function setupImagePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview) return;
        const fileUpload = input.closest('.file-upload');
        input.addEventListener("change", function() {
            preview.innerHTML = "";
            const file = this.files[0];
            if (!file) return;
            if (fileUpload) {
                const span = fileUpload.querySelector('span');
                if (span) span.textContent = file.name;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.createElement("img");
                img.src = ev.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    function openListingModal(item) {
        if (!isLoggedIn) { toast('لطفاً ابتدا وارد شوید.'); return; }
        editingId = item ? item.id : null;
        const title = $("#listingModalTitle");
        if (title) {
            title.innerHTML = item ?
                '<i class="fas fa-edit"></i> ویرایش فایل' :
                '<i class="fas fa-plus-circle"></i> ثبت فایل جدید';
        }
        currentDeal = item ? item.dealType : "sale";
        currentType = item ? item.propertyType : "apartment";
        setSeg("dealSeg", currentDeal);
        setSeg("typeSeg", currentType);
        toggleDealFields();
        toggleTypeFields();

        const fTitle = $("#fTitle");
        const fPrice = $("#fPrice");
        const fDeposit = $("#fDeposit");
        const fArea = $("#fArea");
        const fRooms = $("#fRooms");
        const fRegion = $("#fRegion");
        const fAddress = $("#fAddress");
        const fStatus = $("#fStatus");
        const fPhone = $("#fPhone");
        const fDesc = $("#fDesc");
        const preview1 = $("#preview1");
        const preview2 = $("#preview2");
        const file1 = $("#fImage1");
        const file2 = $("#fImage2");
        const upload1 = document.querySelector('#fileUpload1 span');
        const upload2 = document.querySelector('#fileUpload2 span');

        if (fTitle) fTitle.value = item ? item.title : "";
        if (fPrice) fPrice.value = item ? item.price : "";
        if (fDeposit) fDeposit.value = item ? item.deposit || "" : "";
        if (fArea) fArea.value = item ? item.area : "";
        if (fRooms) fRooms.value = item ? item.rooms || "" : "";
        if (fRegion) fRegion.value = item ? item.region : "";
        if (fAddress) fAddress.value = item ? item.address || "" : "";
        if (fStatus) fStatus.value = item ? item.status : "available";
        if (fPhone) fPhone.value = item ? item.phone || "" : "";
        if (fDesc) fDesc.value = item ? item.desc || "" : "";

        if (preview1) preview1.innerHTML = "";
        if (preview2) preview2.innerHTML = "";
        if (file1) file1.value = "";
        if (file2) file2.value = "";
        if (upload1) upload1.textContent = 'انتخاب تصویر ۱';
        if (upload2) upload2.textContent = 'انتخاب تصویر ۲';

        if (item && item.images && item.images.length) {
            if (item.images[0] && preview1) {
                const img = document.createElement("img");
                img.src = item.images[0];
                preview1.appendChild(img);
                if (upload1) upload1.textContent = 'تصویر انتخاب شد';
            }
            if (item.images[1] && preview2) {
                const img = document.createElement("img");
                img.src = item.images[1];
                preview2.appendChild(img);
                if (upload2) upload2.textContent = 'تصویر انتخاب شد';
            }
        }

        const overlay = $("#listingModalOverlay");
        if (overlay) overlay.classList.remove("hidden");
        setTimeout(() => { if (fTitle) fTitle.focus(); }, 50);
    }

    function closeListingModal() {
        const overlay = $("#listingModalOverlay");
        if (overlay) overlay.classList.add("hidden");
        editingId = null;
    }

    async function handleListingSubmit(e) {
        e.preventDefault();
        if (!isLoggedIn) { toast('لطفاً وارد شوید.'); return; }

        const file1 = document.getElementById("fImage1");
        const file2 = document.getElementById("fImage2");
        const fTitle = $("#fTitle");
        const fPrice = $("#fPrice");
        const fDeposit = $("#fDeposit");
        const fArea = $("#fArea");
        const fRooms = $("#fRooms");
        const fRegion = $("#fRegion");
        const fAddress = $("#fAddress");
        const fStatus = $("#fStatus");
        const fPhone = $("#fPhone");
        const fDesc = $("#fDesc");

        let images = [];

        if (file1 && file1.files && file1.files[0]) {
            const data = await readFileAsDataURL(file1.files[0]);
            images.push(data);
        }
        if (file2 && file2.files && file2.files[0]) {
            const data = await readFileAsDataURL(file2.files[0]);
            images.push(data);
        }

        if (editingId) {
            const existing = DataStore.getListings();
            const found = existing.find(l => l.id === editingId);
            if (found && found.images) {
                if (!file1?.files?.length && found.images[0]) images[0] = found.images[0];
                if (!file2?.files?.length && found.images[1]) images[1] = found.images[1];
                if (!file1?.files?.length && !file2?.files?.length) images = found.images;
            }
        }

        const data = {
            dealType: currentDeal,
            propertyType: currentType,
            title: fTitle ? fTitle.value.trim() : "",
            price: Number(fPrice ? fPrice.value : 0) || 0,
            deposit: Number(fDeposit ? fDeposit.value : 0) || 0,
            area: Number(fArea ? fArea.value : 0) || 0,
            rooms: Number(fRooms ? fRooms.value : 0) || 0,
            region: fRegion ? fRegion.value.trim() : "",
            address: fAddress ? fAddress.value.trim() : "",
            status: fStatus ? fStatus.value : "available",
            phone: fPhone ? fPhone.value.trim() : "",
            images: images,
            desc: fDesc ? fDesc.value.trim() : "",
        };

        if (!data.title || !data.region || !data.price || !data.area || !data.phone) {
            toast("لطفاً فیلدهای ستاره‌دار را کامل کنید.", 'warning');
            return;
        }

        try {
            if (editingId) {
                await DataStore.updateListing(editingId, data);
                toast("فایل ویرایش شد.", 'success');
            } else {
                await DataStore.addListing(data);
                toast("فایل جدید ثبت شد.", 'success');
            }
            closeListingModal();
            renderListings();
        } catch (error) {
            toast("خطا در ذخیره فایل: " + error.message, 'danger');
        }
    }

    // ===== فرم قرارداد =====
    const contractFields = [
        'mojer_name', 'mojer_family', 'mojer_father', 'mojer_id', 'mojer_issue', 'mojer_national', 'mojer_phone', 'mojer_address',
        'mostaajer_name', 'mostaajer_family', 'mostaajer_father', 'mostaajer_id', 'mostaajer_issue', 'mostaajer_national', 'mostaajer_phone', 'mostaajer_address',
        'share', 'property_address', 'plaque', 'floor', 'unit', 'postal_code', 'reg_plaque_main', 'reg_plaque_sub',
        'reg_section', 'area', 'deed_serial', 'deed_page', 'deed_book', 'property_reg_no', 'rooms', 'parking_no',
        'storage_no', 'storage_area', 'phone_lines', 'phone_number', 'usage',
        'start_day', 'start_month', 'start_year', 'end_day', 'end_month', 'end_year',
        'contract_day', 'contract_month', 'contract_year', 'delivery_day', 'delivery_month', 'delivery_year',
        'monthly_rent', 'loan_amount', 'loan_words',
        'tenant_count', 'usage_type',
        'daily_penalty', 'delay_penalty',
        'city', 'commission_mojer', 'commission_mostaajer',
        'notes', 'agent_name', 'contract_number', 'agent_id', 'hologram',
        'shahid1', 'shahid2', 'expert_name'
    ];

    function getContractFieldValues() {
        const data = {};
        contractFields.forEach(f => {
            const el = document.getElementById(`c_${f}`);
            data[f] = el ? el.value : '';
        });
        return data;
    }

    function setContractFieldValues(data) {
        contractFields.forEach(f => {
            const el = document.getElementById(`c_${f}`);
            if (el && data[f] !== undefined) el.value = data[f] || '';
        });
    }

    function saveDraft() {
        const data = getContractFieldValues();
        data._timestamp = Date.now();
        localStorage.setItem(LS_CONTRACT_DRAFT, JSON.stringify(data));
    }

    function loadDraft() {
        try {
            const data = localStorage.getItem(LS_CONTRACT_DRAFT);
            if (data) {
                const parsed = JSON.parse(data);
                let hasData = false;
                contractFields.forEach(f => {
                    if (parsed[f] && parsed[f].trim()) hasData = true;
                });
                if (hasData) {
                    setContractFieldValues(parsed);
                    toast('پیش‌نویس قبلی بارگذاری شد.', 'success');
                    return true;
                }
            }
        } catch {}
        return false;
    }

    function clearDraft() {
        localStorage.removeItem(LS_CONTRACT_DRAFT);
    }

    function goToStep(step) {
        if (step < 1) step = 1;
        if (step > totalSteps) step = totalSteps;
        currentStep = step;

        $$('.step-content').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.step) === step);
        });

        $$('.step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'done');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('done');
        });

        const prevBtn = $("#prevStepBtn");
        const nextBtn = $("#nextStepBtn");
        if (prevBtn) prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';
        if (nextBtn) nextBtn.innerHTML = step < totalSteps ? 'بعدی <i class="fas fa-arrow-left"></i>' : '<i class="fas fa-check"></i> تکمیل';

        const modal = document.querySelector('#contractModalOverlay .modal');
        if (modal) modal.scrollTop = 0;
    }

    function openContractModal(contract) {
        if (!isLoggedIn) { toast('لطفاً ابتدا وارد شوید.'); return; }
        editingContractId = contract ? contract.id : null;
        const title = $("#contractModalTitle");
        if (title) {
            title.innerHTML = contract ?
                '<i class="fas fa-edit"></i> ویرایش قرارداد اجاره' :
                '<i class="fas fa-file-signature"></i> ثبت قرارداد اجاره جدید';
        }

        if (contract) {
            setContractFieldValues(contract);
            clearDraft();
        } else {
            const hasDraft = loadDraft();
            if (!hasDraft) {
                contractFields.forEach(f => {
                    const el = document.getElementById(`c_${f}`);
                    if (el) el.value = '';
                });
            }
        }

        goToStep(1);
        const overlay = $("#contractModalOverlay");
        if (overlay) overlay.classList.remove("hidden");
        setTimeout(() => {
            const el = document.getElementById('c_mojer_name');
            if (el) el.focus();
        }, 100);
    }

    function closeContractModal() {
        const overlay = $("#contractModalOverlay");
        if (overlay) overlay.classList.add("hidden");
        editingContractId = null;
        saveDraft();
    }

    async function handleContractSubmit(e) {
        e.preventDefault();
        if (!isLoggedIn) { toast('لطفاً وارد شوید.'); return; }

        const data = getContractFieldValues();
        if (!data.mojer_name || !data.mojer_family || !data.mostaajer_name || !data.mostaajer_family) {
            toast('لطفاً نام و نام خانوادگی موجر و مستاجر را وارد کنید.', 'warning');
            goToStep(1);
            return;
        }
        if (!data.property_address) {
            toast('لطفاً آدرس ملک را وارد کنید.', 'warning');
            goToStep(2);
            return;
        }

        try {
            if (editingContractId) {
                await DataStore.updateContract(editingContractId, data);
                toast('قرارداد با موفقیت ویرایش شد.', 'success');
            } else {
                await DataStore.addContract(data);
                toast('قرارداد جدید با موفقیت ثبت شد.', 'success');
            }
            clearDraft();
            closeContractModal();
            renderContracts();
        } catch (error) {
            toast("خطا در ذخیره قرارداد: " + error.message, 'danger');
        }
    }

    // ===== ساخت سند قرارداد =====
    function buildContractHTML(data) {
        const d = data || {};
        const startDate = `${d.start_year || ''}/${d.start_month || ''}/${d.start_day || ''}`;
        const endDate = `${d.end_year || ''}/${d.end_month || ''}/${d.end_day || ''}`;
        const contractDate = `${d.contract_year || ''}/${d.contract_month || ''}/${d.contract_day || ''}`;
        const deliveryDate = `${d.delivery_year || ''}/${d.delivery_month || ''}/${d.delivery_day || ''}`;

        return `
        <div class="contract-page">
            <div class="contract-header">
                <div class="contract-title-main">سامانه ثبت معاملات املاک و مستغلات کشور</div>
                <div class="contract-title-sub">اجاره نامه</div>
                <div class="contract-meta">
                    <span>تاریخ ثبت قرارداد: ${contractDate}</span>
                    <span>شماره ثبت قرارداد: ${d.contract_number || ''}</span>
                    <span>شناسه صنفی مشاور املاک: ${d.agent_id || ''}</span>
                    <span>شماره سریال هولوگرام: ${d.hologram || ''}</span>
                </div>
            </div>

            <div class="contract-section">
                <div class="section-title">ماده ۱ : طرفین قرارداد</div>
                <div class="party-block">
                    <div class="party-label">موجر/موجرین:</div>
                    <div class="field-row"><span class="field-label">نام و نام خانوادگی:</span><span class="field-value">${d.mojer_name || ''} ${d.mojer_family || ''}</span></div>
                    <div class="field-row"><span class="field-label">نام پدر:</span><span class="field-value">${d.mojer_father || ''}</span> | <span class="field-label">کد ملی:</span><span class="field-value">${d.mojer_national || ''}</span></div>
                    <div class="field-row"><span class="field-label">تلفن:</span><span class="field-value">${d.mojer_phone || ''}</span> | <span class="field-label">آدرس:</span><span class="field-value">${d.mojer_address || ''}</span></div>
                </div>
                <div class="party-block" style="margin-top:8px;">
                    <div class="party-label">مستاجر/مستاجرین:</div>
                    <div class="field-row"><span class="field-label">نام و نام خانوادگی:</span><span class="field-value">${d.mostaajer_name || ''} ${d.mostaajer_family || ''}</span></div>
                    <div class="field-row"><span class="field-label">نام پدر:</span><span class="field-value">${d.mostaajer_father || ''}</span> | <span class="field-label">کد ملی:</span><span class="field-value">${d.mostaajer_national || ''}</span></div>
                    <div class="field-row"><span class="field-label">تلفن:</span><span class="field-value">${d.mostaajer_phone || ''}</span> | <span class="field-label">آدرس:</span><span class="field-value">${d.mostaajer_address || ''}</span></div>
                </div>
            </div>

            <div class="contract-section">
                <div class="section-title">ماده ۲ : موضوع قرارداد و مشخصات مورد اجاره</div>
                <div class="field-row"><span class="field-label">آدرس ملک:</span><span class="field-value">${d.property_address || ''}</span></div>
                <div class="field-row">
                    <span class="field-label">پلاک:</span><span class="field-value">${d.plaque || ''}</span> |
                    <span class="field-label">طبقه:</span><span class="field-value">${d.floor || ''}</span> |
                    <span class="field-label">واحد:</span><span class="field-value">${d.unit || ''}</span> |
                    <span class="field-label">مساحت:</span><span class="field-value">${d.area || ''} متر مربع</span>
                </div>
            </div>

            <div class="contract-section">
                <div class="section-title">ماده ۳ : مدت اجاره</div>
                <div class="field-row">
                    <span>از تاریخ <b>${startDate}</b> الی <b>${endDate}</b> به مدت یک سال شمسی.</span>
                </div>
            </div>

            <div class="contract-section">
                <div class="section-title">ماده ۴ : اجاره‌بها و نحوه پرداخت</div>
                <div class="field-row"><span class="field-label">اجاره ماهانه:</span><span class="field-value">${Number(d.monthly_rent || 0).toLocaleString()} ریال</span></div>
                <div class="field-row"><span class="field-label">مبلغ قرض‌الحسنه (رهن):</span><span class="field-value">${Number(d.loan_amount || 0).toLocaleString()} ریال (${d.loan_words || ''})</span></div>
            </div>

            ${d.notes ? `
            <div class="contract-section">
                <div class="section-title">توضیحات و شروط اختصاصی:</div>
                <div class="notes-content">${escapeHtml(d.notes)}</div>
            </div>
            ` : ''}

            <div class="signature-section">
                <div class="sign-block"><div class="sign-label">امضاء موجر</div><div class="sign-line"></div></div>
                <div class="sign-block"><div class="sign-label">امضاء مستاجر</div><div class="sign-line"></div></div>
                <div class="sign-block"><div class="sign-label">مهر و امضاء مشاور املاک</div><div class="sign-line"></div></div>
            </div>
        </div>
        `;
    }

    function generateWordHTML(data) {
        return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="UTF-8"><title>قرارداد اجاره</title></head>
        <body style="font-family:Tahoma, sans-serif; direction:rtl; text-align:right;">
            ${buildContractHTML(data)}
        </body>
        </html>
        `;
    }

    function downloadWord(data) {
        const htmlContent = generateWordHTML(data);
        const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `قرارداد_اجاره_${data.mojer_family || ''}_${data.mostaajer_family || ''}.doc`;
        a.click();
        URL.revokeObjectURL(url);
        toast('فایل Word با موفقیت دانلود شد.', 'success');
    }

    // ===== پیش‌نمایش و دانلود =====
    function showPreview(data) {
        previewData = data;
        const content = $("#previewContent");
        if (content) content.innerHTML = buildContractHTML(data);
        const overlay = $("#previewModalOverlay");
        if (overlay) overlay.classList.remove("hidden");
    }

    function closePreview() {
        const overlay = $("#previewModalOverlay");
        if (overlay) overlay.classList.add("hidden");
        previewData = null;
    }

    async function downloadPDF() {
        if (!previewData) return;
        toast('در حال تولید PDF...');
        try {
            const content = $("#previewContent");
            if (!content) return;
            const canvas = await html2canvas(content, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`قرارداد_اجاره_${previewData.mojer_family || ''}_${previewData.mostaajer_family || ''}.pdf`);
            toast('PDF با موفقیت دانلود شد.', 'success');
        } catch (err) {
            console.error(err);
            toast('خطا در تولید PDF.', 'danger');
        }
    }

    // ===== پشتیبان‌گیری =====
    async function performAutoBackup() {
        try {
            const result = await GitHubAPI.createFullBackup();
            if (result.success) console.log('✅ پشتیبان در گیت‌هاب ذخیره شد');
        } catch (error) {
            console.error('❌ خطا در پشتیبان‌گیری خودکار:', error);
        }
    }

    async function downloadFullBackup() {
        try {
            toast('در حال ایجاد پشتیبان...');
            await GitHubAPI.createFullBackup();
            const data = {
                listings: DataStore.getListings(),
                contracts: DataStore.getContracts(),
                users: DataStore.getUsers()
            };
            const backupData = { version: "1.0", timestamp: Date.now(), data };
            const json = JSON.stringify(backupData, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ekhlasi_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast('پشتیبان با موفقیت دانلود شد.', 'success');
        } catch (error) {
            toast('خطا در ایجاد پشتیبان.', 'danger');
        }
    }

    async function showRestorePreview(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (!backup.data || !backup.data.listings || !backup.data.contracts || !backup.data.users) {
                    toast('فایل پشتیبان معتبر نیست.', 'danger');
                    return;
                }
                restoreData = backup;
                const preview = $("#restorePreview");
                if (preview) {
                    preview.innerHTML = `
                        <div>📋 فایل‌ها: ${backup.data.listings.length} عدد</div>
                        <div>📄 قراردادها: ${backup.data.contracts.length} عدد</div>
                        <div>👤 کاربران: ${backup.data.users.length} نفر</div>
                    `;
                }
                $("#restoreConfirmModal").classList.remove("hidden");
            } catch (err) {
                toast('فایل پشتیبان معتبر نیست.', 'danger');
            }
        };
        reader.readAsText(file);
    }

    async function performRestore() {
        if (!restoreData) return;
        try {
            await GitHubAPI.saveListings(restoreData.data.listings);
            await GitHubAPI.saveContracts(restoreData.data.contracts);
            await GitHubAPI.saveUsers(restoreData.data.users);
            await DataStore.loadAll();
            renderListings();
            renderContracts();
            renderUserList();
            updateGitHubStatus();
            $("#restoreConfirmModal").classList.add("hidden");
            restoreData = null;
            toast('اطلاعات با موفقیت بازیابی شد.', 'success');
        } catch (err) {
            toast('خطا در بازیابی اطلاعات.', 'danger');
        }
    }

    // ===== جزئیات فایل =====
    let detailId = null;

    function openDetail(id) {
        const item = DataStore.getListings().find((l) => l.id === id);
        if (!item) return;
        detailId = id;
        const body = $("#detailBody");
        if (body) body.innerHTML = buildDetailHTML(item);
        $("#detailModalOverlay").classList.remove("hidden");
    }

    function closeDetail() {
        $("#detailModalOverlay").classList.add("hidden");
        detailId = null;
    }

    function buildDetailHTML(item) {
        return `
            <h2>${escapeHtml(item.title)}</h2>
            <p><b>کد فایل:</b> ${item.code}</p>
            <p><b>قیمت/اجاره:</b> ${priceLine(item)}</p>
            <p><b>متراژ:</b> ${fa(item.area)} متر</p>
            <p><b>منطقه:</b> ${escapeHtml(item.region)}</p>
            <p><b>تلفن تماس:</b> ${escapeHtml(item.phone)}</p>
            <p><b>توضیحات:</b> ${escapeHtml(item.desc || 'ندارد')}</p>
        `;
    }

    function askDelete(id) {
        pendingDeleteId = id;
        $("#confirmModalOverlay").classList.remove("hidden");
    }

    function askContractDelete(id) {
        pendingContractDeleteId = id;
        $("#confirmContractModalOverlay").classList.remove("hidden");
    }

    // ===== احراز هویت در رابط کاربری =====
    function updateUIForAuth() {
        isLoggedIn = Auth.isLoggedIn();
        isAdmin = Auth.isAdmin();
        const session = Auth.getSession();

        const userBadge = $("#userBadge");
        const loginBtn = $("#btnLoginTrigger");
        const logoutBtn = $("#btnLogout");
        const newListingBtn = $("#btnNewListing");
        const newContractBtn = $("#btnNewContract");
        const newContractTopBtn = $("#btnNewContractTop");
        const emptyNewBtn = $("#btnEmptyNew");
        const emptyContractBtn = $("#btnEmptyContract");
        const contractsTab = $("#contractsTab");
        const usersTab = $("#usersTab");
        const settingsTab = $("#settingsTab");

        if (newListingBtn) newListingBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
        if (newContractBtn) newContractBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
        if (newContractTopBtn) newContractTopBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
        if (emptyNewBtn) emptyNewBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
        if (emptyContractBtn) emptyContractBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';

        if (contractsTab) contractsTab.style.display = isLoggedIn ? 'inline-flex' : 'none';
        if (usersTab) usersTab.style.display = (isLoggedIn && isAdmin) ? 'inline-flex' : 'none';
        if (settingsTab) settingsTab.style.display = (isLoggedIn && isAdmin) ? 'inline-flex' : 'none';

        if (userBadge) {
            if (isLoggedIn && session) {
                userBadge.style.display = 'flex';
                const nameEl = $("#agentName");
                if (nameEl) nameEl.textContent = session.displayName || session.username;
            } else {
                userBadge.style.display = 'none';
            }
        }

        if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';

        if (currentTab === 'users' && !isAdmin) switchTab('listings');
    }

    function showLoginModal() {
        $("#loginOverlay").classList.remove("hidden");
    }

    function hideLoginModal() {
        $("#loginOverlay").classList.add("hidden");
    }

    function switchTab(tab) {
        currentTab = tab;
        $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

        $("#listingsSection").style.display = tab === 'listings' ? 'block' : 'none';
        $("#contractsSection").style.display = tab === 'contracts' ? 'block' : 'none';
        $("#usersSection").style.display = tab === 'users' ? 'block' : 'none';
        $("#settingsSection").style.display = tab === 'settings' ? 'block' : 'none';

        if (tab === 'contracts') renderContracts();
        if (tab === 'users') renderUserList();
    }

    // ===== اتصال رویدادها =====
    function bindEvents() {
        $("#loginForm")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const u = $("#username").value.trim();
            const p = $("#password").value;
            const user = await Auth.login(u, p);
            if (!user) {
                $("#loginError").classList.remove("hidden");
                return;
            }
            $("#loginError").classList.add("hidden");
            Auth.setSession(user, $("#rememberMe").checked);
            hideLoginModal();
            updateUIForAuth();
            renderListings();
            toast(`خوش آمدید ${user.displayName}`, 'success');
        });

        $("#btnLoginTrigger")?.addEventListener("click", showLoginModal);
        $("#btnLogout")?.addEventListener("click", () => {
            Auth.logout();
            updateUIForAuth();
            renderListings();
            toast("خروج انجام شد.");
        });

        $$('.tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

        $("#searchInput")?.addEventListener("input", () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(renderListings, 300);
        });

        $("#contractSearchInput")?.addEventListener("input", () => {
            clearTimeout(contractTimeoutId);
            contractTimeoutId = setTimeout(renderContracts, 300);
        });

        $$('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.deal;
                renderListings();
            });
        });

        $("#btnNewListing")?.addEventListener("click", () => openListingModal(null));
        $("#btnEmptyNew")?.addEventListener("click", () => openListingModal(null));
        $("#btnNewContract")?.addEventListener("click", () => openContractModal(null));
        $("#btnNewContractTop")?.addEventListener("click", () => openContractModal(null));
        $("#btnEmptyContract")?.addEventListener("click", () => openContractModal(null));

        $("#closeListingModal")?.addEventListener("click", closeListingModal);
        $("#cancelListingModal")?.addEventListener("click", closeListingModal);
        $("#listingForm")?.addEventListener("submit", handleListingSubmit);

        $("#nextStepBtn")?.addEventListener("click", () => {
            if (currentStep < totalSteps) goToStep(currentStep + 1);
            else $("#saveContractBtn")?.click();
        });

        $("#prevStepBtn")?.addEventListener("click", () => {
            if (currentStep > 1) goToStep(currentStep - 1);
        });

        $$('.step').forEach(el => {
            el.addEventListener('click', () => {
                const step = parseInt(el.dataset.step);
                if (step <= currentStep) goToStep(step);
            });
        });

        contractFields.forEach(f => {
            document.getElementById(`c_${f}`)?.addEventListener('input', () => {
                clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(saveDraft, 1000);
            });
        });

        $("#closeContractModal")?.addEventListener("click", closeContractModal);
        $("#cancelContractModal")?.addEventListener("click", closeContractModal);
        $("#contractForm")?.addEventListener("submit", handleContractSubmit);

        $("#previewContractBtn")?.addEventListener("click", () => {
            const data = getContractFieldValues();
            if (!data.mojer_name || !data.mostaajer_name || !data.property_address) {
                toast('لطفاً نام طرفین و آدرس ملک را وارد کنید.', 'warning');
                return;
            }
            showPreview(data);
        });

        $("#closePreviewModal")?.addEventListener("click", closePreview);
        $("#closePreviewModal2")?.addEventListener("click", closePreview);
        $("#downloadPDFBtn")?.addEventListener("click", downloadPDF);

        // افزودن دکمه Word به مودال پیش‌نمایش
        const wordBtn = document.createElement('button');
        wordBtn.className = 'btn-gold';
        wordBtn.innerHTML = '<i class="fas fa-file-word"></i> دانلود Word';
        wordBtn.addEventListener('click', () => previewData && downloadWord(previewData));
        document.querySelector('#previewModalOverlay .modal-footer')?.prepend(wordBtn);

        $$("#dealSeg button").forEach((b) => b.addEventListener("click", () => {
            currentDeal = b.dataset.val;
            setSeg("dealSeg", currentDeal);
            toggleDealFields();
        }));

        $$("#typeSeg button").forEach((b) => b.addEventListener("click", () => {
            currentType = b.dataset.val;
            setSeg("typeSeg", currentType);
            toggleTypeFields();
        }));

        setupImagePreview("fImage1", "preview1");
        setupImagePreview("fImage2", "preview2");

        $("#listingsGrid")?.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === "view") openDetail(id);
            else if (action === "edit") openListingModal(DataStore.getListings().find((l) => l.id === id));
        });

        $("#contractsGrid")?.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === "viewContract") showPreview(DataStore.getContracts().find(c => c.id === id));
            else if (action === "editContract") openContractModal(DataStore.getContracts().find(c => c.id === id));
            else if (action === "deleteContract") askContractDelete(id);
        });

        $("#closeDetailModal")?.addEventListener("click", closeDetail);
        $("#closeDetailModal2")?.addEventListener("click", closeDetail);
        $("#detailEditBtn")?.addEventListener("click", () => {
            const item = DataStore.getListings().find((l) => l.id === detailId);
            closeDetail();
            openListingModal(item);
        });
        $("#detailDeleteBtn")?.addEventListener("click", () => {
            const id = detailId;
            closeDetail();
            askDelete(id);
        });

        $("#confirmDeleteBtn")?.addEventListener("click", async () => {
            if (pendingDeleteId) {
                await DataStore.deleteListing(pendingDeleteId);
                toast("فایل حذف شد.", 'success');
            }
            $("#confirmModalOverlay").classList.add("hidden");
            renderListings();
        });
        $("#cancelDeleteBtn")?.addEventListener("click", () => $("#confirmModalOverlay").classList.add("hidden"));

        $("#confirmContractDeleteBtn")?.addEventListener("click", async () => {
            if (pendingContractDeleteId) {
                await DataStore.deleteContract(pendingContractDeleteId);
                toast("قرارداد حذف شد.", 'success');
            }
            $("#confirmContractModalOverlay").classList.add("hidden");
            renderContracts();
        });
        $("#cancelContractDeleteBtn")?.addEventListener("click", () => $("#confirmContractModalOverlay").classList.add("hidden"));

        $("#btnFullBackup")?.addEventListener("click", downloadFullBackup);
        $("#btnRestoreTrigger")?.addEventListener("click", () => $("#btnRestore")?.click());
        $("#btnRestore")?.addEventListener("change", (e) => {
            if (e.target.files[0]) showRestorePreview(e.target.files[0]);
        });
        $("#confirmRestoreBtn")?.addEventListener("click", performRestore);
        $("#cancelRestoreBtn")?.addEventListener("click", () => $("#restoreConfirmModal").classList.add("hidden"));

        $$(".modal-overlay").forEach((ov) => {
            ov.addEventListener("click", (e) => {
                if (e.target === ov) ov.classList.add("hidden");
            });
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") $$(".modal-overlay").forEach((ov) => ov.classList.add("hidden"));
        });

        $("#btnAddUser")?.addEventListener("click", async () => {
            if (!isAdmin) return;
            const u = $("#newUsername").value.trim();
            const p = $("#newPassword").value.trim();
            if (!u || !p) { toast('نام کاربری و رمز را وارد کنید.', 'warning'); return; }
            await DataStore.addUser({ username: u, password: p, displayName: u, role: 'agent' });
            $("#newUsername").value = "";
            $("#newPassword").value = "";
            renderUserList();
            toast('کاربر افزوده شد.', 'success');
        });
    }

    // ===== شروع =====
    async function init() {
        const loaded = await DataStore.loadAll();
        if (!loaded) toast('استفاده از داده‌های محلی به دلیل خطا در گیت‌هاب.', 'warning');

        bindEvents();
        updateUIForAuth();
        renderListings();
        renderContracts();
        renderUserList();
        updateGitHubStatus();

        setTimeout(performAutoBackup, 5000);
        backupTimer = setInterval(performAutoBackup, BACKUP_INTERVAL);
    }

    document.addEventListener("DOMContentLoaded", init);
})();