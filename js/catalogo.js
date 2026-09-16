/* =================================
   SOVACTIVE SHOP — CATÁLOGO PÚBLICO
================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    onSnapshot,
    query,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =================================
   FIREBASE
================================= */
const firebaseConfig = {
    apiKey: "AIzaSyCuurIDClpppbi_QFUe4h0eBg0QpRDRnPE",
    authDomain: "sovactive-80154.firebaseapp.com",
    projectId: "sovactive-80154",
    storageBucket: "sovactive-80154.firebasestorage.app",
    messagingSenderId: "401704806387",
    appId: "1:401704806387:web:21285934314d2ca7075486",
    measurementId: "G-C3EK3CVPH8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const POSTS_COLLECTION = "publicaciones";
const CATEGORIES_COLLECTION = "categorias";
const CONFIG_DOC = doc(db, "config", "general");
const CART_STORAGE_KEY = "sovactive-cart";


/* =================================
   ESTADO GLOBAL
================================= */
let allPosts = [];
let filteredPosts = [];
let allCategories = [];
let currentConfig = {};
let currentCategory = "all";
let searchTerm = "";
let currentSort = "recent";
let onlyFeatured = false;

let productModalData = null;
let productCarouselIndex = 0;
let productTotal = 0;

let addModalData = null;
let addModalSize = null;
let addModalQty = 1;

let cart = [];


/* =================================
   HELPERS
================================= */
function formatPrice(value) {
    if (!value && value !== 0) return "$0";
    const currency = currentConfig.currency || "COP";
    const locales = { COP: "es-CO", USD: "en-US", MXN: "es-MX", ARS: "es-AR", EUR: "es-ES" };
    return new Intl.NumberFormat(locales[currency] || "es-CO", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0
    }).format(value);
}

function escapeHtml(str = "") {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCategoryByName(name) {
    if (!name) return null;
    return allCategories.find(c => c.name === name) || null;
}


/* =================================
   CONFIGURACIÓN PÚBLICA
================================= */
async function loadPublicConfig() {
    try {
        const snap = await getDoc(CONFIG_DOC);
        if (snap.exists()) {
            currentConfig = snap.data();
        }
        applyConfigToUI();
    } catch (err) {
        console.warn("Error al cargar config:", err.message);
    }
}

function applyConfigToUI() {
    const c = currentConfig;

    if (c.storeName) {
        document.getElementById("brandName").textContent = c.storeName;
        document.getElementById("footerName").textContent = c.storeName;
        document.title = c.storeName;
    }

    if (c.slogan) {
        document.getElementById("brandSlogan").textContent = c.slogan;
        document.getElementById("footerSlogan").textContent = c.slogan;
    }

    if (c.logoUrl) {
        document.getElementById("brandLogo").src = c.logoUrl;
        document.getElementById("footerLogo").src = c.logoUrl;
        const favicon = document.querySelector("link[rel='icon']");
        if (favicon) favicon.href = c.logoUrl;
    }

    if (c.primaryColor) {
        document.documentElement.style.setProperty("--pink", c.primaryColor);
    }

    if (c.footerText) {
        document.getElementById("footerText").textContent = c.footerText;
    }

    const socialsBox = document.getElementById("footerSocials");
    const socials = [];

    if (c.whatsapp) {
        const wa = c.whatsapp.replace(/\D/g, "");
        socials.push({ icon: "fa-brands fa-whatsapp", href: `https://wa.me/${wa}`, label: "WhatsApp" });
        const waFloat = document.getElementById("waFloat");
        waFloat.href = `https://wa.me/${wa}`;
        waFloat.style.display = "flex";
    }
    if (c.instagram) {
        const ig = c.instagram.replace("@", "");
        socials.push({ icon: "fa-brands fa-instagram", href: `https://instagram.com/${ig}`, label: "Instagram" });
    }
    if (c.facebook) {
        const fb = c.facebook.trim();
        const fbUrl = fb.startsWith("http") ? fb : `https://facebook.com/${encodeURIComponent(fb)}`;
        socials.push({ icon: "fa-brands fa-facebook", href: fbUrl, label: "Facebook" });
    }
    if (c.tiktok) {
        const tt = c.tiktok.replace("@", "");
        socials.push({ icon: "fa-brands fa-tiktok", href: `https://tiktok.com/@${tt}`, label: "TikTok" });
    }
    if (c.email) {
        socials.push({ icon: "fa-solid fa-envelope", href: `mailto:${c.email}`, label: "Email" });
    }

    socialsBox.innerHTML = socials.map(s => `
        <a href="${s.href}" target="_blank" rel="noopener" class="social-link" aria-label="${s.label}" title="${s.label}">
            <i class="${s.icon}"></i>
        </a>
    `).join("");
}


/* =================================
   LISTENERS FIRESTORE
================================= */
function startCategoriesListener() {
    const q = query(collection(db, CATEGORIES_COLLECTION));
    onSnapshot(q, (snap) => {
        allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        allCategories.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

        renderFilters();
        renderProducts();
    }, (err) => console.error("Categorías:", err));
}

function startPostsListener() {
    const q = query(collection(db, POSTS_COLLECTION));

    onSnapshot(q, (snap) => {
        console.log(`📦 Publicaciones encontradas: ${snap.docs.length}`);

        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        raw.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
        });

        allPosts = raw.filter(p => p.status !== "draft");

        console.log(`✅ Publicaciones visibles: ${allPosts.length}`);

        document.getElementById("skeletonGrid").style.display = "none";
        applyFilters();
    }, (err) => {
        console.error("❌ Error al escuchar publicaciones:", err);
        document.getElementById("skeletonGrid").style.display = "none";
        showToast("No se pudieron cargar los productos.", "error", 6000);
    });
}


