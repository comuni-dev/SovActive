/* =================================
   SOVACTIVE SHOP — DASHBOARD
================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { uploadToCloudinary } from "./cloudinary.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

const POSTS_COLLECTION = "publicaciones";
const CATEGORIES_COLLECTION = "categorias";
const CONFIG_DOC = doc(db, "config", "general");


/* =================================
   ESTADO GLOBAL
================================= */
let allPosts = [];
let filteredPosts = [];
let currentFilter = "all";
let currentView = "grid";
let searchTerm = "";

let allCategories = [];
let filteredCategories = [];
let searchCategoryTerm = "";
let editingCategoryId = null;
let pendingCategoryIcon = "fa-solid fa-tag";
let pendingCategoryColor = "#FE98B2";

let editingPostId = null;
let currentMedia = [];
let pendingDeleteId = null;
let pendingDeleteType = null;
let viewingPost = null;
let viewCarouselIndex = 0;

let currentConfig = {};
let currentUser = null;

// Logo de configuración (subida diferida)
let pendingLogoFile = null;
let pendingLogoUrl = null;
let removeCurrentLogo = false;

// Referencia SKU
let referenceCheckTimeout = null;


/* =================================
   PALETAS
================================= */
const ICON_OPTIONS = [
    "fa-solid fa-tag",
    "fa-solid fa-shirt",
    "fa-solid fa-shoe-prints",
    "fa-solid fa-socks",
    "fa-solid fa-hat-cowboy",
    "fa-solid fa-glasses",
    "fa-solid fa-bag-shopping",
    "fa-solid fa-watch",
    "fa-solid fa-gem",
    "fa-solid fa-dumbbell",
    "fa-solid fa-bicycle",
    "fa-solid fa-futbol",
    "fa-solid fa-basketball",
    "fa-solid fa-baseball",
    "fa-solid fa-person-running",
    "fa-solid fa-heart-pulse",
    "fa-solid fa-pills",
    "fa-solid fa-bottle-water",
    "fa-solid fa-apple-whole",
    "fa-solid fa-mobile-screen",
    "fa-solid fa-headphones",
    "fa-solid fa-laptop",
    "fa-solid fa-gamepad",
    "fa-solid fa-couch",
    "fa-solid fa-house",
    "fa-solid fa-star",
    "fa-solid fa-fire",
    "fa-solid fa-crown",
    "fa-solid fa-book",
    "fa-solid fa-gift",
    "fa-solid fa-camera",
    "fa-solid fa-paw"
];

const COLOR_OPTIONS = [
    "#FE98B2", "#FF6B8E",
    "#3B82F6", "#2563EB",
    "#22C55E", "#16A34A",
    "#F59E0B", "#D97706",
    "#EF4444", "#DC2626",
    "#8B5CF6", "#7C3AED",
    "#EC4899", "#14B8A6",
    "#64748B", "#0D0D0D"
];


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
    success: "¡Éxito!",
    error: "Ups...",
    warning: "Atención",
    info: "Información"
};

function showToast(message, type = "info", duration = 4000) {
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
   HELPERS
================================= */
function formatPrice(value) {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
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

function slugify(str = "") {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function getCategoryByName(name) {
    if (!name) return null;
    return allCategories.find(c => c.name === name) || null;
}

function shadeColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) + Math.round(2.55 * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
    let b = (num & 0x0000FF) + Math.round(2.55 * percent);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}


/* =================================
   AUTH
================================= */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    const emailEl = document.getElementById("userEmail");
    if (emailEl) emailEl.textContent = user.email;

    const adminEmail = document.getElementById("adminInfoEmail");
    if (adminEmail) adminEmail.textContent = user.email;
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (e) {
        showToast("No se pudo cerrar sesión.", "error");
    }
});


/* =================================
   NAVEGACIÓN ENTRE SECCIONES
================================= */
document.querySelectorAll(".nav-item[data-section]").forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        switchSection(item.dataset.section);
    });
});

function switchSection(section) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelector(`.nav-item[data-section="${section}"]`)?.classList.add("active");

    document.querySelectorAll("[data-section-content]").forEach(el => {
        el.style.display = el.dataset.sectionContent === section ? "block" : "none";
    });

    document.getElementById("sidebar")?.classList.remove("open");

    if (section === "estadisticas") {
        setTimeout(() => renderCharts(), 80);
    }
}


/* =================================
   MODALES (helpers)
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


/* =================================
   PUBLICACIONES
================================= */

const postsGrid = document.getElementById("postsGrid");
const emptyState = document.getElementById("emptyState");
const skeletonGrid = document.getElementById("skeletonGrid");

