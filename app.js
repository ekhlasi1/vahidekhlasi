/* ==========================================================================
   گروه مشاورین املاک اخلاصی — منطق برنامه
   ذخیره‌سازی: localStorage (سمت مرورگر). مناسب برای گیت‌هاب پیجز.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- تنظیمات ---------------- */
  // کاربران مجاز. برای افزودن مشاور جدید یک آبجکت به این آرایه اضافه کنید.
  const USERS = [
    { username: "admin", password: "ekhlasi1404", displayName: "مدیر سامانه" },
    { username: "reza", password: "reza1404", displayName: "رضا احمدی" },
  ];

  const LS_LISTINGS = "ekhlasi_listings_v1";
  const LS_SESSION = "ekhlasi_session_v1"; // sessionStorage
  const LS_REMEMBER = "ekhlasi_remember_v1"; // localStorage

  const TYPE_LABEL = { apartment: "آپارتمان", villa: "ویلا", land: "زمین" };
  const DEAL_LABEL = { sale: "فروش", rent: "اجاره" };
  const STATUS_LABEL = { available: "موجود", reserved: "بیعانه‌شده", sold: "فروخته/اجاره‌شده" };

  /* ---------------- ابزارها ---------------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function toast(msg) {
    const wrap = $("#toastWrap");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ---------------- داده نمونه اولیه ---------------- */
  function seedData() {
    return [
      {
        id: uid(), code: "EKH-1001", dealType: "sale", propertyType: "apartment",
        title: "آپارتمان نوساز سه‌خوابه، نمای رومی", region: "سعادت‌آباد",
        address: "خیابان سرو غربی، پلاک ۱۴", price: 6800000000, deposit: 0,
        area: 145, rooms: 3, status: "available", phone: "09121234567",
        image: "", desc: "طبقه ۴، دو کله، پارکینگ مسقف، آسانسور، نگهبانی ۲۴ ساعته.",
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        id: uid(), code: "EKH-1002", dealType: "rent", propertyType: "apartment",
        title: "اجاره واحد دو خوابه بازسازی‌شده", region: "پونک",
        address: "بلوار اباذر، خیابان گلستان", price: 400000000, deposit: 12000000,
        area: 92, rooms: 2, status: "available", phone: "09351234567",
        image: "", desc: "کابینت و کفپوش نو، فول امکانات، مناسب خانواده.",
        createdAt: Date.now() - 86400000 * 5,
      },
      {
        id: uid(), code: "EKH-1003", dealType: "sale", propertyType: "villa",
        title: "ویلای دوبلکس با استخر", region: "لواسان",
        address: "روستای افجه، خیابان اصلی", price: 45000000000, deposit: 0,
        area: 620, rooms: 5, status: "reserved", phone: "09191234567",
        image: "", desc: "باغ ۱۲۰۰ متری، سند تک‌برگ، استخر روباز و سونا.",
        createdAt: Date.now() - 86400000 * 10,
      },
      {
        id: uid(), code: "EKH-1004", dealType: "sale", propertyType: "land",
        title: "زمین مسکونی با مجوز ساخت", region: "شهریار",
        address: "جاده کردامیر، کیلومتر ۳", price: 8500000000, deposit: 0,
        area: 400, rooms: 0, status: "available", phone: "09121112233",
        image: "", desc: "کاربری مسکونی، دسترسی به آب و برق، سند شش‌دانگ.",
        createdAt: Date.now() - 86400000 * 14,
      },
    ];
  }

  /* ---------------- لایه داده ---------------- */
  const Store = {
    all() {
      try {
        const raw = localStorage.getItem(LS_LISTINGS);
        if (!raw) {
          const seed = seedData();
          localStorage.setItem(LS_LISTINGS, JSON.stringify(seed));
          return seed;
        }
        return JSON.parse(raw);
      } catch (e) {
        console.error("خطا در خواندن داده‌ها", e);
        return [];
      }
    },
    save(list) {
      localStorage.setItem(LS_LISTINGS, JSON.stringify(list));
    },
    nextCode(list) {
      const nums = list
        .map((l) => parseInt((l.code || "").replace(/\D/g, ""), 10))
        .filter((n) => !isNaN(n));
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
      const list = this.all().filter((l) => l.id !== id);
      this.save(list);
    },
  };

  /* ---------------- احراز هویت ---------------- */
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

  /* ---------------- وضعیت UI ---------------- */
  let editingId = null;
  let pendingDeleteId = null;
  let currentDeal = "sale";
  let currentType = "apartment";

  /* ---------------- رندر بخش ورود ---------------- */
  function updateBrandStats() {
    const list = Store.all();
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

  /* ---------------- فیلتر/جست‌وجو/مرتب‌سازی ---------------- */
  function getFilteredListings() {
    const q = ($("#searchInput").value || "").trim().toLowerCase();
    const deal = $('input[name="deal"]:checked').value;
    const types = $$('#typeFilter input:checked').map((i) => i.value);
    const statuses = $$('#statusFilter input:checked').map((i) => i.value);
    const sort = $("#sortSelect").value;

    let list = Store.all().filter((l) => {
      if (deal !== "all" && l.dealType !== deal) return false;
      if (!types.includes(l.propertyType)) return false;
      if (!statuses.includes(l.status)) return false;
      if (q) {
        const hay = [l.title, l.code, l.region, l.address, l.desc]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    switch (sort) {
      case "oldest": list.sort((a, b) => a.createdAt - b.createdAt); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      default: list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }

  /* ---------------- رندر کارت‌ها ---------------- */
  function cardMediaStyle(item) {
    return item.image ? `style="background-image:url('${escapeAttr(item.image)}')"` : "";
  }
  function typeIcon(t) {
    return t === "apartment" ? "🏢" : t === "villa" ? "🏡" : "🌿";
  }
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function priceLine(item) {
    if (item.dealType === "rent") {
      return `رهن ${fa(item.deposit)} / اجاره <b>${fa(item.price)}</b> <small>تومان</small>`;
    }
    return `${fa(item.price)} <small>تومان</small>`;
  }

  function renderCard(item) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="card-media" ${cardMediaStyle(item)}>
        ${item.image ? "" : `<span style="font-size:34px;">${typeIcon(item.propertyType)}</span>`}
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
        <button class="btn btn-ghost btn-sm" data-action="view" data-id="${item.id}">مشاهده</button>
        <button class="btn btn-brass btn-sm" data-action="edit" data-id="${item.id}">ویرایش</button>
      </div>
    `;
    return div;
  }

  function renderAll() {
    const grid = $("#listingsGrid");
    const list = getFilteredListings();
    grid.innerHTML = "";
    if (!list.length) {
      $("#emptyState").classList.remove("hidden");
    } else {
      $("#emptyState").classList.add("hidden");
      list.forEach((item) => grid.appendChild(renderCard(item)));
    }
    $("#resultsMeta").textContent = `${fa(list.length)} فایل از ${fa(Store.all().length)} فایل ثبت‌شده`;
    renderStats();
  }

  function renderStats() {
    const all = Store.all();
    $("#statTotal").textContent = fa(all.length);
    $("#statSale").textContent = fa(all.filter((l) => l.dealType === "sale").length);
    $("#statRent").textContent = fa(all.filter((l) => l.dealType === "rent").length);
    $("#statAvailable").textContent = fa(all.filter((l) => l.status === "available").length);
  }

  /* ---------------- فرم فایل (افزودن/ویرایش) ---------------- */
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

  function openListingModal(item) {
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
    $("#fImage").value = item ? item.image || "" : "";
    $("#fDesc").value = item ? item.desc || "" : "";

    $("#listingModalOverlay").classList.remove("hidden");
    setTimeout(() => $("#fTitle").focus(), 50);
  }
  function closeListingModal() {
    $("#listingModalOverlay").classList.add("hidden");
    editingId = null;
  }

  function handleListingSubmit(e) {
    e.preventDefault();
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
      image: $("#fImage").value.trim(),
      desc: $("#fDesc").value.trim(),
    };
    if (!data.title || !data.region || !data.price || !data.area) {
      toast("لطفاً فیلدهای ستاره‌دار را کامل کنید.");
      return;
    }
    if (editingId) {
      Store.update(editingId, data);
      toast("فایل با موفقیت ویرایش شد.");
    } else {
      Store.add(data);
      toast("فایل جدید با موفقیت ثبت شد.");
    }
    closeListingModal();
    renderAll();
  }

  /* ---------------- مودال جزئیات ---------------- */
  let detailId = null;
  function openDetail(id) {
    const item = Store.all().find((l) => l.id === id);
    if (!item) return;
    detailId = id;
    const body = $("#detailBody");
    body.innerHTML = `
      <div class="detail-media" ${cardMediaStyle(item)}>
        ${item.image ? "" : `<span style="font-size:44px;">${typeIcon(item.propertyType)}</span>`}
      </div>
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
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
        <div><b>تماس</b>${escapeHtml(item.phone) || "—"}</div>
      </div>
      ${item.desc ? `<div class="detail-desc">${escapeHtml(item.desc)}</div>` : ""}
      <div class="detail-contact"><span>تاریخ ثبت</span><span>${new Date(item.createdAt).toLocaleDateString("fa-IR")}</span></div>
    `;
    $("#detailModalOverlay").classList.remove("hidden");
  }
  function closeDetail() {
    $("#detailModalOverlay").classList.add("hidden");
    detailId = null;
  }

  /* ---------------- حذف ---------------- */
  function askDelete(id) {
    pendingDeleteId = id;
    $("#confirmModalOverlay").classList.remove("hidden");
  }
  function closeConfirm() {
    $("#confirmModalOverlay").classList.add("hidden");
    pendingDeleteId = null;
  }

  /* ---------------- خروجی/ورودی JSON ---------------- */
  function exportJSON() {
    const data = JSON.stringify(Store.all(), null, 2);
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
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("invalid");
        Store.save(parsed);
        renderAll();
        toast("فایل‌ها با موفقیت بارگذاری شدند.");
      } catch (e) {
        toast("فایل ورودی معتبر نیست.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- اتصال رویدادها ---------------- */
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

    $("#searchInput").addEventListener("input", renderAll);
    $("#sortSelect").addEventListener("change", renderAll);
    $("#dealFilter").addEventListener("change", renderAll);
    $("#typeFilter").addEventListener("change", renderAll);
    $("#statusFilter").addEventListener("change", renderAll);

    $("#btnNewListing").addEventListener("click", () => openListingModal(null));
    $("#btnEmptyNew").addEventListener("click", () => openListingModal(null));
    $("#closeListingModal").addEventListener("click", closeListingModal);
    $("#cancelListingModal").addEventListener("click", closeListingModal);
    $("#listingForm").addEventListener("submit", handleListingSubmit);

    $$("#dealSeg button").forEach((b) => b.addEventListener("click", () => {
      currentDeal = b.dataset.val; setSeg("dealSeg", currentDeal); toggleDealFields();
    }));
    $$("#typeSeg button").forEach((b) => b.addEventListener("click", () => {
      currentType = b.dataset.val; setSeg("typeSeg", currentType); toggleTypeFields();
    }));

    $("#listingsGrid").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === "view") openDetail(id);
      if (btn.dataset.action === "edit") {
        const item = Store.all().find((l) => l.id === id);
        openListingModal(item);
      }
    });

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

    $("#confirmDeleteBtn").addEventListener("click", () => {
      if (pendingDeleteId) {
        Store.remove(pendingDeleteId);
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

    // بستن مودال‌ها با کلیک روی پس‌زمینه یا Escape
    [$("#listingModalOverlay"), $("#detailModalOverlay"), $("#confirmModalOverlay")].forEach((ov) => {
      ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.add("hidden"); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        $$(".modal-overlay").forEach((ov) => ov.classList.add("hidden"));
      }
    });
  }

  /* ---------------- شروع برنامه ---------------- */
  function init() {
    bindEvents();
    const session = Auth.getSession();
    if (session) showApp(session);
    else showLogin();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