/* =================================
   FILTROS (chips)
================================= */
function renderFilters() {
    const box = document.getElementById("catalogFilters");

    const baseChips = `
        <button class="filter-chip ${currentCategory === "all" && !onlyFeatured ? "active" : ""}" data-category="all">
            <i class="fa-solid fa-layer-group"></i>
            Todos
        </button>
        <button class="filter-chip filter-featured ${onlyFeatured ? "active" : ""}" data-category="__featured__">
            <i class="fa-solid fa-star"></i>
            Destacados
        </button>
    `;

    const catChips = allCategories.map(cat => {
        const active = (currentCategory === cat.name && !onlyFeatured) ? "active" : "";
        return `
            <button class="filter-chip ${active}" data-category="${escapeHtml(cat.name)}">
                <i class="${cat.icon || "fa-solid fa-tag"}"></i>
                ${escapeHtml(cat.name)}
            </button>
        `;
    }).join("");

    box.innerHTML = baseChips + catChips;

    box.querySelectorAll(".filter-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const cat = chip.dataset.category;

            onlyFeatured = false;
            currentCategory = "all";

            if (cat === "__featured__") {
                onlyFeatured = true;
            } else if (cat !== "all") {
                currentCategory = cat;
            }

            box.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");

            applyFilters();
        });
    });
}


/* =================================
   BÚSQUEDA / ORDEN
================================= */
document.getElementById("catalogSearch").addEventListener("input", (e) => {
    searchTerm = e.target.value.trim();
    applyFilters();
});

document.getElementById("filterSort").addEventListener("change", (e) => {
    currentSort = e.target.value;
    applyFilters();
});


/* =================================
   APLICAR FILTROS
================================= */
function applyFilters() {
    filteredPosts = allPosts.filter(p => {
        if (onlyFeatured && !p.featured) return false;
        if (!onlyFeatured && currentCategory !== "all" && p.category !== currentCategory) return false;

        if (searchTerm) {
            const hay = `${p.title || ""} ${p.description || ""} ${p.category || ""} ${p.reference || ""}`.toLowerCase();
            if (!hay.includes(searchTerm.toLowerCase())) return false;
        }

        return true;
    });

    sortPosts();
    renderProducts();
    updateCatalogCount();
}

