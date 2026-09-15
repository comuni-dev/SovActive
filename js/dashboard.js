/* =================================
   SOVACTIVE SHOP — DASHBOARD
================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
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
    serverTimestamp
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


/* =================================
   ESTADO GLOBAL
================================= */
let allPosts = [];
let filteredPosts = [];
let currentFilter = "all";
let currentView = "grid";
let searchTerm = "";
let editingPostId = null;

/**
 * currentMedia contiene objetos con esta forma:
 * {
 *   url: string,             // si ya está subida (existente) o blob URL (local)
 *   publicId: string | null, // null si está pendiente
 *   type: "image" | "video",
 *   name: string,
 *   file: File | null,       // solo si está pendiente de subir
 *   isPending: boolean       // true = aún no se ha subido a Cloudinary
 * }
 */
let currentMedia = [];

let pendingDeleteId = null;
let viewingPost = null;
let viewCarouselIndex = 0;


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
   AUTH
================================= */
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    const emailEl = document.getElementById("userEmail");
    if (emailEl) emailEl.textContent = user.email;
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
   HELPERS
================================= */
const postsGrid = document.getElementById("postsGrid");
const emptyState = document.getElementById("emptyState");
const skeletonGrid = document.getElementById("skeletonGrid");

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


/* =================================
   RENDER DE PUBLICACIONES
================================= */
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

        // Tallas en la tarjeta
        const sizes = Array.isArray(post.sizes) ? post.sizes : [];
        const sizesHtml = sizes.length
            ? `<div class="card-sizes">${sizes.slice(0, 6).map(s => `<span class="card-size-tag">${escapeHtml(s)}</span>`).join("")}${sizes.length > 6 ? `<span class="card-size-tag">+${sizes.length - 6}</span>` : ""}</div>`
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
                <span class="card-category">${escapeHtml(post.category || "General")}</span>
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
                if (action === "delete") openDeleteModal(post.id);
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
   FILTROS Y BÚSQUEDA