function renderPosts() {
    postsGrid.innerHTML = "";

    if (!filteredPosts.length) {
        postsGrid.style.display = "none";
        emptyState.style.display = "block";
        return;
    }

    postsGrid.style.display = "grid";
    emptyState.style.display = "none";

    filteredPosts.forEach((post, idx) => {
        const card = document.createElement("article");
        card.className = "post-card";
        card.style.animationDelay = `${idx * 30}ms`;
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
            : `<div class="card-slide" style="display:flex;align-items:center;justify-content:center;color:var(--gray);flex-direction:column;gap:8px;">
                    <i class="fa-solid fa-image" style="font-size:34px;opacity:.3"></i>
                    <span style="font-size:11px">Sin multimedia</span>
               </div>`;

        const dotsHtml = hasMedia && media.length > 1
            ? `<div class="card-dots">${media.map((_, i) => `<button class="card-dot ${i === 0 ? "active" : ""}" data-index="${i}"></button>`).join("")}</div>`
            : "";

        const navHtml = hasMedia && media.length > 1
            ? `<button class="card-nav prev" data-nav="-1"><i class="fa-solid fa-chevron-left"></i></button>
               <button class="card-nav next" data-nav="1"><i class="fa-solid fa-chevron-right"></i></button>`
            : "";

        const badges = [];
        if (post.featured) badges.push(`<span class="badge badge-featured"><i class="fa-solid fa-star"></i> Destacada</span>`);
        if (post.status === "draft") badges.push(`<span class="badge badge-draft">Borrador</span>`);
        else badges.push(`<span class="badge badge-active">Activa</span>`);

        const mediaCount = hasMedia
            ? `<span class="card-media-count"><i class="fa-solid fa-photo-film"></i> ${media.length}</span>`
            : "";

        const sizes = Array.isArray(post.sizes) ? post.sizes : [];
        const sizesHtml = sizes.length
            ? `<div class="card-sizes">${sizes.slice(0, 6).map(s => `<span class="card-size-tag">${escapeHtml(s)}</span>`).join("")}${sizes.length > 6 ? `<span class="card-size-tag">+${sizes.length - 6}</span>` : ""}</div>`
            : "";

        const catIconHtml = cat
            ? `<span class="card-category" style="color:${cat.color}">
                   <i class="${cat.icon}"></i> ${escapeHtml(cat.name)}
               </span>`
            : `<span class="card-category">${escapeHtml(post.category || "General")}</span>`;

        const referenceHtml = post.reference
            ? `<span class="card-reference"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(post.reference)}</span>`
            : "";

        card.innerHTML = `
            <div class="card-media">
                <div class="card-slides">${slidesHtml}</div>
                ${navHtml}
                ${dotsHtml}
                <div class="card-badges">${badges.join("")}</div>
                ${mediaCount}
            </div>
            <div class="card-body">
                ${catIconHtml}
                ${referenceHtml}
                <h3 class="card-title">${escapeHtml(post.title || "Sin título")}</h3>
                ${post.description ? `<p class="card-desc">${escapeHtml(post.description)}</p>` : ""}
                ${sizesHtml}
                <div class="card-footer">
                    <span class="card-price">${post.price ? formatPrice(post.price) : "—"}</span>
                    <div class="card-actions">
                        <button class="icon-btn" data-action="view" title="Ver detalle">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="icon-btn" data-action="edit" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="icon-btn danger" data-action="delete" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (hasMedia && media.length > 1) {
            setupCardCarousel(card, media.length);
        }

        card.addEventListener("click", (ev) => {
            if (ev.target.closest("button")) return;
            openViewModal(post);
        });

        card.querySelectorAll("[data-action]").forEach((btn) => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const action = btn.dataset.action;
                if (action === "view") openViewModal(post);
                if (action === "edit") openEditModal(post);
                if (action === "delete") openDeleteModal(post.id, "post", post.title);
            });
        });

        postsGrid.appendChild(card);
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

    card.querySelectorAll(".card-nav").forEach((btn) => {
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
   FILTROS Y BÚSQUEDA (publicaciones)
================================= */
function applyFilters() {
    filteredPosts = allPosts.filter((p) => {
        if (currentFilter === "active" && p.status !== "active") return false;
        if (currentFilter === "draft" && p.status !== "draft") return false;
        if (currentFilter === "featured" && !p.featured) return false;

        if (searchTerm) {
            const hay = `${p.title} ${p.description} ${p.category} ${p.reference || ""}`.toLowerCase();
            if (!hay.includes(searchTerm.toLowerCase())) return false;
        }
        return true;
    });

    renderPosts();
    updateStats();
}

function updateStats() {
    document.getElementById("statTotal").textContent = allPosts.length;
    document.getElementById("statActivas").textContent = allPosts.filter(p => p.status === "active").length;
    document.getElementById("statImagenes").textContent = allPosts.reduce((acc, p) => acc + (p.media?.length || 0), 0);
    document.getElementById("statCategorias").textContent = allCategories.length;
}

document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value.trim();
    applyFilters();
});

document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentFilter = chip.dataset.filter;
        applyFilters();
    });
});

document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentView = btn.dataset.view;
        postsGrid.classList.toggle("list-view", currentView === "list");
    });
});


/* =================================
   FIRESTORE: PUBLICACIONES EN VIVO
================================= */
function startPostsListener() {
    const q = query(collection(db, POSTS_COLLECTION), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allPosts = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        skeletonGrid.style.display = "none";
        applyFilters();

        if (document.querySelector('[data-section-content="estadisticas"]').style.display !== "none") {
            renderCharts();
        }
    }, (error) => {
        console.error("Error al escuchar publicaciones:", error);
        skeletonGrid.style.display = "none";
        showToast("Error al cargar las publicaciones.", "error");
    });
}


/* =================================
   FIRESTORE: CATEGORÍAS EN VIVO
================================= */
function startCategoriesListener() {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy("name", "asc"));

    onSnapshot(q, (snapshot) => {
        allCategories = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        renderCategorySelect();
        renderCategories();
        updateStats();
        renderPosts();

        if (document.querySelector('[data-section-content="estadisticas"]').style.display !== "none") {
            renderCharts();
        }
    }, (error) => {
        console.error("Error al escuchar categorías:", error);
        showToast("Error al cargar las categorías.", "error");
    });
}


/* =================================
   MODAL POST (CREAR / EDITAR)
================================= */
const postModal = document.getElementById("postModal");
const postForm = document.getElementById("postForm");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const mediaPreview = document.getElementById("mediaPreview");
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const savePostBtn = document.getElementById("savePost");
const sizesSelected = document.getElementById("sizesSelected");

function openCreateModal() {
    editingPostId = null;
    currentMedia = [];
    postForm.reset();
    modalTitle.textContent = "Nueva publicación";
    modalSubtitle.textContent = "Completa los datos del producto";
    document.querySelectorAll(".size-chip").forEach(c => c.classList.remove("selected"));

    // Limpiar referencia
    document.getElementById("postReference").value = "";
    const refStatus = document.getElementById("referenceStatus");
    refStatus.className = "reference-status";
    refStatus.textContent = "";

    renderMediaPreview();
    renderSelectedSizes();
    openModal(postModal);
}

function openEditModal(post) {
    editingPostId = post.id;

    currentMedia = Array.isArray(post.media)
        ? post.media.map(m => ({ ...m, file: null, isPending: false }))
        : [];

    document.getElementById("postTitle").value = post.title || "";
    document.getElementById("postReference").value = post.reference || "";
    document.getElementById("postCategory").value = post.category || "";
    document.getElementById("postPrice").value = post.price || "";
    document.getElementById("postDescription").value = post.description || "";
    document.getElementById("postLink").value = post.link || "";
    document.getElementById("postStatus").value = post.status || "active";
    document.getElementById("postStock").value = post.stock ?? "";
    document.getElementById("postFeatured").checked = !!post.featured;

    // Limpiar estado de referencia al editar
    const refStatus = document.getElementById("referenceStatus");
    refStatus.className = "reference-status";
    refStatus.textContent = "";

    const savedSizes = Array.isArray(post.sizes) ? post.sizes : [];
    document.querySelectorAll(".size-chip").forEach(chip => {
        chip.classList.toggle("selected", savedSizes.includes(chip.dataset.size));
    });

    modalTitle.textContent = "Editar publicación";
    modalSubtitle.textContent = post.title || "Modifica los datos del producto";

    renderMediaPreview();
    renderSelectedSizes();
    openModal(postModal);
}

document.getElementById("btnNewPost").addEventListener("click", openCreateModal);
document.getElementById("btnEmptyNew").addEventListener("click", openCreateModal);
document.getElementById("closePostModal").addEventListener("click", () => closeModal(postModal));
document.getElementById("cancelPost").addEventListener("click", () => closeModal(postModal));


/* =================================
   TALLAS
================================= */
document.querySelectorAll(".size-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        chip.classList.toggle("selected");
        renderSelectedSizes();
    });
});

function getSelectedSizes() {
    return Array.from(document.querySelectorAll(".size-chip.selected"))
        .map(c => c.dataset.size);
}

function renderSelectedSizes() {
    const sizes = getSelectedSizes();

    if (!sizes.length) {
        sizesSelected.innerHTML = `<span class="sizes-empty">Ninguna talla seleccionada</span>`;
        return;
    }

    sizesSelected.innerHTML = sizes.map(s => `
        <span class="size-tag">
            ${escapeHtml(s)}
            <button type="button" data-size="${escapeHtml(s)}" title="Quitar">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </span>
    `).join("");

    sizesSelected.querySelectorAll("button[data-size]").forEach(btn => {
        btn.addEventListener("click", () => {
            const size = btn.dataset.size;
            document.querySelectorAll(".size-chip").forEach(chip => {
                if (chip.dataset.size === size) chip.classList.remove("selected");
            });
            renderSelectedSizes();
        });
    });
}


/* =================================
   VALIDACIÓN DE REFERENCIA (SKU)
================================= */
const referenceInput = document.getElementById("postReference");
const referenceStatus = document.getElementById("referenceStatus");

referenceInput.addEventListener("input", (e) => {
    // Forzar mayúsculas y limpiar caracteres inválidos
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, "");

    clearTimeout(referenceCheckTimeout);

    const ref = e.target.value.trim();

    if (!ref) {
        referenceStatus.className = "reference-status";
        referenceStatus.textContent = "";
        referenceStatus.title = "";
        return;
    }

    // Mostrar estado "chequeando"
    referenceStatus.className = "reference-status checking";
    referenceStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    referenceStatus.title = "Verificando...";

    // Debounce
    referenceCheckTimeout = setTimeout(() => {
        validateReference(ref);
    }, 400);
});

function validateReference(ref) {
    const duplicate = allPosts.find(p =>
        (p.reference || "").toUpperCase() === ref.toUpperCase()
        && p.id !== editingPostId
    );

    if (duplicate) {
        referenceStatus.className = "reference-status invalid";
        referenceStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        referenceStatus.title = `Ya existe en "${duplicate.title}"`;
    } else {
        referenceStatus.className = "reference-status valid";
        referenceStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        referenceStatus.title = "Referencia disponible";
    }
}


/* =================================
   MEDIA PREVIEW
================================= */
function renderMediaPreview() {
    mediaPreview.innerHTML = "";

    currentMedia.forEach((m, i) => {
        const item = document.createElement("div");
        item.className = "media-item";

        const isVideo = m.type === "video";
        const inner = isVideo
            ? `<video src="${m.url}" muted preload="metadata"></video>`
            : `<img src="${m.url}" alt="media">`;

        item.innerHTML = `
            ${inner}
            <span class="media-type">${isVideo ? "Video" : "Foto"}</span>
            ${i === 0 ? `<span class="media-main">Portada</span>` : ""}
            ${m.isPending ? `<span class="media-pending"><i class="fa-solid fa-clock"></i> Pendiente</span>` : ""}
            <button type="button" class="media-remove" data-index="${i}" title="Eliminar">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        item.querySelector(".media-remove").addEventListener("click", () => {
            const removed = currentMedia[i];
            if (removed?.isPending && removed.url?.startsWith("blob:")) {
                URL.revokeObjectURL(removed.url);
            }
            currentMedia.splice(i, 1);
            renderMediaPreview();
        });

        mediaPreview.appendChild(item);
    });
}


