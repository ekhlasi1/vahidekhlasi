/* ==========================================================================
   گروه مشاورین املاک اخلاصی — منطق برنامه (نسخه‌ی نهایی با گیت‌هاب)
   ========================================================================== */
(function () {
  "use strict";

  // ===== تنظیمات GitHub (توکن و مخزن) =====
  const GITHUB_TOKEN = "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";
  const REPO_OWNER = "your-username";      // <-- اینجا نام کاربری گیت‌هاب خود را بنویس
  const REPO_NAME = "your-repo-name";      // <-- اینجا نام مخزن خود را بنویس
  const FILE_PATH = "data/listings.json";
  const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  // ===== کاربران =====
  const USERS = [
    { username: "admin", password: "ekhlasi1404", displayName: "مدیر سامانه" },
    { username: "reza", password: "reza1404", displayName: "رضا احمدی" },
  ];

  const LS_SESSION = "ekhlasi_session_v1";
  const LS_REMEMBER = "ekhlasi_remember_v1";
  const LS_BACKUP = "ekhlasi_listings_backup";

  const TYPE_LABEL = { apartment: "آپارتمان", villa: "ویلا", land: "زمین" };
  const DEAL_LABEL = { sale: "فروش", rent: "اجاره" };
  const STATUS_LABEL = { available: "موجود", reserved: "بیعانه‌شده", sold: "فروخته/اجاره‌شده" };

  // ===== ابزارها =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  let timeoutId = null;

  function toast(msg) {
    const wrap = $("#toastWrap");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ===== لایه داده =====
  const Store = {
    _cache: null,

    async fetchFromGitHub() {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const content = atob(data.content);
        return JSON.parse(content);
      } catch {
        const backup = localStorage.getItem(LS_BACKUP);
        if (backup) {
          try { return JSON.parse(backup); } catch {}
        }
        return this.getDefaultData();
      }
    },

    async saveToGitHub(list) {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        });
        let sha = null;
        if (res.ok) {
          const data = await res.json();
          sha = data.sha;
        }
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2))));
        const body = { message: "به‌روزرسانی", content };
        if (sha) body.sha = sha;

        const putRes = await fetch(API_URL, {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!putRes.ok) throw new Error();
        this._cache = list;
        localStorage.setItem(LS_BACKUP, JSON.stringify(list));
        return true;
      } catch {
        toast("⚠️ خطا در ذخیره! داده در حافظه‌ی موقت نگهداری شد.");
        localStorage.setItem(LS_BACKUP, JSON.stringify(list));
        return false;
      }
    },

    getDefaultData() {
      return [
        {
          id: uid(), code: "EKH-1001", dealType: "sale", propertyType: "apartment",
          title: "آپارتمان نوساز سه‌خوابه، نمای رومی", region: "سعادت‌آباد",
          address: "خیابان سرو غربی، پلاک ۱۴", price: 6800000000, deposit: 0,
          area: 145, rooms: 3, status: "available", phone: "09121234567",
          images: [], desc: "طبقه ۴، دو کله، پارکینگ مسقف، آسانسور، نگهبانی ۲۴ ساعته.",
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          id: uid(), code: "EKH-1002", dealType: "rent", propertyType: "apartment",
          title: "اجاره واحد دو خوابه بازسازی‌شده", region: "پونک",
          address: "بلوار اباذر، خیابان گلستان", price: 400000000, deposit: 12000000,
          area: 92, rooms: 2, status: "available", phone: "09351234567",
          images: [], desc: "کابینت و کفپوش نو، فول امکانات، مناسب خانواده.",
          createdAt: Date.now() - 86400000 * 5,
        },
        {
          id: uid(), code: "EKH-1003", dealType: "sale", propertyType: "villa",
          title: "ویلای دوبلکس با استخر", region: "لواسان",
          address: "روستای افجه، خیابان اصلی", price: 45000000000, deposit: 0,
          area: 620, rooms: 5, status: "reserved", phone: "09191234567",
          images: [], desc: "باغ ۱۲۰۰ متری، سند تک‌برگ، استخر روباز و سونا.",
          createdAt: Date.now() - 86400000 * 10,
        },
        {
          id: uid(), code: "EKH-1004", dealType: "sale", propertyType: "land",
          title: "زمین مسکونی با مجوز ساخت", region: "شهریار",
          address: "جاده کردامیر، کیلومتر ۳", price: 8500000000, deposit: 0,
          area: 400, rooms: 0, status: "available", phone: "09121112233",
          images: [], desc: "کاربری مسکونی، دسترسی به آب و برق، سند شش‌دانگ.",
          createdAt: Date.now() - 86400000 * 14,
        },
      ];
    },

    async all() {
      if (this._cache) return this._cache;
      const data = await this.fetchFromGitHub();
      this._cache = data;
      return data;
    },

    async save(list) {
      this._cache = list;
      await this.saveToGitHub(list);
    },

    nextCode(list) {
      const nums = list
        .map((l) => parseInt((l.code || "").replace(/\D/g, ""), 10))
        .filter((n) => !isNaN(n));
      const next = (nums.length ? Math.max(...nums) : 1000) + 1;
      return "EKH-" + next;
    },

    async add(item) {
      const list = await this.all();
      item.id = uid();
      item.code = this.nextCode(list);
      item.createdAt = Date.now();
      list.unshift(item);
      await this.save(list);
      return item;
    },

    async update(id, patch) {
      const list = await this.all();
      const idx = list.findIndex((l) => l.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      await this.save(list);
      return list[idx];
    },

    async remove(id) {
      let list = await this.all();
      list = list.filter((l) => l.id !== id);
      await this.save(list);
    },
  };

  // ===== احراز هویت =====
  const Auth = {
    tryLogin(username, password) {
      return USERS.find((u) => u.username === username && u.password === password) || null;
    },
    setSession(user, remember) {
      const payload = JSON.stringify({ username: user.username, displayName: user.displayName });
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
  };

  // ===== وضعیت =====
  let editingId = null;
  let pendingDeleteId = null;
  let currentDeal = "sale";
  let currentType = "apartment";
  let viewMode = false;

  // ===== رندرها =====
  async function updateBrandStats() {
    const list = await Store.all();
    $("#statTotalBrand").textContent = fa(list.length);
    $("#statSaleBrand").textContent = fa(list.filter((l) => l.dealType === "sale").length);
    $("#statRentBrand").textContent = fa(list.filter((l) => l.dealType === "rent").length);
  }

  function showLogin() {
    $("#loginScreen").classList.remove("hidden");
    $("#appShell").classList.add("hidden");
    updateBrandStats();
  }

  function showApp(user) {
    $("#loginScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#agentName").textContent = user.displayName || user.username;
    renderAll();
  }

  // ===== فیلتر و جستجو (ساده و سریع) =====
  async function getFilteredListings() {
    const q = ($("#searchInput").value || "").trim().toLowerCase();
    const deal = $('input[name="deal"]:checked').value;
    const types = $$('#typeFilter input:checked');
    const statuses = $$('#statusFilter input:checked');

    let list = await Store.all();
    list = list.filter((l) => {
      if (deal !== "all" && l.dealType !== deal) return false;
      
      let typeOk = false;
      for (let t of types) {
        if (t.value === l.propertyType) { typeOk = true; break; }
      }
      if (!typeOk) return false;

      let statusOk = false;
      for (let s of statuses) {
        if (s.value === l.status) { statusOk = true; break; }
      }
      if (!statusOk) return false;

      if (q) {
        const title = (l.title || "").toLowerCase();
        const code = (l.code || "").toLowerCase();
        if (!title.includes(q) && !code.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }

  // ===== رندر کارت‌ها =====
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
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

  function renderCard(item) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="card-media">
        ${imagesHTML(item.images)}
        <span class="card-status status-${item.status}">${STATUS_LABEL[item.status]}</span>
        <span class="deal-badge">${DEAL_LABEL[item.dealType]}</span>
      </div>
      <div class="card-body">
        <div class="card-code">${item.code} · ${TYPE_LABEL[item.propertyType]}</div>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <div class="card-loc">📍 ${escapeHtml(item.region)}</div>
        <div class="card-meta">
          <span>📐 ${fa(item.area)} متر</span>
          ${item.rooms ? `<span>🛏 ${fa(item.rooms)} خواب</span>` : ""}
        </div>
        <div class="card-price">${priceLine(item)}</div>
      </div>
      <div class="card-actions">
        ${viewMode
          ? `<button class="btn btn-ghost btn-sm" data-action="viewPublic" data-id="${item.id}">مشاهده عمومی</button>`
          : `<button class="btn btn-ghost btn-sm" data-action="view" data-id="${item.id}">مشاهده</button>
             <button class="btn btn-brass btn-sm" data-action="edit" data-id="${item.id}">ویرایش</button>`
        }
      </div>
    `;
    return div;
  }

  async function renderAll() {
    const grid = $("#listingsGrid");
    const list = await getFilteredListings();
    grid.innerHTML = "";
    if (!list.length) {
      $("#emptyState").classList.remove("hidden");
    } else {
      $("#emptyState").classList.add("hidden");
      list.forEach((item) => grid.appendChild(renderCard(item)));
    }
    const total = (await Store.all()).length;
    $("#resultsMeta").textContent = `${fa(list.length)} فایل از ${fa(total)} فایل ثبت‌شده`;
    renderStats();
  }

  async function renderStats() {
    const all = await Store.all();
    $("#statTotal").textContent = fa(all.length);
    $("#statSale").textContent = fa(all.filter((l) => l.dealType === "sale").length);
    $("#statRent").textContent = fa(all.filter((l) => l.dealType === "rent").length);
    $("#statAvailable").textContent = fa(all.filter((l) => l.status === "available").length);
  }

  // ===== فرم =====
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

  async function openListingModal(item) {
    editingId = item ? item.id : null;
    $("#listingModalTitle").textContent = item ? "ویرایش فایل" : "ثبت فایل جدید";
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

    if (item && item.images && item.images.length) {
      if (item.images[0]) {
        const img = document.createElement("img");
        img.src = item.images[0];
        $("#preview1").appendChild(img);
      }
      if (item.images[1]) {
        const img = document.createElement("img");
        img.src = item.images[1];
        $("#preview2").appendChild(img);
      }
    }

    $("#listingModalOverlay").classList.remove("hidden");
    setTimeout(() => $("#fTitle").focus(), 50);
  }

  function closeListingModal() {
    $("#listingModalOverlay").classList.add("hidden");
    editingId = null;
  }

  function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    input.addEventListener("change", function () {
      preview.innerHTML = "";
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement("img");
        img.src = ev.target.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleListingSubmit(e) {
    e.preventDefault();

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
      const existing = await Store.all();
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
      toast("لطفاً فیلدهای ستاره‌دار را کامل کنید.");
      return;
    }

    if (editingId) {
      await Store.update(editingId, data);
      toast("فایل ویرایش شد.");
    } else {
      await Store.add(data);
      toast("فایل جدید ثبت شد.");
    }
    closeListingModal();
    renderAll();
  }

  // ===== مودال‌ها =====
  let detailId = null;

  function openDetail(id) {
    const item = Store._cache.find((l) => l.id === id);
    if (!item) return;
    detailId = id;
    const body = $("#detailBody");
    body.innerHTML = buildDetailHTML(item, false);
    $("#detailModalOverlay").classList.remove("hidden");
  }

  function closeDetail() {
    $("#detailModalOverlay").classList.add("hidden");
    detailId = null;
  }

  function openPublicView(id) {
    const item = Store._cache.find((l) => l.id === id);
    if (!item) return;
    const body = $("#viewBody");
    body.innerHTML = buildDetailHTML(item, true);
    $("#viewModalOverlay").classList.remove("hidden");
  }

  function closePublicView() {
    $("#viewModalOverlay").classList.add("hidden");
  }

  function buildDetailHTML(item, isPublic) {
    const imagesHTML = (item.images && item.images.length)
      ? `<div class="images-grid">${item.images.map(src => `<img src="${escapeHtml(src)}" alt="تصویر" />`).join('')}</div>`
      : `<span style="font-size:44px;">${item.propertyType === "apartment" ? "🏢" : item.propertyType === "villa" ? "🏡" : "🌿"}</span>`;

    const contactHTML = isPublic
      ? `<div class="agent-phone">📞 تماس با مشاور: ${escapeHtml(item.phone)}</div>`
      : `<div><b>شماره تماس مشاور</b>${escapeHtml(item.phone) || "—"}</div>`;

    return `
      <div class="detail-media">${imagesHTML}</div>
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px; flex-wrap:wrap;">
        <span class="card-status status-${item.status}">${STATUS_LABEL[item.status]}</span>
        <span class="deal-badge" style="position:static;">${DEAL_LABEL[item.dealType]}</span>
        <span class="card-code">${item.code}</span>
      </div>
      <h2 style="margin:6px 0;">${escapeHtml(item.title)}</h2>
      <div class="card-price" style="font-size:19px;">${priceLine(item)}</div>
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

  // ===== حذف =====
  function askDelete(id) {
    pendingDeleteId = id;
    $("#confirmModalOverlay").classList.remove("hidden");
  }

  function closeConfirm() {
    $("#confirmModalOverlay").classList.add("hidden");
    pendingDeleteId = null;
  }

  // ===== خروجی/ورودی =====
  function exportJSON() {
    const data = JSON.stringify(Store._cache || [], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ekhlasi-listings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("فایل پشتیبان دانلود شد.");
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error();
        await Store.save(parsed);
        renderAll();
        toast("فایل‌ها بارگذاری شدند.");
      } catch {
        toast("فایل ورودی معتبر نیست.");
      }
    };
    reader.readAsText(file);
  }

  // ===== اتصال رویدادها =====
  function bindEvents() {
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
      showApp(user);
    });

    $("#btnLogout").addEventListener("click", () => {
      Auth.logout();
      showLogin();
    });

    $("#searchInput").addEventListener("input", () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => renderAll(), 300);
    });

    $("#dealFilter").addEventListener("change", renderAll);
    $("#typeFilter").addEventListener("change", renderAll);
    $("#statusFilter").addEventListener("change", renderAll);

    $("#btnNewListing").addEventListener("click", () => openListingModal(null));
    $("#btnEmptyNew").addEventListener("click", () => openListingModal(null));

    $("#closeListingModal").addEventListener("click", closeListingModal);
    $("#cancelListingModal").addEventListener("click", closeListingModal);
    $("#listingForm").addEventListener("submit", handleListingSubmit);

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

    $("#listingsGrid").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "view") openDetail(id);
      else if (action === "edit") {
        const item = Store._cache.find((l) => l.id === id);
        openListingModal(item);
      } else if (action === "viewPublic") {
        openPublicView(id);
      }
    });

    $("#closeDetailModal").addEventListener("click", closeDetail);
    $("#closeDetailModal2").addEventListener("click", closeDetail);
    $("#detailEditBtn").addEventListener("click", () => {
      const item = Store._cache.find((l) => l.id === detailId);
      closeDetail();
      openListingModal(item);
    });
    $("#detailDeleteBtn").addEventListener("click", () => {
      const id = detailId;
      closeDetail();
      askDelete(id);
    });

    $("#closeViewModal").addEventListener("click", closePublicView);
    $("#closeViewModal2").addEventListener("click", closePublicView);
    $("#viewModalOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closePublicView();
    });

    $("#confirmDeleteBtn").addEventListener("click", async () => {
      if (pendingDeleteId) {
        await Store.remove(pendingDeleteId);
        toast("فایل حذف شد.");
      }
      closeConfirm();
      renderAll();
    });
    $("#cancelDeleteBtn").addEventListener("click", closeConfirm);

    $("#btnExport").addEventListener("click", exportJSON);
    $("#btnImportTrigger").addEventListener("click", () => $("#btnImport").click());
    $("#btnImport").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) importJSON(file);
      e.target.value = "";
    });

    $("#btnToggleView").addEventListener("click", () => {
      viewMode = !viewMode;
      $("#btnToggleView").textContent = viewMode ? "🔙 بازگشت به مدیریت" : "👁 نمایش عمومی";
      renderAll();
    });

    [
      $("#listingModalOverlay"),
      $("#detailModalOverlay"),
      $("#confirmModalOverlay")
    ].forEach((ov) => {
      ov.addEventListener("click", (e) => {
        if (e.target === ov) ov.classList.add("hidden");
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        $$(".modal-overlay").forEach((ov) => ov.classList.add("hidden"));
      }
    });
  }

  // ===== شروع =====
  async function init() {
    bindEvents();
    await Store.all();
    const session = Auth.getSession();
    if (session) showApp(session);
    else showLogin();
  }

  document.addEventListener("DOMContentLoaded", init);
})();