function sortPosts() {
    filteredPosts.sort((a, b) => {
        switch (currentSort) {
            case "price-asc":
                return (Number(a.price) || 0) - (Number(b.price) || 0);

            case "price-desc":
                return (Number(b.price) || 0) - (Number(a.price) || 0);

            case "name-asc":
                return (a.title || "").localeCompare(b.title || "", "es", { sensitivity: "base" });

            case "name-desc":
                return (b.title || "").localeCompare(a.title || "", "es", { sensitivity: "base" });

            case "featured": {
                const fa = a.featured ? 1 : 0;
                const fb = b.featured ? 1 : 0;
                if (fa !== fb) return fb - fa;
                const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return tb - ta;
            }

            case "recent":
            default: {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return tb - ta;
            }
        }
    });
}

function updateCatalogCount() {
    const el = document.getElementById("catalogCount");
    const n = filteredPosts.length;
    const total = allPosts.length;

    if (n === 0) {
        el.textContent = "Sin productos que coincidan";
    } else if (n === total) {
        el.textContent = `${n} producto${n === 1 ? "" : "s"} disponible${n === 1 ? "" : "s"}`;
    } else {
        el.textContent = `${n} de ${total} producto${total === 1 ? "" : "s"}`;
    }
}


/* =================================
   RENDER DE PRODUCTOS
================================= */
function renderProducts() {
    const grid = document.getElementById("productsGrid");
    const empty = document.getElementById("emptyState");

    grid.innerHTML = "";

    if (!filteredPosts.length) {
        grid.style.display = "none";
        empty.style.display = "block";
        return;
    }

    grid.style.display = "grid";
    empty.style.display = "none";

    filteredPosts.forEach((post, idx) => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.style.animationDelay = `${idx * 40}ms`;
        card.dataset.id = post.id;

        const cat = getCategoryByName(post.category);
        if (cat?.color) {
            card.style.setProperty("--category-color", cat.color);
        }

        const media = post.media || [];
        const hasMedia = media.length > 0;

        const slidesHtml = hasMedia
            ? media.map((m) => {
                if (m.type === "video") {
                    return `<div class="card-slide"><video src="${m.url}" muted loop playsinline preload="metadata"></video></div>`;
                }
                return `<div class="card-slide"><img src="${m.url}" alt="${escapeHtml(post.title)}" loading="lazy"></div>`;
            }).join("")
            : `<div class="card-slide" style="color:var(--gray);flex-direction:column;gap:8px;">
                    <i class="fa-solid fa-image" style="font-size:40px;opacity:.3"></i>
                    <span style="font-size:11px">Sin imagen</span>
               </div>`;

        const dotsHtml = hasMedia && media.length > 1
            ? `<div class="card-dots">${media.map((_, i) => `<button class="card-dot ${i === 0 ? "active" : ""}" data-index="${i}"></button>`).join("")}</div>`
            : "";

        const navHtml = hasMedia && media.length > 1
            ? `<button class="card-nav prev" data-nav="-1" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
               <button class="card-nav next" data-nav="1" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>`
            : "";

        const badges = [];
        if (post.featured) {
            badges.push(`<span class="badge badge-featured"><i class="fa-solid fa-star"></i> Destacado</span>`);
        }

        const mediaCount = hasMedia
            ? `<span class="card-media-count"><i class="fa-solid fa-photo-film"></i> ${media.length}</span>`
            : "";

        const sizes = Array.isArray(post.sizes) ? post.sizes : [];
        const sizesHtml = sizes.length
            ? `<div class="card-sizes">${sizes.slice(0, 6).map(s => `<span class="card-size-tag">${escapeHtml(s)}</span>`).join("")}${sizes.length > 6 ? `<span class="card-size-tag">+${sizes.length - 6}</span>` : ""}</div>`
            : "";

        const catHtml = cat
            ? `<span class="card-category" style="color:${cat.color}">
                   <i class="${cat.icon}"></i> ${escapeHtml(cat.name)}
               </span>`
            : `<span class="card-category">${escapeHtml(post.category || "General")}</span>`;

        const referenceHtml = post.reference
            ? `<span class="card-reference"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(post.reference)}</span>`
            : "";

        const showPrice = currentConfig.showPricePublic !== false;

        card.innerHTML = `
            <div class="card-media">
                <div class="card-slides">${slidesHtml}</div>
                ${navHtml}
                ${dotsHtml}
                ${badges.length ? `<div class="card-badges">${badges.join("")}</div>` : ""}
                ${mediaCount}
            </div>
            <div class="card-body">
                ${catHtml}
                ${referenceHtml}
                <h3 class="card-title">${escapeHtml(post.title || "Sin título")}</h3>
                ${post.description ? `<p class="card-desc">${escapeHtml(post.description)}</p>` : ""}
                ${sizesHtml}
                <div class="card-footer">
                    <div>
                        ${showPrice && post.price ? `<span class="card-price">${formatPrice(post.price)}</span>` : ""}
                    </div>
                    <button class="card-add-btn" data-action="add" aria-label="Agregar al pedido">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;

        if (hasMedia && media.length > 1) {
            setupCardCarousel(card, media.length);
        }

        card.addEventListener("click", (ev) => {
            if (ev.target.closest("button")) return;
            openProductModal(post);
        });

        card.querySelector('[data-action="add"]').addEventListener("click", (ev) => {
            ev.stopPropagation();
            openAddModal(post);
        });

        grid.appendChild(card);
    });
}

function setupCardCarousel(card, total) {
    let index = 0;
    const slidesEl = card.querySelector(".card-slides");
    const dots = card.querySelectorAll(".card-dot");

    const goTo = (i) => {
        index = (i + total) % total;
        slidesEl.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((d, di) => d.classList.toggle("active", di === index));
    };

    card.querySelectorAll(".card-nav").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            goTo(index + parseInt(btn.dataset.nav, 10));
        });
    });

    dots.forEach((dot, i) => {
        dot.addEventListener("click", (ev) => {
            ev.stopPropagation();
            goTo(i);
        });
    });
}


/* =================================
   MODAL: DETALLE DE PRODUCTO
================================= */
const productModal = document.getElementById("productModal");
const productCarousel = document.getElementById("productCarousel");
const productDots = document.getElementById("productDots");

function openProductModal(post) {
    productModalData = post;
    productCarouselIndex = 0;

    const media = post.media || [];
    productTotal = media.length;

    productCarousel.innerHTML = media.length
        ? media.map(m => m.type === "video"
            ? `<div class="product-slide"><video src="${m.url}" controls playsinline preload="metadata"></video></div>`
            : `<div class="product-slide"><img src="${m.url}" alt="${escapeHtml(post.title)}"></div>`
        ).join("")
        : `<div class="product-slide" style="color:var(--gray);flex-direction:column;gap:12px;">
              <i class="fa-solid fa-image" style="font-size:56px;opacity:.3"></i>
              <span>Sin imágenes</span>
           </div>`;

    productDots.innerHTML = media.length > 1
        ? media.map((_, i) => `<button class="card-dot ${i === 0 ? "active" : ""}" data-index="${i}"></button>`).join("")
        : "";

    document.getElementById("productTitle").textContent = post.title || "Sin título";
    document.getElementById("productCategory").textContent = post.category || "General";
    document.getElementById("productPrice").textContent = post.price ? formatPrice(post.price) : "";
    document.getElementById("productDescription").textContent = post.description || "Sin descripción.";

    // Referencia
    const refEl = document.getElementById("productReference");
    if (refEl) {
        if (post.reference) {
            refEl.style.display = "inline-flex";
            refEl.innerHTML = `<i class="fa-solid fa-hashtag"></i> Ref: <strong>${escapeHtml(post.reference)}</strong>`;
        } else {
            refEl.style.display = "none";
        }
    }

    const cat = getCategoryByName(post.category);
    const catEl = document.getElementById("productCategory");
    if (cat) {
        catEl.style.background = `${cat.color}22`;
        catEl.style.color = cat.color;
        catEl.style.borderColor = `${cat.color}55`;
        catEl.innerHTML = `<i class="${cat.icon}"></i> ${escapeHtml(cat.name)}`;
    }

    document.getElementById("productFeatured").style.display = post.featured ? "inline-flex" : "none";

    const stockBox = document.getElementById("productStockBox");
    if (currentConfig.showStockPublic && (post.stock ?? "") !== "") {
        stockBox.style.display = "inline-flex";
        document.getElementById("productStock").textContent = `Stock: ${post.stock} unidades`;
    } else {
        stockBox.style.display = "none";
    }

    updateProductCarousel();
    openModal(productModal);
}

function updateProductCarousel() {
    productCarousel.style.transform = `translateX(-${productCarouselIndex * 100}%)`;
    productDots.querySelectorAll(".card-dot").forEach((d, i) => {
        d.classList.toggle("active", i === productCarouselIndex);
    });
    document.getElementById("productPrev").disabled = productCarouselIndex === 0;
    document.getElementById("productNext").disabled = productCarouselIndex === productTotal - 1;
}

document.getElementById("productPrev").addEventListener("click", () => {
    if (productCarouselIndex > 0) {
        productCarouselIndex--;
        updateProductCarousel();
    }
});

document.getElementById("productNext").addEventListener("click", () => {
    if (productCarouselIndex < productTotal - 1) {
        productCarouselIndex++;
        updateProductCarousel();
    }
});

productDots.addEventListener("click", (e) => {
    const dot = e.target.closest(".card-dot");
    if (!dot) return;
    productCarouselIndex = parseInt(dot.dataset.index, 10);
    updateProductCarousel();
});

document.getElementById("closeProductModal").addEventListener("click", () => closeModal(productModal));

document.getElementById("btnOpenAddToCart").addEventListener("click", () => {
    if (!productModalData) return;
    closeModal(productModal);
    setTimeout(() => openAddModal(productModalData), 260);
});


/* =================================
   MODAL: AGREGAR AL CARRITO
================================= */
const addModal = document.getElementById("addModal");

function openAddModal(post) {
    addModalData = post;
    addModalQty = 1;
    addModalSize = null;

    const cover = post.coverUrl || post.media?.[0]?.url || "";
    const thumb = cover
        ? `<img src="${cover}" alt="${escapeHtml(post.title)}">`
        : `<i class="fa-solid fa-image" style="color:var(--gray);font-size:22px;"></i>`;

    document.getElementById("addPreview").innerHTML = `
        <div class="add-preview-img">${thumb}</div>
        <div class="add-preview-info">
            <span class="add-preview-title">${escapeHtml(post.title || "Sin título")}</span>
            <span class="add-preview-price">${post.price ? formatPrice(post.price) : ""}</span>
        </div>
    `;

    document.getElementById("addModalSubtitle").textContent = post.title || "Producto";

    const sizes = Array.isArray(post.sizes) ? post.sizes : [];
    const sizesGroup = document.getElementById("addSizesGroup");
    const sizesBox = document.getElementById("addSizes");

    if (sizes.length) {
        sizesGroup.style.display = "flex";
        sizesBox.innerHTML = sizes.map(s => `
            <button type="button" class="add-size-chip" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>
        `).join("");

        sizesBox.querySelectorAll(".add-size-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                sizesBox.querySelectorAll(".add-size-chip").forEach(c => c.classList.remove("selected"));
                chip.classList.add("selected");
                addModalSize = chip.dataset.size;
            });
        });
    } else {
        sizesGroup.style.display = "none";
        sizesBox.innerHTML = "";
    }

    document.getElementById("qtyInput").value = 1;

    openModal(addModal);
}

document.getElementById("qtyMinus").addEventListener("click", () => {
    const input = document.getElementById("qtyInput");
    const val = Math.max(1, parseInt(input.value, 10) - 1);
    input.value = val;
    addModalQty = val;
});

document.getElementById("qtyPlus").addEventListener("click", () => {
    const input = document.getElementById("qtyInput");
    const val = Math.min(99, parseInt(input.value, 10) + 1);
    input.value = val;
    addModalQty = val;
});

document.getElementById("qtyInput").addEventListener("input", (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 99) val = 99;
    addModalQty = val;
});

document.getElementById("cancelAdd").addEventListener("click", () => closeModal(addModal));
document.getElementById("closeAddModal").addEventListener("click", () => closeModal(addModal));

document.getElementById("confirmAdd").addEventListener("click", () => {
    if (!addModalData) return;

    const sizes = Array.isArray(addModalData.sizes) ? addModalData.sizes : [];
    if (sizes.length && !addModalSize) {
        showToast("Por favor elige una talla.", "warning");
        return;
    }

    addToCart(addModalData, addModalQty, addModalSize);
    closeModal(addModal);

    showToast("Producto agregado al pedido.", "success", 2500);
});


/* =================================
   CARRITO
================================= */
function loadCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        cart = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(cart)) cart = [];
    } catch {
        cart = [];
    }
    updateCartUI();
}

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
}

function addToCart(post, qty, size) {
    const key = `${post.id}__${size || "no-size"}`;
    const existing = cart.find(item => item.key === key);

    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            key,
            id: post.id,
            title: post.title || "Sin título",
            reference: post.reference || "",
            price: Number(post.price) || 0,
            coverUrl: post.coverUrl || post.media?.[0]?.url || "",
            size: size || null,
            qty,
            category: post.category || ""
        });
    }

    saveCart();
}

function removeFromCart(key) {
    cart = cart.filter(item => item.key !== key);
    saveCart();
}

function updateCartQty(key, delta) {
    const item = cart.find(i => i.key === key);
    if (!item) return;
    item.qty = Math.max(1, Math.min(99, item.qty + delta));
    saveCart();
}

function clearCart() {
    cart = [];
    saveCart();
}

function updateCartUI() {
    const count = cart.reduce((a, i) => a + i.qty, 0);
    const countEl = document.getElementById("cartCount");
    countEl.textContent = count;
    countEl.classList.toggle("show", count > 0);

    document.getElementById("cartItemsCount").textContent =
        count === 0 ? "0 productos" : `${count} producto${count === 1 ? "" : "s"}`;

    const body = document.getElementById("cartBody");

    if (!cart.length) {
        body.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="fa-solid fa-cart-shopping"></i>
                </div>
                <h4>Tu pedido está vacío</h4>
                <p>Explora el catálogo y agrega productos para hacer tu pedido.</p>
            </div>
        `;
    } else {
        body.innerHTML = cart.map(item => {
            const thumb = item.coverUrl
                ? `<img src="${item.coverUrl}" alt="${escapeHtml(item.title)}">`
                : `<i class="fa-solid fa-image" style="color:var(--gray);font-size:20px;"></i>`;

            return `
                <div class="cart-item" data-key="${escapeHtml(item.key)}">
                    <div class="cart-item-thumb">${thumb}</div>
                    <div class="cart-item-info">
                        <span class="cart-item-title">${escapeHtml(item.title)}</span>
                        <div class="cart-item-meta">
                            ${item.reference ? `<span>Ref: <strong>${escapeHtml(item.reference)}</strong></span>` : ""}
                            ${item.size ? `<span>Talla: <strong>${escapeHtml(item.size)}</strong></span>` : ""}
                        </div>
                        <span class="cart-item-price">${formatPrice(item.price * item.qty)}</span>
                    </div>
                    <div class="cart-item-actions">
                        <button class="cart-item-remove" data-remove="${escapeHtml(item.key)}" aria-label="Eliminar">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                        <div class="qty-mini">
                            <button data-minus="${escapeHtml(item.key)}"><i class="fa-solid fa-minus"></i></button>
                            <span>${item.qty}</span>
                            <button data-plus="${escapeHtml(item.key)}"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
    document.getElementById("cartTotal").textContent = formatPrice(total);

    document.getElementById("btnWhatsappOrder").disabled = !cart.length;

    body.querySelectorAll("[data-remove]").forEach(btn => {
        btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
    });

    body.querySelectorAll("[data-minus]").forEach(btn => {
        btn.addEventListener("click", () => updateCartQty(btn.dataset.minus, -1));
    });

    body.querySelectorAll("[data-plus]").forEach(btn => {
        btn.addEventListener("click", () => updateCartQty(btn.dataset.plus, 1));
    });
}


/* =================================
   DRAWER DEL CARRITO
================================= */
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");

function openCart() {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeCart() {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);


/* =================================
   WHATSAPP: ARMAR PEDIDO
================================= */
document.getElementById("btnWhatsappOrder").addEventListener("click", () => {
    if (!cart.length) return;

    const waNumber = (currentConfig.whatsapp || "").replace(/\D/g, "");
    if (!waNumber) {
        showToast("El WhatsApp de la tienda no está configurado.", "error", 5000);
        return;
    }

    const storeName = currentConfig.storeName || "la tienda";
    const total = cart.reduce((a, i) => a + i.price * i.qty, 0);

    const lines = [];
    lines.push(`¡Hola ${storeName}! 👋`);
    lines.push("");
    lines.push("Quiero hacer el siguiente pedido:");
    lines.push("");

    cart.forEach((item, idx) => {
        lines.push(`*${idx + 1}. ${item.title}*`);
        if (item.reference) lines.push(`   • Ref: ${item.reference}`);
        if (item.size) lines.push(`   • Talla: ${item.size}`);
        lines.push(`   • Cantidad: ${item.qty}`);
        lines.push(`   • Precio unitario: ${formatPrice(item.price)}`);
        lines.push(`   • Subtotal: ${formatPrice(item.price * item.qty)}`);
        lines.push("");
    });

    lines.push(`━━━━━━━━━━━━━━━━`);
    lines.push(`*TOTAL: ${formatPrice(total)}*`);
    lines.push(`━━━━━━━━━━━━━━━━`);
    lines.push("");
    lines.push("Quedo atento para coordinar el pago y el envío. ¡Gracias!");

    const message = lines.join("\n");
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
});

/* =================================
   CONFIRMAR VACIAR CARRITO (modal)
================================= */
const clearCartModal = document.getElementById("clearCartModal");

document.getElementById("btnClearCart").addEventListener("click", () => {
    if (!cart.length) return;
    openModal(clearCartModal);
});

document.getElementById("cancelClearCart").addEventListener("click", () => {
    closeModal(clearCartModal);
});

document.getElementById("confirmClearCart").addEventListener("click", () => {
    const btn = document.getElementById("confirmClearCart");

    // Feedback visual mientras vacía
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Vaciando...`;

    // Pequeño delay para que se vea el spinner
    setTimeout(() => {
        clearCart();
        closeModal(clearCartModal);

        // Restaurar botón
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-trash"></i> Sí, vaciar`;

        showToast("Carrito vaciado.", "info", 2000);
    }, 400);
});

/* =================================
   MODALES: helper
================================= */
function openModal(modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeModal(modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
}

document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay);
    });
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay.active").forEach(m => closeModal(m));
    }
});