/* =================================
   SUBIDA DIFERIDA (publicaciones)
================================= */
dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

function handleFiles(files) {
    const fileArray = Array.from(files).filter(f => {
        const isImage = f.type.startsWith("image/");
        const isVideo = f.type.startsWith("video/");
        if (!isImage && !isVideo) {
            showToast(`"${f.name}" no es una imagen o video válido.`, "warning");
            return false;
        }
        if (f.size > 20 * 1024 * 1024) {
            showToast(`"${f.name}" supera los 20MB.`, "warning");
            return false;
        }
        return true;
    });

    if (!fileArray.length) return;

    fileArray.forEach(file => {
        const isVideo = file.type.startsWith("video/");
        const localUrl = URL.createObjectURL(file);

        currentMedia.push({
            url: localUrl,
            publicId: null,
            type: isVideo ? "video" : "image",
            name: file.name,
            file,
            isPending: true
        });
    });

    renderMediaPreview();
    fileInput.value = "";
}


/* =================================
   GUARDAR PUBLICACIÓN
================================= */
postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("postTitle").value.trim();
    const reference = document.getElementById("postReference").value.trim().toUpperCase();
    const category = document.getElementById("postCategory").value.trim();
    const price = document.getElementById("postPrice").value;
    const description = document.getElementById("postDescription").value.trim();
    const link = document.getElementById("postLink").value.trim();
    const status = document.getElementById("postStatus").value;
    const stock = document.getElementById("postStock").value;
    const featured = document.getElementById("postFeatured").checked;
    const sizes = getSelectedSizes();

    if (!title) return showToast("El título es obligatorio.", "warning");
    if (!category) return showToast("Selecciona una categoría.", "warning");
    if (!currentMedia.length) return showToast("Agrega al menos una imagen o video.", "warning");

    // Validar referencia única
    if (reference) {
        const duplicate = allPosts.find(p =>
            (p.reference || "").toUpperCase() === reference
            && p.id !== editingPostId
        );
        if (duplicate) {
            return showToast(`La referencia "${reference}" ya está en uso por "${duplicate.title}".`, "warning", 5000);
        }
    }

    savePostBtn.disabled = true;
    savePostBtn.innerHTML = `<span class="sov-spinner" style="border-color:rgba(13,13,13,.35);border-top-color:#0D0D0D"></span> Guardando...`;

    const pendingItems = currentMedia.filter(m => m.isPending);
    if (pendingItems.length) {
        uploadProgress.style.display = "flex";
        progressText.textContent = `Subiendo ${pendingItems.length} archivo(s)...`;
        progressFill.style.width = "0%";
    }

    try {
        let completed = 0;
        for (let i = 0; i < currentMedia.length; i++) {
            const m = currentMedia[i];
            if (!m.isPending || !m.file) continue;

            try {
                const result = await uploadToCloudinary(m.file, (percent) => {
                    const base = (completed / pendingItems.length) * 100;
                    const step = (percent / 100) * (100 / pendingItems.length);
                    progressFill.style.width = `${Math.min(base + step, 100)}%`;
                });

                currentMedia[i] = {
                    url: result.url,
                    publicId: result.publicId,
                    type: result.type,
                    name: m.name,
                    file: null,
                    isPending: false
                };

                if (m.url?.startsWith("blob:")) URL.revokeObjectURL(m.url);

                completed++;
                progressFill.style.width = `${(completed / pendingItems.length) * 100}%`;

            } catch (err) {
                console.error("Error subiendo:", err);
                throw new Error(`No se pudo subir "${m.name}"`);
            }
        }

        const mediaToSave = currentMedia.map(m => ({
            url: m.url,
            publicId: m.publicId,
            type: m.type,
            name: m.name
        }));

        const data = {
            title,
            reference,
            category,
            description,
            link,
            status,
            featured,
            sizes,
            price: price ? Number(price) : 0,
            stock: stock ? Number(stock) : 0,
            media: mediaToSave,
            coverUrl: mediaToSave[0]?.url || "",
            updatedAt: serverTimestamp()
        };

        if (editingPostId) {
            await updateDoc(doc(db, POSTS_COLLECTION, editingPostId), data);
            showToast("Publicación actualizada correctamente.", "success");
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, POSTS_COLLECTION), data);
            showToast("Publicación creada correctamente.", "success");
        }

        closeModal(postModal);
        currentMedia = [];
        editingPostId = null;

    } catch (err) {
        console.error(err);
        showToast(err.message || "No se pudo guardar la publicación.", "error");
    } finally {
        savePostBtn.disabled = false;
        savePostBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Guardar publicación</span>`;
        uploadProgress.style.display = "none";
        progressFill.style.width = "0%";
    }
});


/* =================================
   MODAL VER DETALLE
================================= */
const viewModal = document.getElementById("viewModal");
const viewCarousel = document.getElementById("viewCarousel");
const viewDots = document.getElementById("viewDots");
let viewTotal = 0;

function openViewModal(post) {
    viewingPost = post;
    viewCarouselIndex = 0;

    const media = post.media || [];
    viewTotal = media.length;

    viewCarousel.innerHTML = media.length
        ? media.map(m => m.type === "video"
            ? `<div class="view-slide"><video src="${m.url}" controls playsinline preload="metadata"></video></div>`
            : `<div class="view-slide"><img src="${m.url}" alt="${escapeHtml(post.title)}"></div>`
        ).join("")
        : `<div class="view-slide" style="color:var(--gray);flex-direction:column;gap:10px;">
              <i class="fa-solid fa-image" style="font-size:48px;opacity:.3"></i>
              <span>Sin multimedia</span>
           </div>`;

    viewDots.innerHTML = media.length > 1
        ? media.map((_, i) => `<button class="card-dot ${i === 0 ? "active" : ""}" data-index="${i}"></button>`).join("")
        : "";

    document.getElementById("viewTitle").textContent = post.title || "Sin título";
    document.getElementById("viewCategory").textContent = post.category || "General";
    document.getElementById("viewPrice").textContent = post.price ? formatPrice(post.price) : "";
    document.getElementById("viewDescription").textContent = post.description || "Sin descripción.";

    // Referencia
    const refEl = document.getElementById("viewReference");
    if (refEl) {
        if (post.reference) {
            refEl.style.display = "inline-flex";
            refEl.innerHTML = `<i class="fa-solid fa-hashtag"></i> Ref: <strong>${escapeHtml(post.reference)}</strong>`;
        } else {
            refEl.style.display = "none";
        }
    }

    const cat = getCategoryByName(post.category);
    const catEl = document.getElementById("viewCategory");
    if (cat) {
        catEl.style.background = `${cat.color}22`;
        catEl.style.color = cat.color;
        catEl.style.borderColor = `${cat.color}55`;
        catEl.innerHTML = `<i class="${cat.icon}"></i> ${escapeHtml(cat.name)}`;
    }

    const sizesBox = document.getElementById("viewSizes");
    const sizesList = document.getElementById("viewSizesList");
    const sizes = Array.isArray(post.sizes) ? post.sizes : [];
    if (sizes.length) {
        sizesBox.style.display = "flex";
        sizesList.innerHTML = sizes.map(s => `<span class="view-size-tag">${escapeHtml(s)}</span>`).join("");
    } else {
        sizesBox.style.display = "none";
    }

    const featuredEl = document.getElementById("viewFeatured");
    featuredEl.style.display = post.featured ? "inline-flex" : "none";

    const linkEl = document.getElementById("viewLink");
    if (post.link) {
        linkEl.href = post.link;
        linkEl.style.display = "inline-flex";
    } else {
        linkEl.style.display = "none";
    }

    const meta = document.getElementById("viewMeta");
    meta.innerHTML = `
        ${post.reference ? `<div class="view-meta-row"><span>Referencia</span><span>${escapeHtml(post.reference)}</span></div>` : ""}
        <div class="view-meta-row"><span>Estado</span><span>${post.status === "draft" ? "Borrador" : "Activa"}</span></div>
        <div class="view-meta-row"><span>Stock</span><span>${post.stock ?? "—"}</span></div>
        <div class="view-meta-row"><span>Multimedia</span><span>${media.length} archivo(s)</span></div>
        <div class="view-meta-row"><span>Actualizado</span><span>${post.updatedAt?.toDate ? post.updatedAt.toDate().toLocaleDateString("es-CO") : "—"}</span></div>
    `;

    updateViewCarousel();
    openModal(viewModal);
}

function updateViewCarousel() {
    viewCarousel.style.transform = `translateX(-${viewCarouselIndex * 100}%)`;
    viewDots.querySelectorAll(".card-dot").forEach((d, i) => {
        d.classList.toggle("active", i === viewCarouselIndex);
    });
    document.getElementById("viewPrev").disabled = viewCarouselIndex === 0;
    document.getElementById("viewNext").disabled = viewCarouselIndex === viewTotal - 1;
}

document.getElementById("viewPrev").addEventListener("click", () => {
    if (viewCarouselIndex > 0) {
        viewCarouselIndex--;
        updateViewCarousel();
    }
});

document.getElementById("viewNext").addEventListener("click", () => {
    if (viewCarouselIndex < viewTotal - 1) {
        viewCarouselIndex++;
        updateViewCarousel();
    }
});

viewDots.addEventListener("click", (e) => {
    const dot = e.target.closest(".card-dot");
    if (!dot) return;
    viewCarouselIndex = parseInt(dot.dataset.index, 10);
    updateViewCarousel();
});

document.getElementById("closeViewModal").addEventListener("click", () => closeModal(viewModal));

document.getElementById("viewEditBtn").addEventListener("click", () => {
    if (!viewingPost) return;
    closeModal(viewModal);
    setTimeout(() => openEditModal(viewingPost), 250);
});


/* =================================
   CATEGORÍAS
================================= */

const categoriesGrid = document.getElementById("categoriesGrid");
const emptyCategories = document.getElementById("emptyCategories");
const categoryModal = document.getElementById("categoryModal");
const categoryForm = document.getElementById("categoryForm");
const categoryModalTitle = document.getElementById("categoryModalTitle");
const categoryModalSubtitle = document.getElementById("categoryModalSubtitle");
const iconPicker = document.getElementById("iconPicker");
const colorPicker = document.getElementById("colorPicker");
const categoryPreview = document.getElementById("categoryPreview");
const categoryPreviewIcon = document.getElementById("categoryPreviewIcon");
const categoryPreviewName = document.getElementById("categoryPreviewName");
const categoryPreviewDesc = document.getElementById("categoryPreviewDesc");
const saveCategoryBtn = document.getElementById("saveCategory");

function renderCategorySelect() {
    const select = document.getElementById("postCategory");
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = `<option value="">Seleccionar...</option>` +
        allCategories.map(c =>
            `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`
        ).join("");

    if (currentValue && allCategories.some(c => c.name === currentValue)) {
        select.value = currentValue;
    }
}

function renderCategories() {
    categoriesGrid.innerHTML = "";

    filteredCategories = allCategories.filter(c => {
        if (!searchCategoryTerm) return true;
        const hay = `${c.name} ${c.description || ""}`.toLowerCase();
        return hay.includes(searchCategoryTerm.toLowerCase());
    });

    if (!filteredCategories.length) {
        categoriesGrid.style.display = "none";
        emptyCategories.style.display = "block";
        return;
    }

    categoriesGrid.style.display = "grid";
    emptyCategories.style.display = "none";

    filteredCategories.forEach((cat, idx) => {
        const card = document.createElement("article");
        card.className = "category-card";
        card.style.setProperty("--category-color", cat.color || "#FE98B2");
        card.style.animationDelay = `${idx * 30}ms`;

        const count = allPosts.filter(p => p.category === cat.name).length;

        card.innerHTML = `
            <div class="category-card-header">
                <div class="category-icon">
                    <i class="${cat.icon || "fa-solid fa-tag"}"></i>
                </div>
                <div class="category-info">
                    <span class="category-name">${escapeHtml(cat.name)}</span>
                    <span class="category-slug">${escapeHtml(cat.slug || slugify(cat.name))}</span>
                </div>
            </div>

            <p class="category-desc">${escapeHtml(cat.description || "Sin descripción")}</p>

            <div class="category-footer">
                <span class="category-count">
                    <i class="fa-solid fa-box"></i>
                    <strong>${count}</strong> publicación${count === 1 ? "" : "es"}
                </span>
                <div class="category-actions">
                    <button class="icon-btn" data-action="edit" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn danger" data-action="delete" title="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        card.querySelector('[data-action="edit"]').addEventListener("click", () => openEditCategory(cat));
        card.querySelector('[data-action="delete"]').addEventListener("click", () => {
            if (count > 0) {
                showToast(`No puedes eliminar "${cat.name}". Tiene ${count} publicación(es) asociada(s).`, "warning", 5000);
                return;
            }
            openDeleteModal(cat.id, "category", cat.name);
        });

        categoriesGrid.appendChild(card);
    });
}

