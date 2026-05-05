/**
 * BK Store — Наливна парфумерія
 * app.js — Main Application Script
 * v2.0
 */

"use strict";

/* ============================================
   PRICING CONFIG
   ============================================ */
const PRICING = [
  { min: 1, max: 2, price: 160 },
  { min: 3, max: 4, price: 150 },
  { min: 5, max: 9, price: 140 },
  { min: 10, max: 24, price: 130 },
  { min: 25, max: Infinity, price: 120 },
];

const BASE_UNIT_PRICE = 160;
const PAYMENT_LINK_BASE = "https://send.monobank.ua/jar/7EqpnmhGqJ";
const STORE_EMAIL = "bkparfume@ukr.net";
const ORDER_EMAIL_PROXY_ENDPOINT =
  window.BK_CONFIG?.orderWorkerEndpoint?.trim() || "";
const ORDER_EMAIL_FALLBACK_ENDPOINT = `https://formsubmit.co/ajax/${STORE_EMAIL}`;
const IP_LOOKUP_TIMEOUT_MS = 2000;
const EMAIL_BEFORE_REDIRECT_TIMEOUT_MS = 1500;
const CUSTOMER_EMAIL_STORAGE_KEY = "bk_customer_email";
const PRODUCTS_DATA_URL = "/data/products.json";
const INITIAL_RENDER_COUNT = 8;
const RENDER_CHUNK_SIZE = 12;
const IP_LOOKUP_SOURCES = [
  "https://api.ipify.org?format=json",
  "https://ipapi.co/json/",
  "https://ifconfig.co/json",
];

let cachedClientIp = null;
let clientIpPromise = null;

function getPriceByQty(qty) {
  return PRICING.find((t) => qty >= t.min && qty <= t.max)?.price ?? 160;
}

function getPriceHint(qty) {
  const unitPrice = getPriceByQty(qty);
  const savings = Math.max(0, (BASE_UNIT_PRICE - unitPrice) * qty);

  if (savings > 0) {
    return `💰 Вигода: ${savings} грн`;
  }

  return "";
}

const CATEGORY_LABELS = {
  women: "Жіночий",
  men: "Чоловічий",
  unisex: "Унісекс",
};

const VALID_CATALOG_FILTERS = new Set(["all", "women", "men", "unisex"]);

/* ============================================
   STATE
   ============================================ */
let products = [];
let cart = JSON.parse(localStorage.getItem("bk_cart") || "[]");
let currentFilter = "women";
let currentProductId = null;
let currentCheckoutOrderId = null;
let productsRenderPassId = 0;
let lastFocusedElement = null;
let cartBadgeAnimationFrameId = 0;

/* ============================================
   DOM REFS
   ============================================ */
const $ = (id) => document.getElementById(id);

const DOM = {
  productsGrid: $("productsGrid"),
  loader: $("loader"),
  noResults: $("noResults"),

  // Nav & filter
  navLinks: document.querySelectorAll(".nav__link"),
  filterBtns: document.querySelectorAll(".filter-btn"),

  // Header
  header: $("header"),
  headerLogo: document.querySelector("header .logo"),
  burgerBtn: $("burgerBtn"),
  nav: $("nav"),

  // Search
  searchToggle: $("searchToggle"),
  searchClose: $("searchClose"),
  searchBar: $("searchBar"),
  searchInput: $("searchInput"),

  // Modal
  modalOverlay: $("modalOverlay"),
  modal: $("modal"),
  modalClose: $("modalClose"),
  modalImage: $("modalImage"),
  modalBadgeWrap: $("modalBadgeWrap"),
  modalBrand: $("modalBrand"),
  modalTitle: $("modalTitle"),
  modalCategory: $("modalCategory"),
  modalDescription: $("modalDescription"),
  modalNotes: $("modalNotes"),
  modalNotesWrap: $("modalNotesWrap"),
  modalPrice: $("modalPrice"),
  modalVolume: $("modalVolume"),
  qtyInput: $("qtyInput"),
  qtyMinus: $("qtyMinus"),
  qtyPlus: $("qtyPlus"),
  priceHint: $("priceHint"),
  modalBuyBtn: $("modalBuyBtn"),

  // Cart
  cartBadge: $("cartBadge"),
  cartToggle: $("cartToggle"),
  cartOverlay: $("cartOverlay"),
  cartPanel: $("cartPanel"),
  cartPanelClose: $("cartPanelClose"),
  cartBody: $("cartBody"),
  cartEmpty: $("cartEmpty"),
  cartFooter: $("cartFooter"),
  cartTotalQty: $("cartTotalQty"),
  cartUnitPrice: $("cartUnitPrice"),
  cartTotal: $("cartTotal"),
  cartDiscount: $("cartDiscount"),
  cartDiscountText: $("cartDiscountText"),
  cartOrderBtn: $("cartOrderBtn"),
  cartCheckoutForm: $("cartCheckoutForm"),
  checkoutName: $("checkoutName"),
  checkoutPhone: $("checkoutPhone"),
  checkoutEmail: $("checkoutEmail"),
  checkoutAddress: $("checkoutAddress"),
  checkoutNpBranch: $("checkoutNpBranch"),
  checkoutAmount: $("checkoutAmount"),
  checkoutPayBtn: $("checkoutPayBtn"),
  checkoutNameError: $("checkoutNameError"),
  checkoutPhoneError: $("checkoutPhoneError"),
  checkoutEmailError: $("checkoutEmailError"),
  checkoutNpError: $("checkoutNpError"),

  // Form
  contactForm: $("contactForm"),
  formName: $("formName"),
  formPhone: $("formPhone"),
  formEmail: $("formEmail"),
  formMessage: $("formMessage"),
  formSubmit: $("formSubmit"),
  formSuccess: $("formSuccess"),
  nameError: $("nameError"),
  phoneError: $("phoneError"),
  emailError: $("emailError"),

  // Misc
  backToTop: $("backToTop"),
};

/* ============================================
   LOAD PRODUCTS
   ============================================ */