================================= */
function applyFilters() {
    filteredPosts = allPosts.filter((p) => {
        if (currentFilter === "active" && p.status !== "active") return false;
        if (currentFilter === "draft" && p.status !== "draft") return false;
        if (currentFilter === "featured" && !p.featured) return false;

        if (searchTerm) {
            const hay = `${p.title} ${p.description} ${p.category}`.toLowerCase();
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

    const cats = new Set(allPosts.map(p => p.category).filter(Boolean));
    document.getElementById("statCategorias").textContent = cats.size;
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
   FIRESTORE LISTENER
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
    }, (error) => {
        console.error("Error al escuchar publicaciones:", error);
        skeletonGrid.style.display = "none";
        showToast("Error al cargar las publicaciones.", "error");
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
    renderMediaPreview();
    renderSelectedSizes();
    openModal(postModal);
}

function openEditModal(post) {
    editingPostId = post.id;

    // Medias existentes: ya están en Cloudinary, isPending = false
    currentMedia = Array.isArray(post.media)
        ? post.media.map(m => ({ ...m, file: null, isPending: false }))
        : [];

    document.getElementById("postTitle").value = post.title || "";
    document.getElementById("postCategory").value = post.category || "";
    document.getElementById("postPrice").value = post.price || "";
    document.getElementById("postDescription").value = post.description || "";
    document.getElementById("postLink").value = post.link || "";
    document.getElementById("postStatus").value = post.status || "active";
    document.getElementById("postStock").value = post.stock ?? "";
    document.getElementById("postFeatured").checked = !!post.featured;

    // Marcar tallas seleccionadas
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

function openModal(modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeModal(modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
}

document.getElementById("btnNewPost").addEventListener("click", openCreateModal);
document.getElementById("btnEmptyNew").addEventListener("click", openCreateModal);
document.getElementById("closePostModal").addEventListener("click", () => closeModal(postModal));
document.getElementById("cancelPost").addEventListener("click", () => closeModal(postModal));

postModal.addEventListener("click", (e) => {
    if (e.target === postModal) closeModal(postModal);
});


/* =================================
   TALLAS: selección
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
   MEDIA PREVIEW (con soporte para pendientes)
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

        // Para blobs locales necesitamos revocar cuando se quite, pero solo al cerrar.
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
            // Si era un blob local, revocamos
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
   SUBIDA DIFERIDA DE ARCHIVOS
   (solo se crean previews locales)
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

    // Agregamos a currentMedia con preview local, SIN subir todavía
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
   (aquí sí subimos lo pendiente a Cloudinary)
================================= */
postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("postTitle").value.trim();
    const category = document.getElementById("postCategory").value.trim();
    const price = document.getElementById("postPrice").value;
    const description = document.getElementById("postDescription").value.trim();
    const link = document.getElementById("postLink").value.trim();
    const status = document.getElementById("postStatus").value;
    const stock = document.getElementById("postStock").value;
    const featured = document.getElementById("postFeatured").checked;
    const sizes = getSelectedSizes();

    if (!title) {
        showToast("El título es obligatorio.", "warning");
        return;
    }
    if (!category) {
        showToast("Selecciona una categoría.", "warning");
        return;
    }
    if (!currentMedia.length) {
        showToast("Agrega al menos una imagen o video.", "warning");
        return;
    }

    savePostBtn.disabled = true;
    savePostBtn.innerHTML = `<span class="sov-spinner" style="border-color:rgba(13,13,13,.35);border-top-color:#0D0D0D"></span> Guardando...`;

    // Mostrar barra de progreso (solo si hay pendientes)
    const pendingItems = currentMedia.filter(m => m.isPending);
    if (pendingItems.length) {
        uploadProgress.style.display = "flex";
        progressText.textContent = `Subiendo ${pendingItems.length} archivo(s)...`;
        progressFill.style.width = "0%";
    }

    try {
        // ============================
        // 1) Subir pendientes a Cloudinary
        // ============================
        let completed = 0;
        for (let i = 0; i < currentMedia.length; i++) {
            const m = currentMedia[i];
            if (!m.isPending || !m.file) continue;

            try {
                const result = await uploadToCloudinary(m.file, (percent) => {
                    // progreso por archivo (0-100). Combinamos con cuántos van.
                    const base = (completed / pendingItems.length) * 100;
                    const step = (percent / 100) * (100 / pendingItems.length);
                    progressFill.style.width = `${Math.min(base + step, 100)}%`;
                });

                // Reemplazamos el item por uno subido
                currentMedia[i] = {
                    url: result.url,
                    publicId: result.publicId,
                    type: result.type,
                    name: m.name,
                    file: null,
                    isPending: false
                };

                // Revocamos el blob URL del preview antiguo
                if (m.url?.startsWith("blob:")) {
                    URL.revokeObjectURL(m.url);
                }

                completed++;
                progressFill.style.width = `${(completed / pendingItems.length) * 100}%`;

            } catch (err) {
                console.error("Error subiendo:", err);
                throw new Error(`No se pudo subir "${m.name}"`);
            }
        }

        // ============================
        // 2) Armar data final para Firestore
        // ============================
        const mediaToSave = currentMedia.map(m => ({
            url: m.url,
            publicId: m.publicId,
            type: m.type,
            name: m.name
        }));

        const data = {
            title,
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

        // ============================
        // 3) Guardar en Firestore
        // ============================
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

    // Tallas
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

viewModal.addEventListener("click", (e) => {
    if (e.target === viewModal) closeModal(viewModal);
});

document.getElementById("viewEditBtn").addEventListener("click", () => {
    if (!viewingPost) return;
    closeModal(viewModal);
    setTimeout(() => openEditModal(viewingPost), 250);
});


/* =================================
   MODAL ELIMINAR
================================= */
const deleteModal = document.getElementById("deleteModal");

function openDeleteModal(id) {
    pendingDeleteId = id;
    openModal(deleteModal);
}

document.getElementById("cancelDelete").addEventListener("click", () => {
    pendingDeleteId = null;
    closeModal(deleteModal);
});

deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
        pendingDeleteId = null;
        closeModal(deleteModal);
    }
});

document.getElementById("confirmDelete").addEventListener("click", async () => {
    if (!pendingDeleteId) return;

    const btn = document.getElementById("confirmDelete");
    btn.disabled = true;
    btn.innerHTML = `<span class="sov-spinner" style="border-color:rgba(255,255,255,.3);border-top-color:#fff"></span> Eliminando...`;

    try {
        await deleteDoc(doc(db, POSTS_COLLECTION, pendingDeleteId));
        showToast("Publicación eliminada.", "success");
        closeModal(deleteModal);
        pendingDeleteId = null;
    } catch (err) {
        console.error(err);
        showToast("No se pudo eliminar la publicación.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-trash"></i> Eliminar`;
    }
});


/* =================================
   INICIALIZACIÓN
================================= */
startPostsListener();