document.getElementById("searchCategory").addEventListener("input", (e) => {
    searchCategoryTerm = e.target.value.trim();
    renderCategories();
});

function buildIconPicker() {
    iconPicker.innerHTML = ICON_OPTIONS.map(icon => `
        <button type="button" class="icon-picker-btn" data-icon="${icon}">
            <i class="${icon}"></i>
        </button>
    `).join("");

    iconPicker.querySelectorAll(".icon-picker-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            iconPicker.querySelectorAll(".icon-picker-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            pendingCategoryIcon = btn.dataset.icon;
            updateCategoryPreview();
        });
    });
}

function buildColorPicker() {
    colorPicker.innerHTML = COLOR_OPTIONS.map(color => `
        <button type="button" class="color-swatch" data-color="${color}" style="background:${color};"></button>
    `).join("");

    colorPicker.querySelectorAll(".color-swatch").forEach(sw => {
        sw.addEventListener("click", () => {
            colorPicker.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
            sw.classList.add("selected");
            pendingCategoryColor = sw.dataset.color;
            updateCategoryPreview();
        });
    });
}

function updateCategoryPreview() {
    const name = document.getElementById("categoryName").value.trim() || "Nombre de categoría";
    const desc = document.getElementById("categoryDescription").value.trim() || "Descripción de la categoría";

    categoryPreviewIcon.innerHTML = `<i class="${pendingCategoryIcon}"></i>`;
    categoryPreviewIcon.style.background = pendingCategoryColor;
    categoryPreviewName.textContent = name;
    categoryPreviewDesc.textContent = desc;
    categoryPreview.style.setProperty("--category-color", pendingCategoryColor);
}