async function loadProducts() {
  const response = await fetch(PRODUCTS_DATA_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to load catalog: ${response.status}`);
  }

  products = await response.json();
}

/* ============================================
   RENDER PRODUCTS
   ============================================ */
function renderProducts(list) {
  productsRenderPassId += 1;
  const renderPassId = productsRenderPassId;

  // Remove loader
  if (DOM.loader) DOM.loader.remove();

  DOM.productsGrid.innerHTML = "";

  if (!list.length) {
    DOM.noResults.style.display = "block";
    return;
  }
  DOM.noResults.style.display = "none";

  const appendChunk = (startIndex, chunkSize) => {
    if (renderPassId !== productsRenderPassId) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const endIndex = Math.min(startIndex + chunkSize, list.length);

    for (let index = startIndex; index < endIndex; index += 1) {
      const card = createCard(list[index], index);
      fragment.appendChild(card);
    }

    DOM.productsGrid.appendChild(fragment);

    if (endIndex >= list.length) {
      return;
    }

    runWhenIdle(() => appendChunk(endIndex, RENDER_CHUNK_SIZE), 600);
  };

  appendChunk(0, INITIAL_RENDER_COUNT);

  // Also run general reveal for other sections
  observeReveal();
}

function createCard(p, delay = 0) {
  const div = document.createElement("div");
  div.className = "product-card";

  div.dataset.id = p.id;
  div.dataset.name = p.name;
  div.dataset.brand = p.brand;
  div.dataset.category = p.category;
  div.dataset.desc = p.description;
  div.dataset.notes = p.notes;
  div.dataset.image = p.image;
  div.dataset.badge = p.badge || "";
  div.dataset.volume = p.volume;

  const catLabel = CATEGORY_LABELS[p.category] || p.category;
  const badgeHtml = p.badge
    ? `<span class="product-card__badge">${p.badge}</span>`
    : "";
  const originalImagePath = normalizeCatalogImagePath(p.image);
  const imagePath = getCatalogCardImagePath(p.image);
  const imageLoading = delay < 6 ? "eager" : "lazy";
  const imageFetchPriority = delay < 2 ? "high" : "auto";

  // Генеруємо описовий alt текст для SEO
  const altText = `${p.name} від ${p.brand} - парфум для ${CATEGORY_LABELS[p.category] || p.category} ${p.volume}`;

  div.innerHTML = `
    <div class="product-card__image-wrap">
      <img
        class="product-card__image"
        src="${imagePath}"
        data-image-src="${imagePath}"
        data-original-src="${originalImagePath}"
        alt="${altText}"
        title="${p.name}"
        loading="${imageLoading}"
        fetchpriority="${imageFetchPriority}"
        decoding="async"
        width="300"
        height="300"
        onload="handleProductImageLoad(this)"
        onerror="handleProductImageError(this)"
      />
      <div class="product-card__placeholder" style="display:none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M12 2C9.2 2 7 4.7 7 8c0 4.5 5 12 5 12s5-7.5 5-12c0-3.3-2.2-6-5-6z"/>
          <circle cx="12" cy="8" r="2"/>
        </svg>
        <span>Фото тимчасово недоступне</span>
      </div>
      ${badgeHtml}
      <div class="product-card__overlay">
        <span class="product-card__overlay-text">Детальніше</span>
      </div>
    </div>
    <div class="product-card__body">
      <p class="product-card__category">${catLabel}</p>
      <h3 class="product-card__name">${p.name}</h3>
      <p class="product-card__brand">${p.volume}</p>
      <div class="product-card__footer">
        <div>
          <div class="product-card__price">160 грн</div>
          <div class="product-card__price-hint">від 110 мл</div>
        </div>
        <button type="button" class="product-card__quick-add" data-id="${p.id}" aria-label="Швидко додати до кошика">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
  return div;
}

function normalizeCatalogImagePath(imagePath) {
  if (!imagePath) {
    return "/images/products/favicon-32.png";
  }

  return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
}

function getCatalogCardImagePath(imagePath) {
  const normalizedPath = normalizeCatalogImagePath(imagePath);

  if (!normalizedPath.startsWith("/images/products/")) {
    return normalizedPath;
  }

  const fileName = normalizedPath.split("/").pop() || "";
  if (
    !fileName.endsWith(".png") ||
    fileName.startsWith("article-") ||
    fileName.startsWith("favicon-") ||
    fileName === "apple-touch-icon.png" ||
    fileName === "icon-bk.png"
  ) {
    return normalizedPath;
  }

  return normalizedPath
    .replace("/images/products/", "/images/products/thumbs/")
    .replace(/\.png$/i, ".jpg");
}

function handleProductImageLoad(image) {
  const placeholder = image.nextElementSibling;

  if (placeholder) {
    placeholder.style.display = "none";
  }

  image.style.display = "block";
}

function handleProductImageError(image) {
  const primarySrc = image.dataset.imageSrc || "";
  const originalSrc = image.dataset.originalSrc || primarySrc;

  if (
    !image.dataset.fallbackTried &&
    primarySrc &&
    primarySrc !== originalSrc
  ) {
    image.dataset.fallbackTried = "1";
    image.src = originalSrc;
    return;
  }

  if (!image.dataset.retry && originalSrc) {
    image.dataset.retry = "1";
    image.src = `${originalSrc}?v=${Date.now()}`;
    return;
  }

  image.style.display = "none";

  const placeholder = image.nextElementSibling;
  if (placeholder) {
    placeholder.style.display = "flex";
  }
}

/* ============================================
   FILTER / SEARCH
   ============================================ */
function filterProducts(filter, search = "") {
  currentFilter = filter;
  const q = search.toLowerCase().trim();

  const filtered = products.filter((p) => {
    const matchFilter = filter === "all" || p.category === filter;
    if (!q) return matchFilter;

    const searchTerms = q.split(/\s+/).filter((term) => term.length > 0);
    const searchableText = (
      p.name +
      " " +
      p.brand +
      " " +
      p.description +
      " " +
      p.notes
    ).toLowerCase();

    const matchSearch = searchTerms.every((term) =>
      searchableText.includes(term),
    );
    return matchFilter && matchSearch;
  });

  renderProducts(filtered);
}

function syncCatalogControls(filter) {
  DOM.filterBtns.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === filter),
    );
  });

  DOM.navLinks.forEach((link) => {
    const linkFilter = link.dataset.filter;

    if (!linkFilter) {
      return;
    }

    link.classList.toggle("active", linkFilter === filter);
  });
}

function getInitialCatalogFilter() {
  const bodyFilter = document.body?.dataset?.initialFilter || "";
  const urlFilter =
    new URLSearchParams(window.location.search).get("category") || "";
  const normalizedFilter = (bodyFilter || urlFilter || "women")
    .trim()
    .toLowerCase();

  return VALID_CATALOG_FILTERS.has(normalizedFilter)
    ? normalizedFilter
    : "women";
}

