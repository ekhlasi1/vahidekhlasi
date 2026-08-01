/**
 * ============================================================
 * گروه مشاورین املاک اخلاصی
 * سیستم مدیریت فایل‌های ملکی و قراردادهای اجاره
 * نسخه حرفه‌ای با پشتیبان‌گیری گیت‌هاب
 * ============================================================
 */

(function() {
    "use strict";

    // ===== تنظیمات گیت‌هاب =====
    const GITHUB_CONFIG = {
        token: "",
        owner: "",
        repo: "",
        backupPath: "backups/backup-latest.json",
        listingsPath: "data/listings.json",
        contractsPath: "data/contracts.json",
        usersPath: "data/users.json"
    };

    // ===== کلیدهای ذخیره‌سازی =====
    const LS_SESSION = "ekhlasi_session_v1";
    const LS_REMEMBER = "ekhlasi_remember_v1";
    const LS_BACKUP = "ekhlasi_listings_backup";
    const LS_CONTRACTS = "ekhlasi_contracts_v1";
    const LS_USERS = "ekhlasi_users_v1";
    const LS_LAST_BACKUP = "ekhlasi_last_backup_time";
    const LS_CONTRACT_DRAFT = "ekhlasi_contract_draft_v1";
    const LS_GITHUB_CONFIG = "ekhlasi_github_config_v1";

    // ===== فاصله پشتیبان‌گیری (۳ ساعت) =====
    const BACKUP_INTERVAL = 10800000;

    // ===== کاربران پیش‌فرض =====
    let USERS = [
        { username: "admin", password: "ekhlasi1404", displayName: "مدیر سامانه", role: "admin" },
        { username: "reza", password: "reza1404", displayName: "رضا احمدی", role: "agent" },
    ];

    // ===== بارگذاری تنظیمات =====
    function loadUsers() {
        try {
            const saved = localStorage.getItem(LS_USERS);
            if (saved) USERS = JSON.parse(saved);
        } catch {}
    }

    function saveUsers() {
        localStorage.setItem(LS_USERS, JSON.stringify(USERS));
    }

    function loadGitHubConfig() {
        try {
            const saved = localStorage.getItem(LS_GITHUB_CONFIG);
            if (saved) {
                const config = JSON.parse(saved);
                if (config.token && config.owner && config.repo) {
                    GITHUB_CONFIG.token = config.token;
                    GITHUB_CONFIG.owner = config.owner;
                    GITHUB_CONFIG.repo = config.repo;
                    return true;
                }
            }
        } catch {}
        return false;
    }

    function saveGitHubConfig(token, owner, repo) {
        GITHUB_CONFIG.token = token;
        GITHUB_CONFIG.owner = owner;
        GITHUB_CONFIG.repo = repo;
        localStorage.setItem(LS_GITHUB_CONFIG, JSON.stringify({ token, owner, repo }));
        updateGitHubStatus();
        toast('تنظیمات گیت‌هاب ذخیره شد.', 'success');
    }

    loadUsers();
    loadGitHubConfig();

    // ===== ابزارها =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const fa = (n) => Number(n || 0).toLocaleString("fa-IR");

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function toast(msg, type) {
        const container = $("#toastContainer");
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

    const TYPE_LABEL = { apartment: "آپارتمان", villa: "ویلا", land: "زمین" };
    const DEAL_LABEL = { sale: "فروش", rent: "اجاره" };
    const STATUS_LABEL = { available: "موجود", reserved: "بیعانه‌شده", sold: "فروخته/اجاره‌شده" };

    // ===== داده‌های پیش‌فرض =====
    function getDefaultListings() {
        return [{
            id: uid(),
            code: "EKH-1001",
            dealType: "sale",
            propertyType: "apartment",
            title: "آپارتمان نوساز سه‌خوابه، نمای رومی",
            region: "سعادت‌آباد",
            address: "خیابان سرو غربی، پلاک ۱۴",
            price: 6800000000,
            deposit: 0,
            area: 145,
            rooms: 3,
            status: "available",
            phone: "09121234567",
            images: [],
            desc: "طبقه ۴، دو کله، پارکینگ مسقف، آسانسور، نگهبانی ۲۴ ساعته.",
            createdAt: Date.now() - 86400000 * 2,
        }, {
            id: uid(),
            code: "EKH-1002",
            dealType: "rent",
            propertyType: "apartment",
            title: "اجاره واحد دو خوابه بازسازی‌شده",
            region: "پونک",
            address: "بلوار اباذر، خیابان گلستان",
            price: 400000000,
            deposit: 12000000,
            area: 92,
            rooms: 2,
            status: "available",
            phone: "09351234567",
            images: [],
            desc: "کابینت و کفپوش نو، فول امکانات، مناسب خانواده.",
            createdAt: Date.now() - 86400000 * 5,
        }, {
            id: uid(),
            code: "EKH-1003",
            dealType: "sale",
            propertyType: "villa",
            title: "ویلای دوبلکس با استخر",
            region: "لواسان",
            address: "روستای افجه، خیابان اصلی",
            price: 45000000000,
            deposit: 0,
            area: 620,
            rooms: 5,
            status: "reserved",
            phone: "09191234567",
            images: [],
            desc: "باغ ۱۲۰۰ متری، سند تک‌برگ، استخر روباز و سونا.",
            createdAt: Date.now() - 86400000 * 10,
        }, {
            id: uid(),
            code: "EKH-1004",
            dealType: "sale",
            propertyType: "land",
            title: "زمین مسکونی با مجوز ساخت",
            region: "شهریار",
            address: "جاده کردامیر، کیلومتر ۳",
            price: 8500000000,
            deposit: 0,
            area: 400,
            rooms: 0,
            status: "available",
            phone: "09121112233",
            images: [],
            desc: "کاربری مسکونی، دسترسی به آب و برق، سند شش‌دانگ.",
            createdAt: Date.now() - 86400000 * 14,
        }, ];
    }

    // ===== لایه داده فایل‌ها =====
    const Store = {
        _cache: null,

        load() {
            try {
                const data = localStorage.getItem(LS_BACKUP);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length) {
                        this._cache = parsed;
                        return parsed;
                    }
                }
            } catch {}
            const def = getDefaultListings();
            this._cache = def;
            this.save(def);
            return def;
        },

        save(list) {
            this._cache = list;
            localStorage.setItem(LS_BACKUP, JSON.stringify(list));
        },

        all() {
            if (this._cache) return this._cache;
            return this.load();
        },

        nextCode(list) {
            const nums = list.map((l) => parseInt((l.code || "").replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
            const next = (nums.length ? Math.max(...nums) : 1000) + 1;
            return "EKH-" + next;
        },

        add(item) {
            const list = this.all();
            item.id = uid();
            item.code = this.nextCode(list);
            item.createdAt = Date.now();
            list.unshift(item);
            this.save(list);
            return item;
        },

        update(id, patch) {
            const list = this.all();
            const idx = list.findIndex((l) => l.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...patch };
            this.save(list);
            return list[idx];
        },

        remove(id) {
            let list = this.all();
            list = list.filter((l) => l.id !== id);
            this.save(list);
        }
    };

    // ===== لایه داده قراردادها =====
    const ContractStore = {
        _cache: null,

        load() {
            try {
                const data = localStorage.getItem(LS_CONTRACTS);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        this._cache = parsed;
                        return parsed;
                    }
                }
            } catch {}
            this._cache = [];
            this.save([]);
            return [];
        },

        save(list) {
            this._cache = list;
            localStorage.setItem(LS_CONTRACTS, JSON.stringify(list));
        },

        all() {
            if (this._cache) return this._cache;
            return this.load();
        },

        add(item) {
            const list = this.all();
            item.id = uid();
            item.createdAt = Date.now();
            list.unshift(item);
            this.save(list);
            return item;
        },

        update(id, patch) {
            const list = this.all();
            const idx = list.findIndex((l) => l.id === id);
            if (idx === -1) return null;
            list[idx] = { ...list[idx], ...patch };
            this.save(list);
            return list[idx];
        },

        remove(id) {
            let list = this.all();
            list = list.filter((l) => l.id !== id);
            this.save(list);
        }
    };

    // ===== احراز هویت =====
    const Auth = {
        tryLogin(username, password) {
            return USERS.find((u) => u.username === username && u.password === password) || null;
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
                const url =
                    `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
                const response = await fetch(url, { headers: this.getHeaders() });
                if (!response.ok) {
                    if (response.status === 404) return null;
                    throw new Error(`GitHub API Error: ${response.status}`);
                }
                const data = await response.json();
                return { content: JSON.parse(atob(data.content)), sha: data.sha };
            } catch (error) {
                console.error('Error reading file from GitHub:', error);
                return null;
            }
        },

        async saveFile(path, content, message, sha = null) {
            try {
                const url =
                `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
                const body = {
                    message: message || `پشتیبان خودکار - ${new Date().toLocaleString('fa-IR')}`,
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))))
                };
                if (sha) body.sha = sha;

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(body)
                });
                if (!response.ok) throw new Error(`GitHub API Error: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Error saving file to GitHub:', error);
                throw error;
            }
        },

        async createBackup(data) {
            try {
                // ذخیره فایل‌های جداگانه
                await this.saveFile(GITHUB_CONFIG.listingsPath, data.listings, 'به‌روزرسانی فایل‌های ملکی');
                await this.saveFile(GITHUB_CONFIG.contractsPath, data.contracts, 'به‌روزرسانی قراردادها');
                await this.saveFile(GITHUB_CONFIG.usersPath, data.users, 'به‌روزرسانی کاربران');

                // فایل پشتیبان کامل
                const backupData = {
                    version: "1.0",
                    timestamp: Date.now(),
                    date: new Date().toISOString(),
                    data: { listings: data.listings, contracts: data.contracts, users: data.users }
                };

                const existingBackup = await this.getFile(GITHUB_CONFIG.backupPath);
                await this.saveFile(GITHUB_CONFIG.backupPath, backupData,
                    `پشتیبان کامل - ${new Date().toLocaleString('fa-IR')}`,
                    existingBackup ? existingBackup.sha : null
                );

                return { success: true };
            } catch (error) {
                console.error('Error creating backup:', error);
                return { success: false, error: error.message };
            }
        },

        async restoreBackup() {
            try {
                const backup = await this.getFile(GITHUB_CONFIG.backupPath);
                if (!backup) throw new Error('فایل پشتیبان در گیت‌هاب یافت نشد.');
                return { success: true, data: backup.content.data };
            } catch (error) {
                console.error('Error restoring backup:', error);
                return { success: false, error: error.message };
            }
        }
    };

    // ===== وضعیت =====
    let editingId = null;
    let pendingDeleteId = null;
    let pendingContractDeleteId = null;
    let editingContractId = null;
    let currentDeal = "sale";
    let currentType = "apartment";
    let currentSort = "newest";
    let currentTab = "listings";
    let timeoutId = null;
    let contractTimeoutId = null;
    let isLoggedIn = false;
    let isAdmin = false;
    let previewData = null;
    let restoreData = null;
    let currentStep = 1;
    const totalSteps = 5;
    let autoSaveTimer = null;
    let backupTimer = null;

    // ===== رندر فایل‌ها =====
    function renderStats() {
        const all = Store.all();
        $("#statTotal").textContent = fa(all.length);
        $("#statSale").textContent = fa(all.filter((l) => l.dealType === "sale").length);
        $("#statRent").textContent = fa(all.filter((l) => l.dealType === "rent").length);
        $("#statAvailable").textContent = fa(all.filter((l) => l.status === "available").length);
    }

    function getFilteredListings() {
        const q = ($("#searchInput").value || "").trim().toLowerCase();
        const deal = $('input[name="deal"]:checked').value;
        const types = $$('#typeFilter input:checked');
        const statuses = $$('#statusFilter input:checked');

        let list = Store.all();
        list = list.filter((l) => {
            if (deal !== "all" && l.dealType !== deal) return false;
            let typeOk = false;
            for (let t of types) { if (t.value === l.propertyType) { typeOk = true; break; } }
            if (!typeOk) return false;
            let statusOk = false;
            for (let s of statuses) { if (s.value === l.status) { statusOk = true; break; } }
            if (!statusOk) return false;
            if (q) {
                const title = (l.title || "").toLowerCase();
                const code = (l.code || "").toLowerCase();
                if (!title.includes(q) && !code.includes(q)) return false;
            }
            return true;
        });

        switch (currentSort) {
            case "newest":
                list.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case "oldest":
                list.sort((a, b) => a.createdAt - b.createdAt);
                break;
            default:
                list.sort((a, b) => b.createdAt - a.createdAt);
        }
        return list;
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

    function getStatusOverlayHTML(status) {
        if (status === 'sold') return `<div class="sold-stamp">✓ فروخته شده</div>`;
        if (status === 'reserved') return `<div class="reserved-stamp">⚡ بیعانه</div>`;
        return '';
    }

    function getMediaClass(status) {
        if (status === 'sold') return 'sold-overlay';
        if (status === 'reserved') return 'reserved-overlay';
        return '';
    }

    function renderCard(item) {
        const div = document.createElement("div");
        div.className = "listing-card";
        const mediaClass = getMediaClass(item.status);
        const overlayHTML = getStatusOverlayHTML(item.status);
        div.innerHTML = `
            <div class="card-media ${mediaClass}">
                ${imagesHTML(item.images)}
                ${overlayHTML}
                <div class="card-badges">
                    <span class="card-status status-${item.status}">${STATUS_LABEL[item.status]}</span>
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
        const list = getFilteredListings();
        grid.innerHTML = "";
        if (!list.length) {
            $("#emptyState").classList.remove("hidden");
        } else {
            $("#emptyState").classList.add("hidden");
            list.forEach((item) => grid.appendChild(renderCard(item)));
        }
        const total = Store.all().length;
        $("#resultsMeta").textContent = `${fa(list.length)} فایل از ${fa(total)} فایل ثبت‌شده`;
        renderStats();
    }

    // ===== رندر قراردادها =====
    function getFilteredContracts() {
        const q = ($("#contractSearchInput").value || "").trim().toLowerCase();
        let list = ContractStore.all();
        if (q) {
            list = list.filter((c) => {
                const mojer = `${c.mojer_name || ''} ${c.mojer_family || ''}`.toLowerCase();
                const mostaajer = `${c.mostaajer_name || ''} ${c.mostaajer_family || ''}`.toLowerCase();
                const address = (c.property_address || '').toLowerCase();
                return mojer.includes(q) || mostaajer.includes(q) || address.includes(q);
            });
        }
        list.sort((a, b) => b.createdAt - a.createdAt);
        return list;
    }

    function renderContracts() {
        const grid = $("#contractsGrid");
        const list = getFilteredContracts();
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
        $("#contractResultsMeta").textContent = `${fa(list.length)} قرارداد ثبت شده`;
    }

    // ===== رندر آمار پشتیبان =====
    function renderBackupStats() {
        const listings = Store.all().length;
        const contracts = ContractStore.all().length;
        const users = USERS.length;
        $("#bListings").textContent = fa(listings);
        $("#bContracts").textContent = fa(contracts);
        $("#bUsers").textContent = fa(users);
        $("#bTotal").textContent = fa(listings + contracts + users);

        const lastBackup = localStorage.getItem(LS_LAST_BACKUP);
        if (lastBackup) {
            $("#lastBackupTime").textContent = new Date(parseInt(lastBackup)).toLocaleString("fa-IR");
        }
        updateGitHubStatus();
    }

    // ===== وضعیت گیت‌هاب =====
    function updateGitHubStatus() {
        const statusEl = $("#githubStatus");
        if (!statusEl) return;
        const isConnected = GITHUB_CONFIG.token && GITHUB_CONFIG.owner && GITHUB_CONFIG.repo;
        statusEl.innerHTML = `
            <span class="status-dot ${isConnected ? 'online' : 'offline'}"></span>
            <span>${isConnected ? `✅ متصل به گیت‌هاب (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo})` : '❌ متصل نیست - تنظیمات را تکمیل کنید'}</span>
        `;
    }

    // ===== رندر کاربران =====
    function renderUserList() {
        const container = $("#userList");
        if (!container) return;
        container.innerHTML = USERS.map(u => `
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
            btn.addEventListener('click', () => {
                const username = btn.dataset.user;
                if (USERS.length <= 1) { toast('حداقل یک کاربر باید باقی بماند.'); return; }
                USERS = USERS.filter(u => u.username !== username);
                saveUsers();
                renderUserList();
                renderBackupStats();
                toast('کاربر حذف شد.', 'success');
            });
        });
    }

    // ===== فرم فایل =====
    function setSeg(container, value) {
        $$(`#${container} button`).forEach((b) => b.classList.toggle("active", b.dataset.val === value));
    }

    function toggleDealFields() {
        const isRent = currentDeal === "rent";
        $("#priceLabel").textContent = isRent ? "اجاره ماهانه (تومان)" : "قیمت (تومان)";
        $("#depositField").style.display = isRent ? "block" : "none";
    }

    function toggleTypeFields() {
        $("#roomsField").style.display = currentType === "land" ? "none" : "block";
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
        const fileUpload = input.closest('.file-upload');
        input.addEventListener("change", function() {
            preview.innerHTML = "";
            const file = this.files[0];
            if (!file) return;
            if (fileUpload) {
                fileUpload.querySelector('span').textContent = file.name;
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
        $("#listingModalTitle").innerHTML = item ?
            '<i class="fas fa-edit"></i> ویرایش فایل' :
            '<i class="fas fa-plus-circle"></i> ثبت فایل جدید';
        currentDeal = item ? item.dealType : "sale";
        currentType = item ? item.propertyType : "apartment";
        setSeg("dealSeg", currentDeal);
        setSeg("typeSeg", currentType);
        toggleDealFields();
        toggleTypeFields();

        $("#fTitle").value = item ? item.title : "";
        $("#fPrice").value = item ? item.price : "";
        $("#fDeposit").value = item ? item.deposit || "" : "";
        $("#fArea").value = item ? item.area : "";
        $("#fRooms").value = item ? item.rooms || "" : "";
        $("#fRegion").value = item ? item.region : "";
        $("#fAddress").value = item ? item.address || "" : "";
        $("#fStatus").value = item ? item.status : "available";
        $("#fPhone").value = item ? item.phone || "" : "";
        $("#fDesc").value = item ? item.desc || "" : "";

        $("#preview1").innerHTML = "";
        $("#preview2").innerHTML = "";
        $("#fImage1").value = "";
        $("#fImage2").value = "";
        document.querySelector('#fileUpload1 span').textContent = 'انتخاب تصویر';
        document.querySelector('#fileUpload2 span').textContent = 'انتخاب تصویر';

        if (item && item.images && item.images.length) {
            if (item.images[0]) {
                const img = document.createElement("img");
                img.src = item.images[0];
                $("#preview1").appendChild(img);
                document.querySelector('#fileUpload1 span').textContent = 'تصویر انتخاب شد';
            }
            if (item.images[1]) {
                const img = document.createElement("img");
                img.src = item.images[1];
                $("#preview2").appendChild(img);
                document.querySelector('#fileUpload2 span').textContent = 'تصویر انتخاب شد';
            }
        }

        $("#listingModalOverlay").classList.remove("hidden");
        setTimeout(() => $("#fTitle").focus(), 50);
    }

    function closeListingModal() {
        $("#listingModalOverlay").classList.add("hidden");
        editingId = null;
    }

    async function handleListingSubmit(e) {
        e.preventDefault();
        if (!isLoggedIn) { toast('لطفاً وارد شوید.'); return; }

        const file1 = document.getElementById("fImage1").files[0];
        const file2 = document.getElementById("fImage2").files[0];
        let images = [];

        if (file1) {
            const data = await readFileAsDataURL(file1);
            images.push(data);
        }
        if (file2) {
            const data = await readFileAsDataURL(file2);
            images.push(data);
        }

        if (editingId) {
            const existing = Store.all();
            const found = existing.find(l => l.id === editingId);
            if (found && found.images) {
                if (!file1 && found.images[0]) images[0] = found.images[0];
                if (!file2 && found.images[1]) images[1] = found.images[1];
                if (!file1 && !file2) images = found.images;
            }
        }

        const data = {
            dealType: currentDeal,
            propertyType: currentType,
            title: $("#fTitle").value.trim(),
            price: Number($("#fPrice").value) || 0,
            deposit: Number($("#fDeposit").value) || 0,
            area: Number($("#fArea").value) || 0,
            rooms: Number($("#fRooms").value) || 0,
            region: $("#fRegion").value.trim(),
            address: $("#fAddress").value.trim(),
            status: $("#fStatus").value,
            phone: $("#fPhone").value.trim(),
            images: images,
            desc: $("#fDesc").value.trim(),
        };

        if (!data.title || !data.region || !data.price || !data.area || !data.phone) {
            toast("لطفاً فیلدهای ستاره‌دار را کامل کنید.", 'warning');
            return;
        }

        if (editingId) {
            Store.update(editingId, data);
            toast("فایل ویرایش شد.", 'success');
        } else {
            Store.add(data);
            toast("فایل جدید ثبت شد.", 'success');
        }
        closeListingModal();
        renderListings();
        renderBackupStats();
    }

    // ===== فرم قرارداد =====
    const contractFields = [
        'mojer_name', 'mojer_family', 'mojer_father', 'mojer_id', 'mojer_issue', 'mojer_national', 'mojer_phone',
        'mojer_address',
        'mostaajer_name', 'mostaajer_family', 'mostaajer_father', 'mostaajer_id', 'mostaajer_issue', 'mostaajer_national',
        'mostaajer_phone', 'mostaajer_address',
        'share', 'property_address', 'plaque', 'floor', 'unit', 'postal_code', 'reg_plaque_main', 'reg_plaque_sub',
        'reg_section',
        'area', 'deed_serial', 'deed_page', 'deed_book', 'property_reg_no', 'rooms', 'parking_no', 'storage_no',
        'storage_area',
        'phone_lines', 'phone_number', 'usage',
        'start_day', 'start_month', 'start_year', 'end_day', 'end_month', 'end_year',
        'contract_day', 'contract_month', 'contract_year', 'delivery_day', 'delivery_month', 'delivery_year',
        'monthly_rent', 'loan_amount', 'loan_words',
        'tenant_count', 'usage_type',
        'daily_penalty', 'delay_penalty',
        'city', 'commission_mojer', 'commission_mostaajer',
        'notes', 'agent_name', 'contract_number', 'agent_id', 'hologram'
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
        localStorage.setItem(LS_CONTRACT_DRAFT, JSON.stringify(data));
        const indicator = $("#autoSaveIndicator");
        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-check"></i> ذخیره شد';
            indicator.className = 'auto-save-badge';
            setTimeout(() => {
                indicator.innerHTML = '<i class="fas fa-save"></i> ذخیره خودکار';
            }, 1500);
        }
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
        if (nextBtn) nextBtn.innerHTML = step < totalSteps ? 'بعدی <i class="fas fa-arrow-left"></i>' :
            '<i class="fas fa-check"></i> تکمیل';

        const modal = document.querySelector('#contractModalOverlay .modal');
        if (modal) modal.scrollTop = 0;
    }

    function openContractModal(contract) {
        if (!isLoggedIn) { toast('لطفاً ابتدا وارد شوید.'); return; }
        editingContractId = contract ? contract.id : null;
        $("#contractModalTitle").innerHTML = contract ?
            '<i class="fas fa-edit"></i> ویرایش قرارداد اجاره' :
            '<i class="fas fa-file-signature"></i> ثبت قرارداد اجاره جدید';

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
        $("#contractModalOverlay").classList.remove("hidden");
        setTimeout(() => document.getElementById('c_mojer_name')?.focus(), 100);
    }

    function closeContractModal() {
        $("#contractModalOverlay").classList.add("hidden");
        editingContractId = null;
        saveDraft();
    }

    function getContractData() {
        return getContractFieldValues();
    }

    function handleContractSubmit(e) {
        e.preventDefault();
        if (!isLoggedIn) { toast('لطفاً وارد شوید.'); return; }

        const data = getContractData();
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

        if (editingContractId) {
            ContractStore.update(editingContractId, data);
            toast('قرارداد با موفقیت ویرایش شد.', 'success');
        } else {
            ContractStore.add(data);
            toast('قرارداد جدید با موفقیت ثبت شد.', 'success');
        }

        clearDraft();
        closeContractModal();
        renderContracts();
        renderBackupStats();
    }

    // ===== ساخت HTML قرارداد =====
    function buildContractHTML(data) {
        const d = data || {};
        const startDate = `${d.start_year || ''}/${d.start_month || ''}/${d.start_day || ''}`;
        const endDate = `${d.end_year || ''}/${d.end_month || ''}/${d.end_day || ''}`;
        const contractDate = `${d.contract_year || ''}/${d.contract_month || ''}/${d.contract_day || ''}`;
        const deliveryDate = `${d.delivery_year || ''}/${d.delivery_month || ''}/${d.delivery_day || ''}`;

        let html = `
            <div class="contract-title">سامانه ثبت معاملات املاک و مستغلات کشور<br>اجاره نامه</div>
            <div class="contract-header-info">
                <span>تاریخ ثبت قرارداد: ${contractDate}</span>
                <span>شماره ثبت قرارداد: ${d.contract_number || ''}</span>
                <span>شناسه صنفی مشاور املاک: ${d.agent_id || ''}</span>
                <span>شماره سریال هولوگرام: ${d.hologram || ''}</span>
            </div>
            <div class="section">
                <div class="section-title">ماده 1 : طرفین قرارداد</div>
                <div style="margin-bottom:6px;">
                    <div style="font-weight:700;">موجر/موجرین</div>
                    <div class="field-row"><span class="label">نام:</span><span class="value">${d.mojer_name || ''}</span></div>
                    <div class="field-row"><span class="label">نام خانوادگی:</span><span class="value">${d.mojer_family || ''}</span></div>
                    <div class="field-row"><span class="label">نام پدر:</span><span class="value">${d.mojer_father || ''}</span></div>
                    <div class="field-row"><span class="label">ش.شناسنامه:</span><span class="value">${d.mojer_id || ''}</span></div>
                    <div class="field-row"><span class="label">محل صدور:</span><span class="value">${d.mojer_issue || ''}</span></div>
                    <div class="field-row"><span class="label">کد ملی:</span><span class="value">${d.mojer_national || ''}</span></div>
                    <div class="field-row"><span class="label">تلفن:</span><span class="value">${d.mojer_phone || ''}</span></div>
                    <div class="field-row"><span class="label">آدرس:</span><span class="value">${d.mojer_address || ''}</span></div>
                </div>
                <div style="margin-bottom:6px;">
                    <div style="font-weight:700;">مستاجر/مستاجرین</div>
                    <div class="field-row"><span class="label">نام:</span><span class="value">${d.mostaajer_name || ''}</span></div>
                    <div class="field-row"><span class="label">نام خانوادگی:</span><span class="value">${d.mostaajer_family || ''}</span></div>
                    <div class="field-row"><span class="label">نام پدر:</span><span class="value">${d.mostaajer_father || ''}</span></div>
                    <div class="field-row"><span class="label">ش.شناسنامه:</span><span class="value">${d.mostaajer_id || ''}</span></div>
                    <div class="field-row"><span class="label">محل صدور:</span><span class="value">${d.mostaajer_issue || ''}</span></div>
                    <div class="field-row"><span class="label">کد ملی:</span><span class="value">${d.mostaajer_national || ''}</span></div>
                    <div class="field-row"><span class="label">تلفن:</span><span class="value">${d.mostaajer_phone || ''}</span></div>
                    <div class="field-row"><span class="label">آدرس:</span><span class="value">${d.mostaajer_address || ''}</span></div>
                </div>
            </div>
            <div class="section">
                <div class="section-title">ماده 2 : موضوع قرارداد</div>
                <div class="field-row"><span class="label">سهم:</span><span class="value">${d.share || ''} دانگ</span></div>
                <div class="field-row"><span class="label">آدرس:</span><span class="value">${d.property_address || ''}</span></div>
                <div class="field-row"><span class="label">پلاک:</span><span class="value">${d.plaque || ''}</span></div>
                <div class="field-row"><span class="label">طبقه:</span><span class="value">${d.floor || ''}</span></div>
                <div class="field-row"><span class="label">واحد:</span><span class="value">${d.unit || ''}</span></div>
                <div class="field-row"><span class="label">کدپستی:</span><span class="value">${d.postal_code || ''}</span></div>
                <div class="field-row"><span class="label">پلاک ثبتی اصلی:</span><span class="value">${d.reg_plaque_main || ''}</span></div>
                <div class="field-row"><span class="label">پلاک ثبتی فرعی:</span><span class="value">${d.reg_plaque_sub || ''}</span></div>
                <div class="field-row"><span class="label">بخش ثبتی:</span><span class="value">${d.reg_section || ''}</span></div>
                <div class="field-row"><span class="label">مساحت:</span><span class="value">${d.area || ''} متر مربع</span></div>
                <div class="field-row"><span class="label">سریال سند:</span><span class="value">${d.deed_serial || ''}</span></div>
                <div class="field-row"><span class="label">صفحه:</span><span class="value">${d.deed_page || ''}</span></div>
                <div class="field-row"><span class="label">دفتر:</span><span class="value">${d.deed_book || ''}</span></div>
                <div class="field-row"><span class="label">شماره ثبت ملک:</span><span class="value">${d.property_reg_no || ''}</span></div>
                <div class="field-row"><span class="label">اتاق خواب:</span><span class="value">${d.rooms || ''}</span></div>
                <div class="field-row"><span class="label">پارکینگ:</span><span class="value">${d.parking_no || ''}</span></div>
                <div class="field-row"><span class="label">انباری:</span><span class="value">${d.storage_no || ''} (${d.storage_area || ''} متر)</span></div>
                <div class="field-row"><span class="label">خط تلفن:</span><span class="value">${d.phone_lines || ''}</span></div>
                <div class="field-row"><span class="label">شماره تلفن:</span><span class="value">${d.phone_number || ''}</span></div>
                <div class="field-row"><span class="label">کاربری:</span><span class="value">${d.usage || ''}</span></div>
            </div>
            <div class="section">
                <div class="section-title">ماده 3 : مدت اجاره</div>
                <div class="field-row"><span class="label">از تاریخ:</span><span class="value">${startDate}</span></div>
                <div class="field-row"><span class="label">الی:</span><span class="value">${endDate}</span></div>
                <div class="field-row"><span class="label">تاریخ عقد:</span><span class="value">${contractDate}</span></div>
                <div class="field-row"><span class="label">تاریخ تحویل:</span><span class="value">${deliveryDate}</span></div>
            </div>
            <div class="section">
                <div class="section-title">ماده 4 : اجاره بها</div>
                <div class="field-row"><span class="label">اجاره ماهانه:</span><span class="value">${Number(d.monthly_rent || 0).toLocaleString()} ریال</span></div>
                <div class="field-row"><span class="label">قرض الحسنه:</span><span class="value">${Number(d.loan_amount || 0).toLocaleString()} ریال</span></div>
                <div class="field-row"><span class="label">به حروف:</span><span class="value">${d.loan_words || ''}</span></div>
            </div>
            <div class="section">
                <div class="section-title">ماده 5 : شرایط تسلیم</div>
                <div class="field-row"><span class="label">نوع کاربری:</span><span class="value">${d.usage_type || ''}</span></div>
                <div class="field-row"><span class="label">تعداد نفرات:</span><span class="value">${d.tenant_count || ''} نفر</span></div>
            </div>
            <div class="section">
                <div class="section-title">ماده 6 : آثار قرارداد</div>
                <div class="field-row"><span class="label">اجرت المثل روزانه:</span><span class="value">${Number(d.daily_penalty || 0).toLocaleString()} ریال</span></div>
                <div class="field-row"><span class="label">خسارت تاخیر روزانه:</span><span class="value">${Number(d.delay_penalty || 0).toLocaleString()} ریال</span></div>
            </div>
            <div class="section">
                <div class="section-title">ماده 7 : فایل متعاملین</div>
                <div class="field-row"><span class="label">شهرستان:</span><span class="value">${d.city || ''}</span></div>
                <div class="field-row"><span class="label">حق الزحمه موجر:</span><span class="value">${Number(d.commission_mojer || 0).toLocaleString()} ریال</span></div>
                <div class="field-row"><span class="label">حق الزحمه مستاجر:</span><span class="value">${Number(d.commission_mostaajer || 0).toLocaleString()} ریال</span></div>
            </div>
            ${d.notes ? `<div class="section"><div class="section-title">توضیحات:</div><div class="notes-section">${escapeHtml(d.notes)}</div></div>` : ''}
            <div class="signature-area">
                <div class="sign-block"><div>موجر/موجرین</div><div class="line"></div></div>
                <div class="sign-block"><div>مستاجر/مستاجرین</div><div class="line"></div></div>
                <div class="sign-block"><div>مهر و امضاء مشاور املاک</div><div class="line"></div><div style="font-size:8px;margin-top:3px;">${d.agent_name || ''}</div></div>
            </div>
        `;
        return html;
    }

    // ===== تابع تنظیم فونت پویا =====
    function adjustFontSize() {
        const container = $("#previewContent");
        if (!container) return;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        if (scrollHeight > clientHeight) {
            let currentSize = parseFloat(window.getComputedStyle(container).fontSize) || 11;
            if (currentSize > 7) {
                const newSize = Math.max(currentSize - 0.5, 7);
                container.style.fontSize = newSize + 'px';
                setTimeout(adjustFontSize, 50);
            }
        }
    }

    // ===== پیش‌نمایش و دانلود PDF =====
    function showPreview(data) {
        previewData = data;
        const content = $("#previewContent");
        content.innerHTML = buildContractHTML(data);
        content.style.fontSize = '11px';
        $("#previewModalOverlay").classList.remove("hidden");
        setTimeout(adjustFontSize, 100);
    }

    function closePreview() {
        $("#previewModalOverlay").classList.add("hidden");
        previewData = null;
    }

    async function downloadPDF() {
        if (!previewData) return;
        toast('در حال تولید PDF...');
        try {
            const content = $("#previewContent");
            adjustFontSize();
            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: content.scrollWidth,
                height: content.scrollHeight,
                windowWidth: content.scrollWidth,
                windowHeight: content.scrollHeight
            });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pageHeight = 297;
            let heightLeft = pdfHeight;
            let position = 0;
            let pageNum = 0;
            while (heightLeft > 0 || pageNum === 0) {
                if (pageNum > 0) pdf.addPage();
                const yPos = -position;
                pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
                position += pageHeight;
                pageNum++;
            }
            pdf.save(
                `قرارداد_اجاره_${previewData.mojer_family || ''}_${previewData.mostaajer_family || ''}.pdf`);
            toast('PDF با موفقیت دانلود شد.', 'success');
        } catch (err) {
            console.error(err);
            toast('خطا در تولید PDF.', 'danger');
        }
    }

    // ===== پشتیبان‌گیری =====
    function createFullBackup() {
        return {
            listings: Store.all(),
            contracts: ContractStore.all(),
            users: USERS
        };
    }

    async function performAutoBackup() {
        try {
            const data = createFullBackup();

            // اگر تنظیمات گیت‌هاب کامل است
            if (GITHUB_CONFIG.token && GITHUB_CONFIG.owner && GITHUB_CONFIG.repo) {
                const result = await GitHubAPI.createBackup(data);
                if (result.success) {
                    localStorage.setItem(LS_LAST_BACKUP, String(Date.now()));
                    renderBackupStats();
                    console.log('✅ پشتیبان در گیت‌هاب ذخیره شد:', new Date().toLocaleString('fa-IR'));
                    return;
                }
            }

            // ذخیره محلی به عنوان پشتیبان جایگزین
            localStorage.setItem('ekhlasi_auto_backup', JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
            localStorage.setItem(LS_LAST_BACKUP, String(Date.now()));
            renderBackupStats();
            console.log('💾 پشتیبان محلی ذخیره شد:', new Date().toLocaleString('fa-IR'));

        } catch (error) {
            console.error('❌ خطا در پشتیبان‌گیری خودکار:', error);
            const data = createFullBackup();
            localStorage.setItem('ekhlasi_auto_backup', JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        }
    }

    async function downloadFullBackup() {
        try {
            toast('در حال ایجاد پشتیبان...');
            const data = createFullBackup();

            // تلاش برای ذخیره در گیت‌هاب
            if (GITHUB_CONFIG.token && GITHUB_CONFIG.owner && GITHUB_CONFIG.repo) {
                const result = await GitHubAPI.createBackup(data);
                if (result.success) {
                    localStorage.setItem(LS_LAST_BACKUP, String(Date.now()));
                    renderBackupStats();
                    toast('پشتیبان در گیت‌هاب ذخیره شد.', 'success');
                }
            }

            // دانلود فایل محلی
            const backupData = {
                version: "1.0",
                timestamp: Date.now(),
                date: new Date().toISOString(),
                data: data
            };

            const json = JSON.stringify(backupData, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ekhlasi_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            toast('فایل پشتیبان دانلود شد.', 'success');
        } catch (error) {
            console.error('Error downloading backup:', error);
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
                        <div class="row"><span class="label">📋 فایل‌ها:</span><span class="value">${backup.data.listings.length} عدد</span></div>
                        <div class="row"><span class="label">📄 قراردادها:</span><span class="value">${backup.data.contracts.length} عدد</span></div>
                        <div class="row"><span class="label">👤 کاربران:</span><span class="value">${backup.data.users.length} نفر</span></div>
                        <div class="row"><span class="label">📅 تاریخ:</span><span class="value">${new Date(backup.timestamp).toLocaleString("fa-IR")}</span></div>
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
            Store.save(restoreData.data.listings);
            ContractStore.save(restoreData.data.contracts);
            USERS = restoreData.data.users;
            saveUsers();

            // ذخیره در گیت‌هاب
            if (GITHUB_CONFIG.token && GITHUB_CONFIG.owner && GITHUB_CONFIG.repo) {
                await GitHubAPI.createBackup(restoreData.data);
            }

            renderListings();
            renderContracts();
            renderUserList();
            renderBackupStats();

            $("#restoreConfirmModal").classList.add("hidden");
            restoreData = null;
            toast('اطلاعات با موفقیت بازیابی شد.', 'success');
        } catch (err) {
            toast('خطا در بازیابی اطلاعات.', 'danger');
        }
    }

    async function restoreFromGitHub() {
        try {
            toast('در حال بازیابی از گیت‌هاب...');
            const result = await GitHubAPI.restoreBackup();

            if (result.success) {
                const data = result.data;
                Store.save(data.listings);
                ContractStore.save(data.contracts);
                USERS = data.users;
                saveUsers();

                renderListings();
                renderContracts();
                renderUserList();
                renderBackupStats();

                toast('اطلاعات با موفقیت از گیت‌هاب بازیابی شد.', 'success');
            } else {
                toast('خطا در بازیابی از گیت‌هاب: ' + result.error, 'danger');
            }
        } catch (error) {
            console.error('Error restoring from GitHub:', error);
            toast('خطا در بازیابی از گیت‌هاب.', 'danger');
        }
    }

    // ===== تنظیمات گیت‌هاب =====
    function setupGitHubSettings() {
        const tokenInput = $("#githubToken");
        const ownerInput = $("#githubOwner");
        const repoInput = $("#githubRepo");

        if (tokenInput) tokenInput.value = GITHUB_CONFIG.token !== "" ? GITHUB_CONFIG.token : '';
        if (ownerInput) ownerInput.value = GITHUB_CONFIG.owner !== "" ? GITHUB_CONFIG.owner : '';
        if (repoInput) repoInput.value = GITHUB_CONFIG.repo !== "" ? GITHUB_CONFIG.repo : '';

        updateGitHubStatus();
    }

    // ===== جزئیات فایل =====
    let detailId = null;

    function openDetail(id) {
        const item = Store.all().find((l) => l.id === id);
        if (!item) return;
        detailId = id;
        const body = $("#detailBody");
        body.innerHTML = buildDetailHTML(item, false);
        $("#detailModalOverlay").classList.remove("hidden");

        const editBtn = $("#detailEditBtn");
        const deleteBtn = $("#detailDeleteBtn");
        if (editBtn) editBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
        if (deleteBtn) deleteBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    }

    function closeDetail() {
        $("#detailModalOverlay").classList.add("hidden");
        detailId = null;
    }

    function buildDetailHTML(item, isPublic) {
        const imagesHTML = (item.images && item.images.length) ?
            `<div class="images-grid">${item.images.map(src => `<img src="${escapeHtml(src)}" alt="تصویر" />`).join('')}</div>` :
            `<span style="font-size:44px;">${item.propertyType === "apartment" ? "🏢" : item.propertyType === "villa" ? "🏡" : "🌿"}</span>`;

        const statusOverlay = item.status === 'sold' ?
            `<div class="sold-stamp" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:24px;font-weight:900;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.7);border:3px solid rgba(255,255,255,0.7);padding:6px 18px;border-radius:8px;letter-spacing:2px;z-index:2;background:rgba(176,80,58,0.7);backdrop-filter:blur(2px);">✓ فروخته شده</div>` :
            item.status === 'reserved' ?
            `<div class="reserved-stamp" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);font-size:20px;font-weight:900;color:#a8802f;text-shadow:0 1px 8px rgba(255,255,255,0.5);border:3px solid rgba(168,128,47,0.6);padding:4px 16px;border-radius:8px;letter-spacing:2px;z-index:2;background:rgba(255,255,255,0.7);backdrop-filter:blur(2px);">⚡ بیعانه</div>` :
            '';

        const contactHTML = isPublic ?
            `<div class="agent-phone">📞 تماس با مشاور: ${escapeHtml(item.phone)}</div>` :
            `<div><b>شماره تماس مشاور</b> ${escapeHtml(item.phone) || "—"}</div>`;

        return `
            <div class="detail-media" style="position:relative;">
                ${imagesHTML}
                ${statusOverlay}
                <div class="detail-status-overlay">
                    <span class="card-status status-${item.status}">${STATUS_LABEL[item.status]}</span>
                </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px; flex-wrap:wrap;">
                <span class="deal-badge" style="position:static;">${DEAL_LABEL[item.dealType]}</span>
                <span class="card-code" style="font-size:11px;">${item.code}</span>
            </div>
            <h2 style="margin:6px 0; font-size:16px;">${escapeHtml(item.title)}</h2>
            <div class="card-price" style="font-size:18px;">${priceLine(item)}</div>
            <div class="detail-grid">
                <div><b>نوع ملک</b>${TYPE_LABEL[item.propertyType]}</div>
                <div><b>متراژ</b>${fa(item.area)} متر مربع</div>
                <div><b>منطقه</b>${escapeHtml(item.region)}</div>
                ${item.rooms ? `<div><b>تعداد خواب</b>${fa(item.rooms)}</div>` : ""}
                <div><b>آدرس</b>${escapeHtml(item.address) || "—"}</div>
            </div>
            ${item.desc ? `<div class="detail-desc">${escapeHtml(item.desc)}</div>` : ""}
            <div class="detail-contact">
                <span>تاریخ ثبت: ${new Date(item.createdAt).toLocaleDateString("fa-IR")}</span>
                ${contactHTML}
            </div>
        `;
    }

    function askDelete(id) {
        pendingDeleteId = id;
        $("#confirmModalOverlay").classList.remove("hidden");
    }

    function closeConfirm() {
        $("#confirmModalOverlay").classList.add("hidden");
        pendingDeleteId = null;
    }

    function askContractDelete(id) {
        pendingContractDeleteId = id;
        $("#confirmContractModalOverlay").classList.remove("hidden");
    }

    function closeContractConfirm() {
        $("#confirmContractModalOverlay").classList.add("hidden");
        pendingContractDeleteId = null;
    }

    // ===== مدیریت وضعیت ورود =====
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
        const backupTab = $("#backupTab");
        const usersTab = $("#usersTab");

        const showManagement = isLoggedIn;
        if (newListingBtn) newListingBtn.style.display = showManagement ? 'inline-flex' : 'none';
        if (newContractBtn) newContractBtn.style.display = showManagement ? 'inline-flex' : 'none';
        if (newContractTopBtn) newContractTopBtn.style.display = showManagement ? 'inline-flex' : 'none';
        if (emptyNewBtn) emptyNewBtn.style.display = showManagement ? 'inline-flex' : 'none';
        if (emptyContractBtn) emptyContractBtn.style.display = showManagement ? 'inline-flex' : 'none';

        if (contractsTab) contractsTab.style.display = showManagement ? 'inline-flex' : 'none';
        if (backupTab) backupTab.style.display = (showManagement && isAdmin) ? 'inline-flex' : 'none';
        if (usersTab) usersTab.style.display = (showManagement && isAdmin) ? 'inline-flex' : 'none';

        if (userBadge) {
            if (isLoggedIn && session) {
                userBadge.style.display = 'flex';
                $("#agentName").textContent = session.displayName || session.username;
            } else {
                userBadge.style.display = 'none';
            }
        }

        if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';

        if (currentTab === 'users' && !isAdmin) {
            switchTab('listings');
        }
    }

    function showLoginModal() {
        $("#loginOverlay").classList.remove("hidden");
        $("#loginError").classList.add("hidden");
        $("#username").value = "";
        $("#password").value = "";
        setTimeout(() => $("#username").focus(), 50);
    }

    function hideLoginModal() {
        $("#loginOverlay").classList.add("hidden");
    }

    // ===== تغییر تب =====
    function switchTab(tab) {
        currentTab = tab;
        $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

        const listingsSection = $("#listingsSection");
        const contractsSection = $("#contractsSection");
        const backupSection = $("#backupSection");
        const usersSection = $("#usersSection");
        const sidebar = $("#sidebar");

        if (listingsSection) listingsSection.style.display = tab === 'listings' ? 'block' : 'none';
        if (contractsSection) contractsSection.style.display = tab === 'contracts' ? 'block' : 'none';
        if (backupSection) backupSection.style.display = tab === 'backup' ? 'block' : 'none';
        if (usersSection) usersSection.style.display = tab === 'users' ? 'block' : 'none';

        if (sidebar) {
            sidebar.style.display = (tab === 'backup' || tab === 'users') ? 'none' : 'block';
        }

        if (tab === 'contracts') renderContracts();
        if (tab === 'backup') renderBackupStats();
        if (tab === 'users') renderUserList();
    }

    // ===== اتصال رویدادها =====
    function bindEvents() {
        // ورود
        $("#loginForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const u = $("#username").value.trim();
            const p = $("#password").value;
            const user = Auth.tryLogin(u, p);
            if (!user) {
                $("#loginErrorText").textContent = "نام کاربری یا رمز عبور اشتباه است.";
                $("#loginError").classList.remove("hidden");
                return;
            }
            $("#loginError").classList.add("hidden");
            Auth.setSession(user, $("#rememberMe").checked);
            hideLoginModal();
            updateUIForAuth();
            renderListings();
            renderBackupStats();
            toast(`خوش آمدید ${user.displayName}`, 'success');
        });

        $("#btnLoginTrigger").addEventListener("click", showLoginModal);

        $("#btnLogout").addEventListener("click", () => {
            Auth.logout();
            updateUIForAuth();
            renderListings();
            toast("خروج انجام شد.");
        });

        // تب‌ها
        $$('.tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // جستجوها
        $("#searchInput").addEventListener("input", () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => renderListings(), 300);
        });

        $("#contractSearchInput").addEventListener("input", () => {
            clearTimeout(contractTimeoutId);
            contractTimeoutId = setTimeout(() => renderContracts(), 300);
        });

        // فیلترها
        $("#dealFilter").addEventListener("change", renderListings);
        $("#typeFilter").addEventListener("change", renderListings);
        $("#statusFilter").addEventListener("change", renderListings);

        // مرتب‌سازی
        $("#sortFilters").addEventListener("click", (e) => {
            const btn = e.target.closest(".sort-btn");
            if (!btn) return;
            $$('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            renderListings();
        });

        // دکمه‌های جدید
        $("#btnNewListing").addEventListener("click", () => openListingModal(null));
        $("#btnEmptyNew").addEventListener("click", () => openListingModal(null));
        $("#btnNewContract").addEventListener("click", () => openContractModal(null));
        $("#btnNewContractTop").addEventListener("click", () => openContractModal(null));
        $("#btnEmptyContract").addEventListener("click", () => openContractModal(null));

        // مودال فرم فایل
        $("#closeListingModal").addEventListener("click", closeListingModal);
        $("#cancelListingModal").addEventListener("click", closeListingModal);
        $("#listingForm").addEventListener("submit", handleListingSubmit);

        // مودال فرم قرارداد
        $("#nextStepBtn").addEventListener("click", () => {
            if (currentStep < totalSteps) {
                goToStep(currentStep + 1);
            } else {
                $("#saveContractBtn").click();
            }
        });

        $("#prevStepBtn").addEventListener("click", () => {
            if (currentStep > 1) goToStep(currentStep - 1);
        });

        $$('.step').forEach(el => {
            el.addEventListener('click', () => {
                const step = parseInt(el.dataset.step);
                if (step <= currentStep) {
                    goToStep(step);
                }
            });
        });

        // ذخیره خودکار
        contractFields.forEach(f => {
            const el = document.getElementById(`c_${f}`);
            if (el) {
                el.addEventListener('input', () => {
                    clearTimeout(autoSaveTimer);
                    const indicator = $("#autoSaveIndicator");
                    if (indicator) {
                        indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ذخیره...';
                        indicator.className = 'auto-save-badge';
                    }
                    autoSaveTimer = setTimeout(() => {
                        saveDraft();
                    }, 1000);
                });
            }
        });

        $("#closeContractModal").addEventListener("click", closeContractModal);
        $("#cancelContractModal").addEventListener("click", closeContractModal);
        $("#contractForm").addEventListener("submit", handleContractSubmit);

        $("#previewContractBtn").addEventListener("click", () => {
            const data = getContractData();
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
            showPreview(data);
        });

        // مودال پیش‌نمایش
        $("#closePreviewModal").addEventListener("click", closePreview);
        $("#closePreviewModal2").addEventListener("click", closePreview);
        $("#downloadPDFBtn").addEventListener("click", downloadPDF);

        // سگمنت‌ها
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

        // کلیک روی کارت‌ها
        $("#listingsGrid").addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === "view") openDetail(id);
            else if (action === "edit") {
                const item = Store.all().find((l) => l.id === id);
                openListingModal(item);
            }
        });

        // کلیک روی کارت‌های قرارداد
        $("#contractsGrid").addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === "viewContract") {
                const contract = ContractStore.all().find(c => c.id === id);
                if (contract) showPreview(contract);
            } else if (action === "editContract") {
                const contract = ContractStore.all().find(c => c.id === id);
                openContractModal(contract);
            } else if (action === "deleteContract") {
                askContractDelete(id);
            }
        });

        // مودال جزئیات
        $("#closeDetailModal").addEventListener("click", closeDetail);
        $("#closeDetailModal2").addEventListener("click", closeDetail);
        $("#detailEditBtn").addEventListener("click", () => {
            const item = Store.all().find((l) => l.id === detailId);
            closeDetail();
            openListingModal(item);
        });
        $("#detailDeleteBtn").addEventListener("click", () => {
            const id = detailId;
            closeDetail();
            askDelete(id);
        });

        // تایید حذف
        $("#confirmDeleteBtn").addEventListener("click", () => {
            if (pendingDeleteId) {
                Store.remove(pendingDeleteId);
                toast("فایل حذف شد.", 'success');
            }
            closeConfirm();
            renderListings();
            renderBackupStats();
        });
        $("#cancelDeleteBtn").addEventListener("click", closeConfirm);

        $("#confirmContractDeleteBtn").addEventListener("click", () => {
            if (pendingContractDeleteId) {
                ContractStore.remove(pendingContractDeleteId);
                toast("قرارداد حذف شد.", 'success');
            }
            closeContractConfirm();
            renderContracts();
            renderBackupStats();
        });
        $("#cancelContractDeleteBtn").addEventListener("click", closeContractConfirm);

        // پشتیبان‌گیری
        $("#btnFullBackup").addEventListener("click", downloadFullBackup);

        $("#btnRestoreTrigger").addEventListener("click", () => $("#btnRestore").click());
        $("#btnRestore").addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                showRestorePreview(file);
                e.target.value = "";
            }
        });

        $("#confirmRestoreBtn").addEventListener("click", performRestore);
        $("#cancelRestoreBtn").addEventListener("click", () => {
            $("#restoreConfirmModal").classList.add("hidden");
            restoreData = null;
        });

        // تنظیمات گیت‌هاب
        $("#saveGitHubSettings").addEventListener("click", () => {
            const token = $("#githubToken").value.trim();
            const owner = $("#githubOwner").value.trim();
            const repo = $("#githubRepo").value.trim();

            if (!token || !owner || !repo) {
                toast('لطفاً تمام فیلدها را پر کنید.', 'warning');
                return;
            }

            saveGitHubConfig(token, owner, repo);
            renderBackupStats();
            toast('تنظیمات گیت‌هاب ذخیره شد.', 'success');
        });

        $("#restoreFromGitHubBtn").addEventListener("click", restoreFromGitHub);

        // بستن مودال‌ها با کلیک بیرون
        [
            $("#listingModalOverlay"),
            $("#detailModalOverlay"),
            $("#confirmModalOverlay"),
            $("#confirmContractModalOverlay"),
            $("#loginOverlay"),
            $("#previewModalOverlay"),
            $("#contractModalOverlay"),
            $("#restoreConfirmModal")
        ].forEach((ov) => {
            if (ov) {
                ov.addEventListener("click", (e) => {
                    if (e.target === ov) ov.classList.add("hidden");
                });
            }
        });

        // دکمه ESC
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                $$(".modal-overlay").forEach((ov) => ov.classList.add("hidden"));
            }
        });

        // افزودن کاربر
        $("#btnAddUser").addEventListener("click", () => {
            if (!isAdmin) { toast('فقط مدیر می‌تواند کاربر اضافه کند.', 'warning'); return; }
            const username = $("#newUsername").value.trim();
            const password = $("#newPassword").value.trim();
            if (!username || !password) { toast('نام کاربری و رمز را وارد کنید.', 'warning'); return; }
            if (USERS.find(u => u.username === username)) { toast('این نام کاربری قبلاً ثبت شده.', 'warning'); return; }
            USERS.push({ username, password, displayName: username, role: 'agent' });
            saveUsers();
            $("#newUsername").value = "";
            $("#newPassword").value = "";
            renderUserList();
            renderBackupStats();
            toast('کاربر افزوده شد.', 'success');
        });
    }

    // ===== شروع =====
    function init() {
        Store.load();
        ContractStore.load();
        bindEvents();
        updateUIForAuth();
        renderListings();
        renderContracts();
        renderUserList();
        renderBackupStats();
        setupGitHubSettings();

        // شروع پشتیبان‌گیری خودکار
        setTimeout(() => {
            performAutoBackup();
        }, 5000);

        backupTimer = setInterval(performAutoBackup, BACKUP_INTERVAL);
        console.log('⏱ پشتیبان‌گیری خودکار هر', BACKUP_INTERVAL / 3600000, 'ساعت یکبار فعال شد');

        // پاک کردن پیش‌نویس قدیمی
        try {
            const draft = localStorage.getItem(LS_CONTRACT_DRAFT);
            if (draft) {
                const data = JSON.parse(draft);
                if (data._timestamp && Date.now() - data._timestamp > 86400000) {
                    localStorage.removeItem(LS_CONTRACT_DRAFT);
                }
            }
        } catch {}
    }

    document.addEventListener("DOMContentLoaded", init);
})();