/* =================================
   TOASTS
================================= */
const toastContainer = document.createElement("div");
toastContainer.className = "sov-toast-container";
document.body.appendChild(toastContainer);

const toastIcons = {
    success: "fa-solid fa-circle-check",
    error: "fa-solid fa-circle-xmark",
    warning: "fa-solid fa-triangle-exclamation",
    info: "fa-solid fa-circle-info"
};

const toastTitles = {
    success: "¡Listo!",
    error: "Ups...",
    warning: "Atención",
    info: "Información"
};

function showToast(message, type = "info", duration = 3500) {
    const toast = document.createElement("div");
    toast.className = `sov-toast sov-${type}`;
    toast.innerHTML = `
        <div class="sov-toast-icon"><i class="${toastIcons[type]}"></i></div>
        <div class="sov-toast-content">
            <p class="sov-toast-title">${toastTitles[type]}</p>
            <p class="sov-toast-msg">${message}</p>
        </div>
        <button class="sov-toast-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
        <div class="sov-toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    toastContainer.appendChild(toast);

    const close = () => {
        toast.classList.add("sov-hide");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    };

    const timer = setTimeout(close, duration);
    toast.querySelector(".sov-toast-close").addEventListener("click", () => {
        clearTimeout(timer);
        close();
    });
}


/* =================================
   INICIALIZACIÓN
================================= */
loadCart();
loadPublicConfig();
startCategoriesListener();
startPostsListener();