document.getElementById("categoryName").addEventListener("input", updateCategoryPreview);
document.getElementById("categoryDescription").addEventListener("input", updateCategoryPreview);

function openCreateCategory() {
    editingCategoryId = null;
    categoryForm.reset();
    pendingCategoryIcon = "fa-solid fa-tag";
    pendingCategoryColor = "#FE98B2";

    iconPicker.querySelectorAll(".icon-picker-btn").forEach((b, i) => {
        b.classList.toggle("selected", i === 0);
    });
    colorPicker.querySelectorAll(".color-swatch").forEach((s, i) => {
        s.classList.toggle("selected", i === 0);
    });

    categoryModalTitle.textContent = "Nueva categoría";
    categoryModalSubtitle.textContent = "Crea una categoría para organizar tus productos";

    updateCategoryPreview();
    openModal(categoryModal);
}

function openEditCategory(cat) {
    editingCategoryId = cat.id;
    categoryForm.reset();

    document.getElementById("categoryName").value = cat.name || "";
    document.getElementById("categoryDescription").value = cat.description || "";

    pendingCategoryIcon = cat.icon || "fa-solid fa-tag";
    pendingCategoryColor = cat.color || "#FE98B2";

    iconPicker.querySelectorAll(".icon-picker-btn").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.icon === pendingCategoryIcon);
    });

    if (!ICON_OPTIONS.includes(pendingCategoryIcon)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "icon-picker-btn selected";
        btn.dataset.icon = pendingCategoryIcon;
        btn.innerHTML = `<i class="${pendingCategoryIcon}"></i>`;
        btn.addEventListener("click", () => {
            iconPicker.querySelectorAll(".icon-picker-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            pendingCategoryIcon = btn.dataset.icon;
            updateCategoryPreview();
        });
        iconPicker.prepend(btn);
    }

    colorPicker.querySelectorAll(".color-swatch").forEach(sw => {
        sw.classList.toggle("selected", sw.dataset.color === pendingCategoryColor);
    });

    if (!COLOR_OPTIONS.includes(pendingCategoryColor)) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "color-swatch selected";
        sw.dataset.color = pendingCategoryColor;
        sw.style.background = pendingCategoryColor;
        sw.addEventListener("click", () => {
            colorPicker.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("selected"));
            sw.classList.add("selected");
            pendingCategoryColor = sw.dataset.color;
            updateCategoryPreview();
        });
        colorPicker.prepend(sw);
    }

    categoryModalTitle.textContent = "Editar categoría";
    categoryModalSubtitle.textContent = cat.name || "Modifica los datos de la categoría";

    updateCategoryPreview();
    openModal(categoryModal);
}

document.getElementById("btnNewCategory").addEventListener("click", openCreateCategory);
document.getElementById("btnEmptyCategory").addEventListener("click", openCreateCategory);
document.getElementById("closeCategoryModal").addEventListener("click", () => closeModal(categoryModal));
document.getElementById("cancelCategory").addEventListener("click", () => closeModal(categoryModal));

categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("categoryName").value.trim();
    const description = document.getElementById("categoryDescription").value.trim();

    if (!name) return showToast("El nombre es obligatorio.", "warning");

    const duplicate = allCategories.find(c =>
        c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId
    );
    if (duplicate) {
        return showToast("Ya existe una categoría con ese nombre.", "warning");
    }

    saveCategoryBtn.disabled = true;
    saveCategoryBtn.innerHTML = `<span class="sov-spinner" style="border-color:rgba(13,13,13,.35);border-top-color:#0D0D0D"></span> Guardando...`;

    const data = {
        name,
        slug: slugify(name),
        description,
        icon: pendingCategoryIcon,
        color: pendingCategoryColor,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingCategoryId) {
            await updateDoc(doc(db, CATEGORIES_COLLECTION, editingCategoryId), data);
            showToast("Categoría actualizada correctamente.", "success");
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, CATEGORIES_COLLECTION), data);
            showToast("Categoría creada correctamente.", "success");
        }

        closeModal(categoryModal);
        editingCategoryId = null;
    } catch (err) {
        console.error(err);
        showToast("No se pudo guardar la categoría.", "error");
    } finally {
        saveCategoryBtn.disabled = false;
        saveCategoryBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Guardar categoría</span>`;
    }
});


/* =================================
   MODAL ELIMINAR (genérico)
================================= */
const deleteModal = document.getElementById("deleteModal");
const deleteTitle = document.getElementById("deleteTitle");
const deleteMessage = document.getElementById("deleteMessage");

function openDeleteModal(id, type, name = "") {
    pendingDeleteId = id;
    pendingDeleteType = type;

    if (type === "post") {
        deleteTitle.textContent = "¿Eliminar publicación?";
        deleteMessage.textContent = name
            ? `Se eliminará "${name}" permanentemente. Esta acción no se puede deshacer.`
            : "Esta acción no se puede deshacer.";
    } else {
        deleteTitle.textContent = "¿Eliminar categoría?";
        deleteMessage.textContent = name
            ? `Se eliminará la categoría "${name}" permanentemente.`
            : "Esta acción no se puede deshacer.";
    }

    openModal(deleteModal);
}

document.getElementById("cancelDelete").addEventListener("click", () => {
    pendingDeleteId = null;
    pendingDeleteType = null;
    closeModal(deleteModal);
});

document.getElementById("confirmDelete").addEventListener("click", async () => {
    if (!pendingDeleteId) return;

    const btn = document.getElementById("confirmDelete");
    btn.disabled = true;
    btn.innerHTML = `<span class="sov-spinner" style="border-color:rgba(255,255,255,.3);border-top-color:#fff"></span> Eliminando...`;

    try {
        const col = pendingDeleteType === "post" ? POSTS_COLLECTION : CATEGORIES_COLLECTION;
        await deleteDoc(doc(db, col, pendingDeleteId));

        showToast(
            pendingDeleteType === "post"
                ? "Publicación eliminada."
                : "Categoría eliminada.",
            "success"
        );

        closeModal(deleteModal);
        pendingDeleteId = null;
        pendingDeleteType = null;
    } catch (err) {
        console.error(err);
        showToast("No se pudo eliminar. Intenta de nuevo.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-trash"></i> Eliminar`;
    }
});


/* =================================
   ESTADÍSTICAS
================================= */

let chartCategoria = null;
let chartEstado = null;
let chartStock = null;
let chartValor = null;

function loadChartJS() {
    return new Promise((resolve) => {
        if (window.Chart) return resolve();

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
    });
}

function chartColors() {
    const isLight = document.body.classList.contains("light-theme");
    return {
        text: isLight ? "#0D0D0D" : "#FFFFFF",
        grid: isLight ? "rgba(13,13,13,0.06)" : "rgba(255,255,255,0.06)",
        border: isLight ? "rgba(13,13,13,0.10)" : "rgba(255,255,255,0.10)"
    };
}

function updateStatsAdvanced() {
    const valorTotal = allPosts.reduce((acc, p) => {
        const precio = Number(p.price) || 0;
        const stock = Number(p.stock) || 0;
        return acc + precio * stock;
    }, 0);
    document.getElementById("statValorTotal").textContent = formatPrice(valorTotal);

    const conPrecio = allPosts.filter(p => Number(p.price) > 0);
    const promedio = conPrecio.length
        ? conPrecio.reduce((a, p) => a + Number(p.price), 0) / conPrecio.length
        : 0;
    document.getElementById("statPrecioPromedio").textContent = formatPrice(Math.round(promedio));

    const sinStock = allPosts.filter(p => (Number(p.stock) || 0) === 0).length;
    document.getElementById("statSinStock").textContent = sinStock;

    const conteo = {};
    allPosts.forEach(p => {
        if (p.category) conteo[p.category] = (conteo[p.category] || 0) + 1;
    });
    const topEntry = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("statTopCategoria").textContent = topEntry ? topEntry[0] : "—";
}

function renderCharts() {
    if (!window.Chart) return;

    updateStatsAdvanced();

    const colors = chartColors();

    const catMap = {};
    allPosts.forEach(p => {
        if (p.category) catMap[p.category] = (catMap[p.category] || 0) + 1;
    });

    const catLabels = Object.keys(catMap);
    const catData = Object.values(catMap);
    const catColors = catLabels.map(name => {
        const c = allCategories.find(x => x.name === name);
        return c?.color || "#FE98B2";
    });

    if (chartCategoria) chartCategoria.destroy();
    const ctxCat = document.getElementById("chartPorCategoria");
    if (ctxCat) {
        chartCategoria = new Chart(ctxCat, {
            type: "doughnut",
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: catColors,
                    borderColor: colors.border,
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: colors.text,
                            font: { family: "Poppins", size: 11, weight: "500" },
                            padding: 14,
                            boxWidth: 12,
                            boxHeight: 12,
                            usePointStyle: true,
                            pointStyle: "circle"
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(13,13,13,0.9)",
                        titleFont: { family: "Poppins", size: 12 },
                        bodyFont: { family: "Poppins", size: 12 },
                        padding: 10,
                        cornerRadius: 8
                    }
                }
            }
        });
    }

    const activas = allPosts.filter(p => p.status === "active").length;
    const borradores = allPosts.filter(p => p.status === "draft").length;
    const destacadas = allPosts.filter(p => p.featured).length;

    if (chartEstado) chartEstado.destroy();
    const ctxEst = document.getElementById("chartEstados");
    if (ctxEst) {
        chartEstado = new Chart(ctxEst, {
            type: "doughnut",
            data: {
                labels: ["Activas", "Borradores", "Destacadas"],
                datasets: [{
                    data: [activas, borradores, destacadas],
                    backgroundColor: ["#22C55E", "#64748B", "#F59E0B"],
                    borderColor: colors.border,
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: colors.text,
                            font: { family: "Poppins", size: 11, weight: "500" },
                            padding: 14,
                            boxWidth: 12,
                            boxHeight: 12,
                            usePointStyle: true,
                            pointStyle: "circle"
                        }
                    }
                }
            }
        });
    }

    const topStock = [...allPosts]
        .filter(p => (Number(p.stock) || 0) > 0)
        .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
        .slice(0, 5);

    if (chartStock) chartStock.destroy();
    const ctxStock = document.getElementById("chartStock");
    if (ctxStock) {
        chartStock = new Chart(ctxStock, {
            type: "bar",
            data: {
                labels: topStock.map(p => {
                    const t = p.title || "";
                    return t.length > 18 ? t.substring(0, 18) + "…" : t;
                }),
                datasets: [{
                    label: "Unidades",
                    data: topStock.map(p => Number(p.stock) || 0),
                    backgroundColor: "#FE98B2",
                    borderRadius: 8,
                    borderSkipped: false,
                    maxBarThickness: 38
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "rgba(13,13,13,0.9)",
                        titleFont: { family: "Poppins", size: 12 },
                        bodyFont: { family: "Poppins", size: 12 },
                        padding: 10,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: "Poppins", size: 10 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: colors.text,
                            font: { family: "Poppins", size: 10.5, weight: "500" }
                        }
                    }
                }
            }
        });
    }

    const valorPorCat = {};
    allPosts.forEach(p => {
        if (!p.category) return;
        const valor = (Number(p.price) || 0) * (Number(p.stock) || 0);
        valorPorCat[p.category] = (valorPorCat[p.category] || 0) + valor;
    });

    const valLabels = Object.keys(valorPorCat);
    const valData = Object.values(valorPorCat);
    const valColors = valLabels.map(name => {
        const c = allCategories.find(x => x.name === name);
        return c?.color || "#FE98B2";
    });

    if (chartValor) chartValor.destroy();
    const ctxValor = document.getElementById("chartValor");
    if (ctxValor) {
        chartValor = new Chart(ctxValor, {
            type: "bar",
            data: {
                labels: valLabels,
                datasets: [{
                    label: "Valor (COP)",
                    data: valData,
                    backgroundColor: valColors,
                    borderRadius: 8,
                    borderSkipped: false,
                    maxBarThickness: 44
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "rgba(13,13,13,0.9)",
                        titleFont: { family: "Poppins", size: 12 },
                        bodyFont: { family: "Poppins", size: 12 },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => formatPrice(ctx.parsed.y)
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: colors.text,
                            font: { family: "Poppins", size: 10.5, weight: "500" }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: colors.grid },
                        ticks: {
                            color: colors.text,
                            font: { family: "Poppins", size: 10 },
                            callback: (v) => {
                                if (v >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
                                if (v >= 1000) return "$" + (v / 1000).toFixed(0) + "K";
                                return "$" + v;
                            }
                        }
                    }
                }
            }
        });
    }

    renderLowStock();
}