function isHomeCatalogPage() {
  const pathname = window.location.pathname || "/";
  return pathname === "/" || pathname.endsWith("/index.html");
}

let catalogScrollSyncTimeout = 0;
let catalogScrollFollowUpTimeouts = [];

function cancelCatalogScrollSync() {
  if (catalogScrollSyncTimeout) {
    window.clearTimeout(catalogScrollSyncTimeout);
    catalogScrollSyncTimeout = 0;
  }

  catalogScrollFollowUpTimeouts.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  catalogScrollFollowUpTimeouts = [];
}

function scrollToCatalog(behavior = "smooth") {
  const catalogSection = document.getElementById("catalog");
  const catalogAnchor =
    catalogSection?.querySelector(".catalog__header") || catalogSection;
  const header = document.getElementById("header");

  if (!catalogAnchor) {
    return;
  }

  const headerHeight = header?.getBoundingClientRect().height || 0;
  const targetTop = Math.max(
    0,
    window.scrollY +
      catalogAnchor.getBoundingClientRect().top -
      (headerHeight + 5),
  );

  window.scrollTo({ top: targetTop, behavior });

  if (window.location.hash !== "#catalog") {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#catalog`,
    );
  }
}

function syncCatalogScrollPosition(behavior = "smooth") {
  scrollToCatalog(behavior);

  requestAnimationFrame(() => scrollToCatalog("auto"));

  cancelCatalogScrollSync();

  catalogScrollSyncTimeout = window.setTimeout(() => {
    scrollToCatalog("auto");
    catalogScrollSyncTimeout = 0;
  }, 300);

  catalogScrollFollowUpTimeouts = [900, 1800, 2800].map((delay, index, all) =>
    window.setTimeout(() => {
      scrollToCatalog("auto");

      if (index === all.length - 1) {
        catalogScrollFollowUpTimeouts = [];
      }
    }, delay),
  );
}

function scrollToPageTop(behavior = "auto") {
  cancelCatalogScrollSync();
  window.scrollTo({ top: 0, behavior });

  if (window.location.hash) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
}

function initHomeLogoLink() {
  if (!DOM.headerLogo) {
    return;
  }

  DOM.headerLogo.addEventListener("click", (event) => {
    if (!isHomeCatalogPage()) {
      return;
    }

    event.preventDefault();
    DOM.burgerBtn?.classList.remove("open");
    DOM.nav?.classList.remove("open");
    scrollToPageTop("auto");
  });
}

function initCatalogAnchorLinks() {
  document
    .querySelectorAll(
      'a[href="#catalog"], a[href="index.html#catalog"], a[href="/index.html#catalog"], a[href="/#catalog"]',
    )
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        if (!isHomeCatalogPage()) {
          return;
        }

        event.preventDefault();
        syncCatalogScrollPosition(
          link.classList.contains("hero__btn") ? "auto" : "smooth",
        );
      });
    });
}

function syncMobileCatalogFilters() {
  const allFilterButton = document.querySelector(
    '.catalog__filters .filter-btn[data-filter="all"]',
  );

  if (!allFilterButton) {
    return;
  }

  allFilterButton.style.display = window.matchMedia("(max-width: 768px)")
    .matches
    ? "none"
    : "";
}

// Nav links
DOM.navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    const filter = link.dataset.filter;
    // Allow normal navigation for links without data-filter (e.g., articles.html)
    if (!filter) return;

    e.preventDefault();
    DOM.navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    // Sync filter buttons
    DOM.filterBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === filter);
    });
    filterProducts(filter, DOM.searchInput.value);
    // Scroll to catalog
    scrollToCatalog();
    // Close mobile menu
    DOM.nav.classList.remove("open");
    DOM.burgerBtn.classList.remove("open");
  });
});

// Filter buttons
DOM.filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    DOM.filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    // Sync nav links
    DOM.navLinks.forEach((l) => {
      l.classList.toggle("active", l.dataset.filter === btn.dataset.filter);
    });
    filterProducts(btn.dataset.filter, DOM.searchInput.value);
  });
});

// Search
let searchTimer;
DOM.searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filterProducts(currentFilter, DOM.searchInput.value);
  }, 300);
});

// Prevent form submission on Enter in search input and trigger search immediately
DOM.searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    clearTimeout(searchTimer);
    filterProducts(currentFilter, DOM.searchInput.value);
  }
});

/* ============================================
   SEARCH BAR TOGGLE
   ============================================ */
DOM.searchToggle.addEventListener("click", () => {
  lastFocusedElement = document.activeElement;
  DOM.searchBar.hidden = false;
  DOM.searchBar.classList.add("open");
  DOM.searchToggle.setAttribute("aria-expanded", "true");
  setTimeout(() => DOM.searchInput.focus(), 400);
  // Скрол до каталогу щоб одразу видно парфуми
  scrollToCatalog();
});
DOM.searchClose.addEventListener("click", () => {
  DOM.searchBar.classList.remove("open");
  DOM.searchBar.hidden = true;
  DOM.searchToggle.setAttribute("aria-expanded", "false");
  DOM.searchInput.value = "";
  filterProducts(currentFilter, "");
  lastFocusedElement?.focus?.();
});

/* ============================================
   BURGER / MOBILE NAV
   ============================================ */
DOM.burgerBtn.addEventListener("click", () => {
  DOM.burgerBtn.classList.toggle("open");
  DOM.nav.classList.toggle("open");
  DOM.burgerBtn.setAttribute(
    "aria-expanded",
    String(DOM.nav.classList.contains("open")),
  );
});

/* ============================================
   HEADER SCROLL
   ============================================ */
window.addEventListener(
  "scroll",
  () => {
    DOM.header.classList.toggle("scrolled", window.scrollY > 30);
    DOM.backToTop.classList.toggle("visible", window.scrollY > 400);
  },
  { passive: true },
);

DOM.backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ============================================
   MODAL — OPEN
   ============================================ */