function renderLowStock() {
    const list = document.getElementById("lowStockList");
    if (!list) return;

    const lowStock = allPosts
        .filter(p => {
            const stock = Number(p.stock);
            return !isNaN(stock) && stock > 0 && stock < 5;
        })
        .sort((a, b) => Number(a.stock) - Number(b.stock));

    if (!lowStock.length) {
        list.innerHTML = `
            <div class="low-stock-empty">
                <i class="fa-solid fa-circle-check"></i>
                No hay productos con stock bajo. ¡Todo bien!
            </div>
        `;
        return;
    }

    list.innerHTML = lowStock.map(p => {
        const cover = p.coverUrl || p.media?.[0]?.url || "";
        const thumb = cover
            ? `<img src="${cover}" alt="${escapeHtml(p.title)}" loading="lazy">`
            : `<i class="fa-solid fa-image"></i>`;

        return `
            <div class="low-stock-item">
                <div class="low-stock-thumb">${thumb}</div>
                <div class="low-stock-info">
                    <h4>${escapeHtml(p.title || "Sin título")}</h4>
                    <p>${p.reference ? `#${escapeHtml(p.reference)} · ` : ""}${escapeHtml(p.category || "Sin categoría")}</p>
                </div>
                <span class="low-stock-badge">${p.stock} ud.</span>
            </div>
        `;
    }).join("");
}

document.getElementById("btnRefreshStats")?.addEventListener("click", () => {
    renderCharts();
    showToast("Estadísticas actualizadas.", "info", 2000);
});


/* =================================
   CONFIGURACIÓN
================================= */

function loadConfigListener() {
    onSnapshot(CONFIG_DOC, (snapshot) => {
        if (snapshot.exists()) {
            currentConfig = snapshot.data();
        } else {
            currentConfig = {};
        }
        fillConfigForm();
        applyConfigToUI();
    }, (error) => {
        console.error("Error al cargar configuración:", error);
    });
}

function fillConfigForm() {
    const c = currentConfig;

    document.getElementById("cfgStoreName").value = c.storeName || "";
    document.getElementById("cfgSlogan").value = c.slogan || "";

    document.getElementById("cfgWhatsapp").value = c.whatsapp || "";
    document.getElementById("cfgEmail").value = c.email || "";
    document.getElementById("cfgInstagram").value = c.instagram || "";
    document.getElementById("cfgFacebook").value = c.facebook || "";
    document.getElementById("cfgTiktok").value = c.tiktok || "";

    document.getElementById("cfgCurrency").value = c.currency || "COP";
    document.getElementById("cfgPrimaryColor").value = c.primaryColor || "#FE98B2";
    document.getElementById("cfgPrimaryColorHex").value = c.primaryColor || "#FE98B2";
    document.getElementById("cfgFooterText").value = c.footerText || "";

    document.getElementById("cfgShowStockPublic").checked = !!c.showStockPublic;
    document.getElementById("cfgShowPricePublic").checked = c.showPricePublic !== false;

    pendingLogoFile = null;
    removeCurrentLogo = false;
    pendingLogoUrl = c.logoUrl || null;
    updateLogoPreview();
}

function updateLogoPreview() {
    const wrapper = document.getElementById("logoPreviewWrapper");
    const dropzoneContent = document.querySelector(".logo-dropzone-content");
    const preview = document.getElementById("cfgLogoPreview");

    const url = pendingLogoUrl;

    if (url && !removeCurrentLogo) {
        preview.src = url;
        if (wrapper) wrapper.style.display = "flex";
        if (dropzoneContent) dropzoneContent.style.display = "none";
    } else {
        if (wrapper) wrapper.style.display = "none";
        if (dropzoneContent) dropzoneContent.style.display = "block";
        if (preview) preview.src = "img/logo-circular.png";
    }
}

function handleLogoFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Solo se permiten imágenes para el logo.", "warning");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast("El logo no puede superar los 5MB.", "warning");
        return;
    }

    if (pendingLogoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingLogoUrl);
    }

    pendingLogoFile = file;
    pendingLogoUrl = URL.createObjectURL(file);
    removeCurrentLogo = false;

    updateLogoPreview();
    showToast("Logo cargado. Se subirá al guardar.", "info", 2500);
}

const logoDropzone = document.getElementById("logoDropzone");
const logoFileInput = document.getElementById("logoFileInput");

if (logoDropzone && logoFileInput) {
    logoDropzone.addEventListener("click", (e) => {
        if (e.target.closest("#logoRemoveBtn")) return;
        logoFileInput.click();
    });

    logoFileInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) handleLogoFile(file);
        logoFileInput.value = "";
    });

    logoDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        logoDropzone.classList.add("dragover");
    });

    logoDropzone.addEventListener("dragleave", () => {
        logoDropzone.classList.remove("dragover");
    });

    logoDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        logoDropzone.classList.remove("dragover");
        const file = e.dataTransfer.files?.[0];
        if (file) handleLogoFile(file);
    });
}

document.getElementById("logoRemoveBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();

    if (pendingLogoUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingLogoUrl);
    }

    pendingLogoFile = null;
    pendingLogoUrl = null;
    removeCurrentLogo = true;

    updateLogoPreview();
    showToast("Logo quitado. Guarda para aplicar.", "info", 2500);
});

function applyPrimaryColorToToasts(color) {
    let style = document.getElementById("sov-dynamic-color-style");
    if (!style) {
        style = document.createElement("style");
        style.id = "sov-dynamic-color-style";
        document.head.appendChild(style);
    }
    style.textContent = `
        .sov-toast.sov-info .sov-toast-icon { background: linear-gradient(135deg, ${color}, ${shadeColor(color, -15)}); }
        .sov-toast.sov-info .sov-toast-progress { background: ${color}; }
    `;
}


/* =================================
   SIDEBAR MÓVIL (hamburguesa)
================================= */
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const sidebarEl = document.getElementById("sidebar");

function openSidebar() {
    sidebarEl?.classList.add("open");
    sidebarOverlay?.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeSidebar() {
    sidebarEl?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
    document.body.style.overflow = "";
}

sidebarToggle?.addEventListener("click", () => {
    if (sidebarEl?.classList.contains("open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

sidebarOverlay?.addEventListener("click", closeSidebar);

// Cerrar al hacer clic en un nav-item (móvil)
document.querySelectorAll(".nav-item[data-section]").forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 900) {
            closeSidebar();
        }
    });
});

// Cerrar con Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebarEl?.classList.contains("open")) {
        closeSidebar();
    }
});


function applyConfigToUI() {
    const c = currentConfig;

    const brandText = document.querySelector(".brand-text h2");
    if (brandText && c.storeName) {
        const parts = c.storeName.trim().split(" ");
        if (parts.length > 1) {
            brandText.innerHTML = `${escapeHtml(parts.slice(0, -1).join(" "))} <span>${escapeHtml(parts[parts.length - 1])}</span>`;
        } else {
            brandText.textContent = c.storeName;
        }
    }

    const brandSub = document.querySelector(".brand-text p");
    if (brandSub && c.slogan) {
        brandSub.textContent = c.slogan;
    }

    if (c.logoUrl) {
        const logos = document.querySelectorAll(".brand-icon img, .config-logo-box img");
        logos.forEach(img => { img.src = c.logoUrl; });
    }

    if (c.primaryColor) {
        document.documentElement.style.setProperty("--pink", c.primaryColor);
        applyPrimaryColorToToasts(c.primaryColor);
    }
}

document.getElementById("cfgPrimaryColor")?.addEventListener("input", (e) => {
    document.getElementById("cfgPrimaryColorHex").value = e.target.value.toUpperCase();
});

document.getElementById("cfgPrimaryColorHex")?.addEventListener("input", (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith("#")) val = "#" + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        document.getElementById("cfgPrimaryColor").value = val;
    }
});

document.getElementById("btnSaveConfig")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnSaveConfig");
    btn.disabled = true;
    btn.innerHTML = `<span class="sov-spinner" style="border-color:rgba(13,13,13,.35);border-top-color:#0D0D0D"></span> Guardando...`;

    const logoProgress = document.getElementById("logoUploadProgress");
    const logoProgressFill = document.getElementById("logoProgressFill");
    const logoProgressText = document.getElementById("logoProgressText");

    try {
        let finalLogoUrl = currentConfig.logoUrl || "";

        if (pendingLogoFile) {
            if (logoProgress) logoProgress.style.display = "flex";
            if (logoProgressFill) logoProgressFill.style.width = "0%";
            if (logoProgressText) logoProgressText.textContent = "Subiendo logo...";

            try {
                const result = await uploadToCloudinary(pendingLogoFile, (percent) => {
                    if (logoProgressFill) logoProgressFill.style.width = percent + "%";
                });
                finalLogoUrl = result.url;
            } catch (err) {
                console.error("Error subiendo logo:", err);
                throw new Error("No se pudo subir el logo a Cloudinary.");
            } finally {
                if (logoProgress) logoProgress.style.display = "none";
                if (logoProgressFill) logoProgressFill.style.width = "0%";
            }
        } else if (removeCurrentLogo) {
            finalLogoUrl = "";
        }

        const data = {
            storeName: document.getElementById("cfgStoreName").value.trim(),
            slogan: document.getElementById("cfgSlogan").value.trim(),
            logoUrl: finalLogoUrl,

            whatsapp: document.getElementById("cfgWhatsapp").value.trim(),
            email: document.getElementById("cfgEmail").value.trim(),
            instagram: document.getElementById("cfgInstagram").value.trim(),
            facebook: document.getElementById("cfgFacebook").value.trim(),
            tiktok: document.getElementById("cfgTiktok").value.trim(),

            currency: document.getElementById("cfgCurrency").value,
            primaryColor: document.getElementById("cfgPrimaryColorHex").value.trim(),
            footerText: document.getElementById("cfgFooterText").value.trim(),

            showStockPublic: document.getElementById("cfgShowStockPublic").checked,
            showPricePublic: document.getElementById("cfgShowPricePublic").checked,

            updatedAt: serverTimestamp()
        };

        await setDoc(CONFIG_DOC, data, { merge: true });

        if (pendingLogoUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(pendingLogoUrl);
        }
        pendingLogoFile = null;
        pendingLogoUrl = finalLogoUrl || null;
        removeCurrentLogo = false;

        showToast("Configuración guardada correctamente.", "success");

    } catch (err) {
        console.error(err);
        showToast(err.message || "No se pudo guardar la configuración.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>Guardar cambios</span>`;
        if (logoProgress) logoProgress.style.display = "none";
    }
});