function openModal(productId) {
  const p = products.find((x) => x.id === productId);
  if (!p) return;

  currentProductId = productId;

  // Генеруємо розширений alt текст
  const detailAltText = `${p.name} від ${p.brand} - ${p.volume} - профіль запаху: ${p.notes.split("|")[0]}`;

  DOM.modalImage.src = p.image;
  DOM.modalImage.alt = detailAltText;
  DOM.modalImage.title = p.name;
  DOM.modalImage.setAttribute("decoding", "async");
  DOM.modalImage.onerror = () => {
    DOM.modalImage.src = "";
    DOM.modalImage.style.display = "none";
  };
  DOM.modalImage.style.display = "block";

  DOM.modalBadgeWrap.innerHTML = p.badge
    ? `<span class="product-card__badge">${p.badge}</span>`
    : "";

  DOM.modalBrand.textContent = p.brand;
  DOM.modalTitle.textContent = p.name;
  DOM.modalCategory.textContent = CATEGORY_LABELS[p.category] || p.category;
  DOM.modalDescription.textContent = p.description;
  DOM.modalNotes.textContent = p.notes;
  DOM.modalVolume.textContent = p.volume;

  // Reset quantity
  DOM.qtyInput.value = 1;
  updateModalPrice(1);

  lastFocusedElement = document.activeElement;
  DOM.modalOverlay.classList.add("open");
  DOM.modalOverlay.hidden = false;
  DOM.modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // Focus close button for accessibility
  setTimeout(() => DOM.modalClose.focus(), 400);
}

function updateModalPrice(qty) {
  const price = getPriceByQty(qty);
  DOM.modalPrice.textContent = `${price} грн`;
  DOM.priceHint.textContent = getPriceHint(qty);
}

/* ============================================
   MODAL — CLOSE
   ============================================ */
function closeModal() {
  DOM.modalOverlay.classList.remove("open");
  DOM.modalOverlay.hidden = true;
  DOM.modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  currentProductId = null;
  lastFocusedElement?.focus?.();
}

DOM.modalClose.addEventListener("click", closeModal);
DOM.modalOverlay.addEventListener("click", (e) => {
  const overlay = DOM.modalOverlay;
  if (e.target === overlay) {
    closeModal();
  }
});

DOM.modal.addEventListener("click", (e) => {
  if (e.target.closest(".qty-btn")) return;
  closeModal();
});

/* ============================================
   MODAL — QUANTITY
   ============================================ */
DOM.qtyMinus.addEventListener("click", () => {
  let v = parseInt(DOM.qtyInput.value);
  if (v > 1) {
    DOM.qtyInput.value = --v;
    updateModalPrice(v);
  }
});
DOM.qtyPlus.addEventListener("click", () => {
  let v = parseInt(DOM.qtyInput.value);
  if (v < 99) {
    DOM.qtyInput.value = ++v;
    updateModalPrice(v);
  }
});

/* ============================================
   MODAL — ADD TO CART
   ============================================ */
DOM.modalBuyBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!currentProductId) return;
  const qty = parseInt(DOM.qtyInput.value);
  addToCart(currentProductId, qty);
  closeModal();
});

/* ============================================
   EVENT DELEGATION — PRODUCT CARDS
   ============================================ */
DOM.productsGrid.addEventListener("click", (e) => {
  // Quick-add button
  const quickAddBtn = e.target.closest(".product-card__quick-add");
  if (quickAddBtn) {
    e.preventDefault();
    e.stopPropagation();
    const id = parseInt(quickAddBtn.dataset.id);
    addToCart(id, 1);
    animateCartBadge();

    return;
  }

  // Card click — open modal
  const card = e.target.closest(".product-card");
  if (card) {
    const id = parseInt(card.dataset.id);
    openModal(id);
  }
});

/* ============================================
   CART — LOGIC
   ============================================ */
function saveCart() {
  localStorage.setItem("bk_cart", JSON.stringify(cart));
}

function getTotalCartQty() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getCartPricing() {
  const totalQty = getTotalCartQty();
  const unitPrice = getPriceByQty(totalQty);
  return {
    totalQty,
    unitPrice,
    total: totalQty * unitPrice,
  };
}

function generateCheckoutOrderId() {
  const now = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK-${now}-${random}`;
}

function resetCartCheckout() {
  if (!DOM.cartCheckoutForm) return;

  DOM.cartCheckoutForm.classList.remove("open");
  DOM.cartCheckoutForm.reset();
  applyRememberedEmail();
  DOM.checkoutPayBtn.href = "#";
  DOM.checkoutPayBtn.classList.add("disabled");
  DOM.checkoutPayBtn.setAttribute("aria-disabled", "true");
  currentCheckoutOrderId = null;

  [
    [DOM.checkoutName, DOM.checkoutNameError],
    [DOM.checkoutPhone, DOM.checkoutPhoneError],
    [DOM.checkoutEmail, DOM.checkoutEmailError],
    [DOM.checkoutNpBranch, DOM.checkoutNpError],
  ].forEach(([input, errorEl]) => {
    clearError(input, errorEl);
  });
}

function clearCartAfterCheckout() {
  cart = [];
  saveCart();
  renderCart();
  resetCartCheckout();
  closeCartPanel();
}

function validateCartCheckoutForm(showErrors = true) {
  let isValid = true;

  const name = DOM.checkoutName.value.trim();
  if (name.length < 2) {
    if (showErrors) {
      setError(
        DOM.checkoutName,
        DOM.checkoutNameError,
        "Введіть ім'я (мін. 2 символи)",
      );
    }
    isValid = false;
  } else {
    clearError(DOM.checkoutName, DOM.checkoutNameError);
  }

  const phone = DOM.checkoutPhone.value.trim().replace(/\s/g, "");
  const phoneRegex = /^(\+?38)?0\d{9}$/;
  if (!phoneRegex.test(phone)) {
    if (showErrors) {
      setError(
        DOM.checkoutPhone,
        DOM.checkoutPhoneError,
        "Введіть коректний номер телефону",
      );
    }
    isValid = false;
  } else {
    clearError(DOM.checkoutPhone, DOM.checkoutPhoneError);
  }

  const checkoutEmail = DOM.checkoutEmail.value.trim();
  if (checkoutEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(checkoutEmail)) {
      if (showErrors) {
        setError(
          DOM.checkoutEmail,
          DOM.checkoutEmailError,
          "Введіть коректну email-адресу",
        );
      }
      isValid = false;
    } else {
      clearError(DOM.checkoutEmail, DOM.checkoutEmailError);
    }
  } else {
    clearError(DOM.checkoutEmail, DOM.checkoutEmailError);
  }

  const npBranch = DOM.checkoutNpBranch.value.trim();
  if (npBranch.length < 2) {
    if (showErrors) {
      setError(
        DOM.checkoutNpBranch,
        DOM.checkoutNpError,
        "Вкажіть відділення Нової пошти",
      );
    }
    isValid = false;
  } else {
    clearError(DOM.checkoutNpBranch, DOM.checkoutNpError);
  }

  return isValid;
}

function buildCheckoutPaymentUrl() {
  const { total } = getCartPricing();
  const paymentUrl = new URL(PAYMENT_LINK_BASE);
  const orderId = currentCheckoutOrderId || generateCheckoutOrderId();
  const deliveryAddress = DOM.checkoutAddress?.value.trim() || "не вказано";

  currentCheckoutOrderId = orderId;

  paymentUrl.searchParams.set("amount", String(total));
  paymentUrl.searchParams.set(
    "comment",
    `Замовлення ${orderId}: ${DOM.checkoutName.value.trim()}, ${DOM.checkoutPhone.value.trim()}, email клієнта: ${DOM.checkoutEmail.value.trim() || "не вказано"}, адреса: ${deliveryAddress}, НП: ${DOM.checkoutNpBranch.value.trim()}, email магазину: ${STORE_EMAIL}`,
  );

  return paymentUrl.toString();
}

function getCartItemsSummary() {
  const { unitPrice } = getCartPricing();

  return cart
    .map((item, index) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) return null;
      const lineTotal = item.qty * unitPrice;
      return `${index + 1}. ${product.name} — ${item.qty} шт × ${unitPrice} грн = ${lineTotal} грн`;
    })
    .filter(Boolean)
    .join("\n");
}

async function notifyOrderByEmail() {
  const { totalQty, unitPrice, total } = getCartPricing();
  const orderId = currentCheckoutOrderId || generateCheckoutOrderId();
  currentCheckoutOrderId = orderId;
  const browserClientIp = await getClientIpAddress();
  const customerEmail = DOM.checkoutEmail.value.trim();
  const deliveryAddress = DOM.checkoutAddress?.value.trim() || "";

  const pageUrl = window.location.href;
  const referrer = document.referrer || "Прямий вхід";
  const userAgent = navigator.userAgent || "Невідомо";
  const language = navigator.language || "Невідомо";
  const platform = navigator.platform || "Невідомо";
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Невідомо";

  const payload = {
    _subject: `Нове замовлення ${orderId}`,
    name: DOM.checkoutName.value.trim(),
    ...(customerEmail
      ? {
          email: customerEmail,
          _replyto: customerEmail,
          customer_email: customerEmail,
        }
      : {}),
    phone: DOM.checkoutPhone.value.trim(),
    address: deliveryAddress,
    np_branch: DOM.checkoutNpBranch.value.trim(),
    client_ip: browserClientIp,
    browser_client_ip: browserClientIp,
    user_agent: userAgent,
    device_language: language,
    device_platform: platform,
    page_url: pageUrl,
    referrer,
    timezone,
    message:
      `Номер замовлення: ${orderId}\n` +
      `Клієнт: ${DOM.checkoutName.value.trim()}\n` +
      `Телефон: ${DOM.checkoutPhone.value.trim()}\n` +
      `Email: ${DOM.checkoutEmail.value.trim() || "Не вказано"}\n` +
      `Адреса доставки: ${deliveryAddress || "Не вказано"}\n` +
      `Відділення НП: ${DOM.checkoutNpBranch.value.trim()}\n` +
      `IP клієнта (browser): ${browserClientIp}\n` +
      `Мова: ${language}\n` +
      `Платформа: ${platform}\n` +
      `Часовий пояс: ${timezone}\n` +
      `Referrer: ${referrer}\n` +
      `Сторінка: ${pageUrl}\n\n` +
      `Позиції:\n${getCartItemsSummary()}\n\n` +
      `Разом: ${totalQty} шт × ${unitPrice} грн = ${total} грн`,
  };

  if (ORDER_EMAIL_PROXY_ENDPOINT) {
    try {
      await postOrderEmail(ORDER_EMAIL_PROXY_ENDPOINT, payload);
      return;
    } catch (error) {
      console.error("Не вдалося надіслати замовлення через Worker:", error);
    }
  }

  try {
    await postOrderEmail(ORDER_EMAIL_FALLBACK_ENDPOINT, payload);
  } catch (fallbackError) {
    console.error("Не вдалося надіслати замовлення на пошту:", fallbackError);
  }
}

async function postOrderEmail(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response;
}

async function getClientIpAddress() {
  if (cachedClientIp) {
    return cachedClientIp;
  }

  if (clientIpPromise) {
    return clientIpPromise;
  }

  clientIpPromise = (async () => {
    for (const endpoint of IP_LOOKUP_SOURCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          IP_LOOKUP_TIMEOUT_MS,
        );

        const response = await fetch(endpoint, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const ip =
          data?.ip || data?.ipAddress || data?.query || data?.address || null;

        if (ip) {
          cachedClientIp = ip;
          return cachedClientIp;
        }
      } catch (error) {
        // Try next provider.
      }
    }

    cachedClientIp = "Не вдалося визначити";
    return cachedClientIp;
  })();

  try {
    return await clientIpPromise;
  } finally {
    clientIpPromise = null;
  }
}

function warmupClientIpAddress() {
  if (cachedClientIp || clientIpPromise) {
    return;
  }

  void getClientIpAddress();
}

function updateCartCheckoutPaymentButton(showErrors = false) {
  if (!DOM.checkoutPayBtn) return;

  const isValid = validateCartCheckoutForm(showErrors);
  const { total } = getCartPricing();

  if (isValid && total > 0) {
    DOM.checkoutPayBtn.href = buildCheckoutPaymentUrl();
    DOM.checkoutPayBtn.classList.remove("disabled");
    DOM.checkoutPayBtn.setAttribute("aria-disabled", "false");
    return;
  }

  DOM.checkoutPayBtn.href = "#";
  DOM.checkoutPayBtn.classList.add("disabled");
  DOM.checkoutPayBtn.setAttribute("aria-disabled", "true");
}

function addToCart(productId, qty) {
  const existing = cart.find((i) => i.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  saveCart();
  renderCart();
  animateCartBadge();
}

function removeFromCart(productId, cartItemEl = null) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();

  const cartItem =
    cartItemEl ||
    DOM.cartBody.querySelector(`.cart-item[data-id="${productId}"]`);

  if (cartItem) {
    cartItem.remove();
  }

  if (!cart.length) {
    DOM.cartBody.innerHTML = "";
    DOM.cartBody.appendChild(DOM.cartEmpty);
    DOM.cartEmpty.style.display = "block";
    DOM.cartFooter.style.display = "none";
    DOM.cartBadge.textContent = "0";
    DOM.cartBadge.classList.remove("visible");
    resetCartCheckout();
    closeCartPanel();
    return;
  }

  DOM.cartEmpty.style.display = "none";
  DOM.cartFooter.style.display = "block";
  updateCartQtyDisplay();
}

function changeCartItemQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  updateCartQtyDisplay();
}

function updateCartQtyDisplay() {
  const { totalQty, unitPrice, total } = getCartPricing();
  const hint = getPriceHint(totalQty);

  DOM.cartBadge.textContent = totalQty;
  DOM.cartBadge.classList.toggle("visible", totalQty > 0);

  cart.forEach((item) => {
    const qtyBtn = DOM.cartBody.querySelector(
      `.cart-item__qty-btn[data-id="${item.id}"]`,
    );
    if (!qtyBtn) return;
    const cartItem = qtyBtn.closest(".cart-item");
    if (!cartItem) return;
    const qtySpan = cartItem.querySelector(".cart-item__qty");
    const lineTotal = cartItem.querySelector(".cart-item__line-total");
    if (qtySpan) qtySpan.textContent = item.qty;
    if (lineTotal) lineTotal.textContent = `${item.qty * unitPrice} грн`;
  });

  DOM.cartTotalQty.textContent = `${totalQty} шт`;
  DOM.cartUnitPrice.textContent = `${unitPrice} грн`;
  DOM.cartTotal.textContent = `${total} грн`;
  if (DOM.checkoutAmount) {
    DOM.checkoutAmount.textContent = `${total} грн`;
    updateCartCheckoutPaymentButton();
  }

  if (hint) {
    DOM.cartDiscount.style.display = "block";
    DOM.cartDiscountText.textContent = hint;
  } else {
    DOM.cartDiscount.style.display = "none";
  }
}

function renderCart() {
  const { totalQty, unitPrice, total } = getCartPricing();
  const hint = getPriceHint(totalQty);

  // Badge
  DOM.cartBadge.textContent = totalQty;
  DOM.cartBadge.classList.toggle("visible", totalQty > 0);

  if (!cart.length) {
    DOM.cartBody.innerHTML = "";
    DOM.cartBody.appendChild(DOM.cartEmpty);
    DOM.cartEmpty.style.display = "block";
    DOM.cartFooter.style.display = "none";
    resetCartCheckout();
    return;
  }

  DOM.cartEmpty.style.display = "none";
  DOM.cartFooter.style.display = "block";

  // Render items
  DOM.cartBody.innerHTML = "";
  cart.forEach((item) => {
    const p = products.find((x) => x.id === item.id);
    if (!p) return;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.dataset.id = p.id;
    div.innerHTML = `
      <img class="cart-item__image" src="${p.image}" alt="${p.name}"
           onerror="this.src=''; this.style.background='#2d2d2d';" />
      <div class="cart-item__info">
        <p class="cart-item__name">${p.name}</p>
        <div class="cart-item__qty-row">
          <button class="cart-item__qty-btn" data-id="${p.id}" data-delta="-1">−</button>
          <span class="cart-item__qty">${item.qty}</span>
          <button class="cart-item__qty-btn" data-id="${p.id}" data-delta="1">+</button>
          <span class="cart-item__line-total">${item.qty * unitPrice} грн</span>
        </div>
      </div>
      <button class="cart-item__remove" data-remove="${p.id}" aria-label="Видалити">×</button>
    `;
    DOM.cartBody.appendChild(div);
  });

  // Summary
  DOM.cartTotalQty.textContent = `${totalQty} шт`;
  DOM.cartUnitPrice.textContent = `${unitPrice} грн`;
  DOM.cartTotal.textContent = `${total} грн`;
  if (DOM.checkoutAmount) {
    DOM.checkoutAmount.textContent = `${total} грн`;
    updateCartCheckoutPaymentButton();
  }

  if (hint) {
    DOM.cartDiscount.style.display = "block";
    DOM.cartDiscountText.textContent = hint;
  } else {
    DOM.cartDiscount.style.display = "none";
  }
}

function syncCartBadge() {
  const { totalQty } = getCartPricing();
  DOM.cartBadge.textContent = totalQty;
  DOM.cartBadge.classList.toggle("visible", totalQty > 0);
}

// Cart body event delegation
DOM.cartBody.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove]");
  if (removeBtn) {
    removeFromCart(
      parseInt(removeBtn.dataset.remove),
      removeBtn.closest(".cart-item"),
    );
    return;
  }
  const qtyBtn = e.target.closest(".cart-item__qty-btn");
  if (qtyBtn) {
    changeCartItemQty(
      parseInt(qtyBtn.dataset.id),
      parseInt(qtyBtn.dataset.delta),
    );
  }
});

/* ============================================
   CART PANEL TOGGLE
   ============================================ */
function openCartPanel() {
  renderCart();
  lastFocusedElement = document.activeElement;
  DOM.cartPanel.classList.add("open");
  DOM.cartOverlay.classList.add("open");
  DOM.cartPanel.hidden = false;
  DOM.cartOverlay.hidden = false;
  DOM.cartPanel.setAttribute("aria-hidden", "false");
  DOM.cartOverlay.setAttribute("aria-hidden", "false");
  DOM.cartToggle.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  setTimeout(() => DOM.cartPanelClose.focus(), 50);
}

function consumePendingCartOpen() {
  try {
    if (sessionStorage.getItem("bk_open_cart") !== "1") return;
    sessionStorage.removeItem("bk_open_cart");
    openCartPanel();
  } catch {
    // Ignore sessionStorage access issues.
  }
}

function closeCartPanel() {
  DOM.cartPanel.classList.remove("open");
  DOM.cartOverlay.classList.remove("open");
  DOM.cartPanel.hidden = true;
  DOM.cartOverlay.hidden = true;
  DOM.cartPanel.setAttribute("aria-hidden", "true");
  DOM.cartOverlay.setAttribute("aria-hidden", "true");
  DOM.cartToggle.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  lastFocusedElement?.focus?.();
}

DOM.cartToggle.addEventListener("click", () => {
  if (DOM.cartPanel.classList.contains("open")) closeCartPanel();
  else openCartPanel();
});
DOM.cartPanelClose.addEventListener("click", closeCartPanel);
DOM.cartOverlay.addEventListener("click", closeCartPanel);

// Order button → close cart & scroll to form
DOM.cartOrderBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!cart.length) return;
  if (!currentCheckoutOrderId) {
    currentCheckoutOrderId = generateCheckoutOrderId();
  }
  syncCheckoutEmail();
  DOM.cartCheckoutForm.classList.toggle("open");
  updateCartCheckoutPaymentButton();

  if (DOM.cartCheckoutForm.classList.contains("open")) {
    DOM.checkoutName.focus();
  }
});

DOM.checkoutPayBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if (!validateCartCheckoutForm(true) || !cart.length) {
    updateCartCheckoutPaymentButton(true);
    return;
  }

  const paymentUrl = buildCheckoutPaymentUrl();
  DOM.checkoutPayBtn.href = paymentUrl;

  DOM.checkoutPayBtn.classList.add("disabled");
  DOM.checkoutPayBtn.setAttribute("aria-disabled", "true");

  try {
    await Promise.race([
      notifyOrderByEmail(),
      new Promise((resolve) =>
        setTimeout(resolve, EMAIL_BEFORE_REDIRECT_TIMEOUT_MS),
      ),
    ]);
  } finally {
    clearCartAfterCheckout();
    window.location.assign(paymentUrl);
  }
});

[
  DOM.checkoutName,
  DOM.checkoutPhone,
  DOM.checkoutEmail,
  DOM.checkoutNpBranch,
].forEach((input) => {
  input.addEventListener("blur", () => {
    rememberCustomerEmail();
    validateCartCheckoutForm(true);
    updateCartCheckoutPaymentButton();
  });
  input.addEventListener("input", () => {
    rememberCustomerEmail();
    if (input.closest(".form-group")?.classList.contains("error")) {
      validateCartCheckoutForm(true);
    }
    updateCartCheckoutPaymentButton();
  });
});

DOM.checkoutPhone.addEventListener("input", (e) => {
  let val = e.target.value.replace(/[^\d+]/g, "");
  e.target.value = val;
});

/* ============================================
   ANIMATE CART BADGE
   ============================================ */
function animateCartBadge() {
  if (!DOM.cartBadge) {
    return;
  }

  if (cartBadgeAnimationFrameId) {
    cancelAnimationFrame(cartBadgeAnimationFrameId);
    cartBadgeAnimationFrameId = 0;
  }

  DOM.cartBadge.style.animation = "none";
  cartBadgeAnimationFrameId = requestAnimationFrame(() => {
    cartBadgeAnimationFrameId = requestAnimationFrame(() => {
      DOM.cartBadge.style.animation =
        "pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
      cartBadgeAnimationFrameId = 0;
    });
  });
}

/* ============================================
   KEYBOARD LISTENERS
   ============================================ */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (DOM.modalOverlay.classList.contains("open")) closeModal();
    else if (DOM.cartPanel.classList.contains("open")) closeCartPanel();
    else if (DOM.searchBar.classList.contains("open")) {
      DOM.searchBar.classList.remove("open");
      DOM.searchInput.value = "";
      filterProducts(currentFilter, "");
    }
  }
});

/* ============================================
   FORM VALIDATION & SUBMIT
   ============================================ */
function validateForm() {
  let valid = true;

  // Name
  const nameVal = DOM.formName.value.trim();
  if (nameVal.length < 2) {
    setError(DOM.formName, DOM.nameError, "Введіть ваше ім'я (мін. 2 символи)");
    valid = false;
  } else {
    clearError(DOM.formName, DOM.nameError);
  }

  // Phone
  const phoneVal = DOM.formPhone.value.trim().replace(/\s/g, "");
  const phoneRegex = /^(\+?38)?0\d{9}$/;
  if (!phoneRegex.test(phoneVal)) {
    setError(
      DOM.formPhone,
      DOM.phoneError,
      "Введіть коректний номер телефону (0XX-XXX-XX-XX)",
    );
    valid = false;
  } else {
    clearError(DOM.formPhone, DOM.phoneError);
  }

  // Email (optional but validate if filled)
  const emailVal = DOM.formEmail.value.trim();
  if (emailVal) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setError(DOM.formEmail, DOM.emailError, "Введіть коректну email-адресу");
      valid = false;
    } else {
      clearError(DOM.formEmail, DOM.emailError);
    }
  } else {
    clearError(DOM.formEmail, DOM.emailError);
  }

  return valid;
}

function setError(input, errorEl, message) {
  input.closest(".form-group").classList.add("error");
  errorEl.textContent = message;
}

function clearError(input, errorEl) {
  input.closest(".form-group").classList.remove("error");
  errorEl.textContent = "";
}

// Live validation
[DOM.formName, DOM.formPhone, DOM.formEmail].forEach((input) => {
  input.addEventListener("blur", validateForm);
  input.addEventListener("input", () => {
    if (input === DOM.formEmail) {
      rememberCustomerEmail();
    }
    if (input.closest(".form-group").classList.contains("error")) {
      validateForm();
    }
  });
});

// Format phone input
DOM.formPhone.addEventListener("input", (e) => {
  let val = e.target.value.replace(/[^\d+]/g, "");
  e.target.value = val;
});

// Submit
DOM.contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  rememberCustomerEmail();

  // Show loading state
  const btnText = DOM.formSubmit.querySelector(".btn-text");
  const btnLoader = DOM.formSubmit.querySelector(".btn-loader");
  btnText.style.display = "none";
  btnLoader.style.display = "inline-block";
  DOM.formSubmit.disabled = true;

  try {
    // Simulate async submission (replace with real backend)
    await new Promise((r) => setTimeout(r, 1500));

    // Include cart info in message (optional bonus)
    const totalQty = getTotalCartQty();
    const cartInfo =
      totalQty > 0
        ? `\n\nКошик: ${totalQty} шт × ${getPriceByQty(totalQty)} грн = ${totalQty * getPriceByQty(totalQty)} грн`
        : "";

    console.log("Form submitted:", {
      name: DOM.formName.value,
      phone: DOM.formPhone.value,
      email: DOM.formEmail.value,
      message: DOM.formMessage.value + cartInfo,
      cartItems: cart,
    });

    // Reset & success
    DOM.contactForm.reset();
    applyRememberedEmail();
    DOM.formSuccess.style.display = "block";

    setTimeout(() => {
      DOM.formSuccess.style.display = "none";
    }, 6000);
  } finally {
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
    DOM.formSubmit.disabled = false;
  }
});

function getRememberedEmail() {
  return localStorage.getItem(CUSTOMER_EMAIL_STORAGE_KEY)?.trim() || "";
}

function setRememberedEmail(email) {
  const normalizedEmail = String(email || "").trim();

  if (!normalizedEmail) {
    localStorage.removeItem(CUSTOMER_EMAIL_STORAGE_KEY);
    return;
  }

  localStorage.setItem(CUSTOMER_EMAIL_STORAGE_KEY, normalizedEmail);
}

function rememberCustomerEmail() {
  const email =
    DOM.checkoutEmail?.value.trim() || DOM.formEmail?.value.trim() || "";

  if (!email) {
    return;
  }

  setRememberedEmail(email);
}

function applyRememberedEmail() {
  const rememberedEmail = getRememberedEmail();

  if (!rememberedEmail) {
    return;
  }

  if (DOM.checkoutEmail && !DOM.checkoutEmail.value.trim()) {
    DOM.checkoutEmail.value = rememberedEmail;
  }

  if (DOM.formEmail && !DOM.formEmail.value.trim()) {
    DOM.formEmail.value = rememberedEmail;
  }
}

function syncCheckoutEmail() {
  if (!DOM.checkoutEmail) {
    return;
  }

  if (!DOM.checkoutEmail.value.trim() && DOM.formEmail?.value.trim()) {
    DOM.checkoutEmail.value = DOM.formEmail.value.trim();
  }

  if (!DOM.checkoutEmail.value.trim()) {
    DOM.checkoutEmail.value = getRememberedEmail();
  }
}

applyRememberedEmail();

/* ============================================
   SCROLL REVEAL (Intersection Observer)
   ============================================ */
function observeReveal() {
  // Use a large rootMargin so elements are revealed as soon as they're near the viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px 200px 0px" },
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // Immediately reveal elements already visible in the current viewport
  setTimeout(() => {
    const elementsToReveal = [];

    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight + 300) {
        elementsToReveal.push(el);
      }
    });

    requestAnimationFrame(() => {
      elementsToReveal.forEach((el) => {
        el.classList.add("visible");
      });
    });
  }, 100);
}

/* ============================================
   COUNTER ANIMATION
   ============================================ */
function animateCounters() {
  const counters = document.querySelectorAll(".stat__num[data-target]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = Math.floor(current).toLocaleString("uk");
          if (current >= target) clearInterval(timer);
        }, 16);
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 },
  );

  counters.forEach((c) => observer.observe(c));
}

/* ============================================
   PRICING CARDS — HIGHLIGHT ON HOVER
   ============================================ */
function initPricingCards() {
  const cards = document.querySelectorAll(".pricing-card");
  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      cards.forEach((c) => (c.style.opacity = "0.6"));
      card.style.opacity = "1";
    });
    card.addEventListener("mouseleave", () => {
      cards.forEach((c) => (c.style.opacity = "1"));
    });
  });
}

/* ============================================
   REVEAL STATIC SECTIONS
   ============================================ */
function initSectionReveal() {
  const targets = document.querySelectorAll(
    ".pricing-banner, .about, .contact, .about__stats .stat",
  );
  targets.forEach((el) => el.classList.add("reveal"));
  observeReveal();
}

/* ============================================
   GENERATE PRODUCT SCHEMA (для AI індексації)
   ============================================ */
function generateProductSchema() {
  const siteUrl = "https://bkparfume.site";
  const categoryUrls = {
    women: `${siteUrl}/zhinochi-parfumy.html`,
    men: `${siteUrl}/cholovichi-parfumy.html`,
    unisex: `${siteUrl}/uniseks-parfumy.html`,
  };

  const itemListElement = products.map((p, index) => {
    const productUrl = p.seoPage
      ? `${siteUrl}/products/${p.slug}.html`
      : categoryUrls[p.category] || `${siteUrl}/#catalog`;

    return {
      "@type": "ListItem",
      position: index + 1,
      url: productUrl,
      item: {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: p.name,
        url: productUrl,
        brand: {
          "@type": "Brand",
          name: "BK Parfume",
        },
        image: [`${siteUrl}${normalizeCatalogImagePath(p.image)}`],
        description: p.description,
        sku: String(p.id),
        mpn: p.slug,
        category: CATEGORY_LABELS[p.category] || p.category,
        offers: {
          "@type": "Offer",
          url: productUrl,
          price: String(p.price),
          priceCurrency: "UAH",
          priceValidUntil: "2026-12-31",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: "BK Parfume",
            url: siteUrl,
          },
        },
      },
    };
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: itemListElement,
  };

  //創建script елемент для вставки у <head>
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function runWhenIdle(callback, timeout = 1200) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout });
    return;
  }

  setTimeout(callback, 0);
}