document.getElementById("btnResetConfig")?.addEventListener("click", async () => {
    if (!confirm("¿Restaurar los valores por defecto? Se perderán los cambios actuales.")) return;

    try {
        await setDoc(CONFIG_DOC, {
            storeName: "SovActive Shop",
            slogan: "Panel administrativo",
            logoUrl: "",
            whatsapp: "",
            email: "",
            instagram: "",
            facebook: "",
            tiktok: "",
            currency: "COP",
            primaryColor: "#FE98B2",
            footerText: "© 2026 SovActive Shop",
            showStockPublic: false,
            showPricePublic: true,
            updatedAt: serverTimestamp()
        }, { merge: true });

        document.documentElement.style.setProperty("--pink", "#FE98B2");
        showToast("Configuración restaurada.", "info");
    } catch (err) {
        console.error(err);
        showToast("No se pudo restaurar.", "error");
    }
});

document.getElementById("btnChangePassword")?.addEventListener("click", async () => {
    if (!currentUser?.email) {
        showToast("No se pudo obtener el correo del usuario.", "error");
        return;
    }

    if (!confirm(`¿Enviar correo para cambiar la contraseña a ${currentUser.email}?`)) return;

    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showToast("Te enviamos un correo para restablecer la contraseña. Revisa tu bandeja (y spam).", "success", 6000);
    } catch (err) {
        console.error(err);
        showToast("No se pudo enviar el correo.", "error");
    }
});


/* =================================
   INICIALIZACIÓN
================================= */
buildIconPicker();
buildColorPicker();
startPostsListener();
startCategoriesListener();
loadConfigListener();

loadChartJS().then(() => {
    renderCharts();
});

const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
        if (m.attributeName === "class") {
            if (window.Chart) {
                setTimeout(() => renderCharts(), 120);
            }
        }
    });
});
themeObserver.observe(document.body, { attributes: true });