function scheduleNonCriticalPageWork() {
  const runDeferredTasks = () => {
    runWhenIdle(() => {
      generateProductSchema();
      initPricingCards();
      animateCounters();
      initSectionReveal();
    }, 1800);
  };

  if (document.readyState === "complete") {
    runDeferredTasks();
    return;
  }

  window.addEventListener("load", runDeferredTasks, { once: true });
}

/* ============================================
   SERVICE WORKER REGISTRATION (PWA)
   ============================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js?v=20260506-2")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener("DOMContentLoaded", async () => {
  initHomeLogoLink();
  initCatalogAnchorLinks();
  syncMobileCatalogFilters();
  window.addEventListener("resize", syncMobileCatalogFilters, {
    passive: true,
  });

  try {
    await loadProducts();
  } catch (error) {
    console.error("Failed to load product catalog", error);
    if (DOM.loader) DOM.loader.remove();
    if (DOM.noResults) {
      DOM.noResults.textContent =
        "Не вдалося завантажити каталог. Оновіть сторінку або спробуйте пізніше.";
      DOM.noResults.style.display = "block";
    }
    return;
  }

  const initialFilter = getInitialCatalogFilter();
  syncCatalogControls(initialFilter);
  filterProducts(initialFilter, "");
  syncCartBadge();
  consumePendingCartOpen();
  scheduleNonCriticalPageWork();

  if (window.location.hash === "#catalog") {
    syncCatalogScrollPosition("auto");
  }

  runWhenIdle(() => warmupClientIpAddress());
});
