/* =================================
   SOVACTIVE SHOP
   AUTENTICACIÓN CON FIREBASE
================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =================================
   CONFIGURACIÓN DE FIREBASE
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

/* =================================
   ESTILOS GLOBALES (toasts + modal)
================================= */

const sovStyles = document.createElement("style");
sovStyles.textContent = `
    /* ---------- TOASTS ---------- */
    .sov-toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 380px;
        width: calc(100% - 48px);
        pointer-events: none;
    }

    .sov-toast {
        pointer-events: auto;
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 18px;
        border-radius: 14px;
        background: #1a1d24;
        color: #fff;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-family: 'Poppins', sans-serif;
        overflow: hidden;
        transform: translateX(120%);
        opacity: 0;
        animation: sovSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    body.light-theme .sov-toast {
        background: #ffffff;
        color: #1a1d24;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .sov-toast.sov-hide {
        animation: sovSlideOut 0.35s ease forwards;
    }

    .sov-toast-icon {
        flex-shrink: 0;
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.15rem;
        color: #fff;
    }

    .sov-toast-content { flex: 1; min-width: 0; }

    .sov-toast-title {
        font-weight: 600;
        font-size: 0.95rem;
        margin: 0 0 4px 0;
        letter-spacing: 0.2px;
    }

    .sov-toast-msg {
        font-size: 0.82rem;
        margin: 0;
        line-height: 1.4;
        opacity: 0.85;
        font-weight: 400;
    }

    .sov-toast-close {
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.45;
        cursor: pointer;
        font-size: 0.95rem;
        padding: 0;
        transition: opacity 0.2s;
        line-height: 1;
    }

    .sov-toast-close:hover { opacity: 1; }

    .sov-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 100%;
        transform-origin: left;
        animation: sovProgress linear forwards;
    }

    .sov-toast.sov-success .sov-toast-icon { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .sov-toast.sov-success .sov-toast-progress { background: #22c55e; }

    .sov-toast.sov-error .sov-toast-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .sov-toast.sov-error .sov-toast-progress { background: #ef4444; }

    .sov-toast.sov-warning .sov-toast-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .sov-toast.sov-warning .sov-toast-progress { background: #f59e0b; }

    .sov-toast.sov-info .sov-toast-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .sov-toast.sov-info .sov-toast-progress { background: #3b82f6; }

    @keyframes sovSlideIn { to { transform: translateX(0); opacity: 1; } }
    @keyframes sovSlideOut { to { transform: translateX(120%); opacity: 0; } }
    @keyframes sovProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }

    /* ---------- SHAKE ---------- */
    .sov-shake { animation: sovShake 0.45s cubic-bezier(.36,.07,.19,.97) both; }

    @keyframes sovShake {
        10%, 90% { transform: translateX(-2px); }
        20%, 80% { transform: translateX(4px); }
        30%, 50%, 70% { transform: translateX(-6px); }
        40%, 60% { transform: translateX(6px); }
    }

    /* ---------- SPINNER ---------- */
    .sov-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.35);
        border-top-color: #fff;
        border-radius: 50%;
        animation: sovSpin 0.7s linear infinite;
        vertical-align: middle;
        margin-right: 6px;
    }

    @keyframes sovSpin { to { transform: rotate(360deg); } }

    /* ---------- MODAL RECUPERAR ---------- */
    .sov-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 12, 16, 0.7);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        animation: sovFadeIn 0.3s ease forwards;
    }

    .sov-modal-overlay.sov-hide {
        animation: sovFadeOut 0.25s ease forwards;
    }

    @keyframes sovFadeIn { to { opacity: 1; } }
    @keyframes sovFadeOut { to { opacity: 0; } }

    .sov-modal {
        background: #1a1d24;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 32px 28px;
        max-width: 420px;
        width: 100%;
        color: #fff;
        font-family: 'Poppins', sans-serif;
        box-shadow: 0 25px 60px rgba(0,0,0,0.5);
        transform: scale(0.9) translateY(20px);
        opacity: 0;
        animation: sovModalIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
        position: relative;
    }

    body.light-theme .sov-modal {
        background: #ffffff;
        color: #1a1d24;
        border: 1px solid rgba(0,0,0,0.06);
        box-shadow: 0 25px 60px rgba(0,0,0,0.15);
    }

    @keyframes sovModalIn {
        to { transform: scale(1) translateY(0); opacity: 1; }
    }

    .sov-modal-icon {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        color: #fff;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        margin: 0 auto 18px;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
    }

    .sov-modal h2 {
        font-size: 1.25rem;
        font-weight: 600;
        text-align: center;
        margin: 0 0 8px;
    }

    .sov-modal-desc {
        font-size: 0.85rem;
        text-align: center;
        opacity: 0.7;
        margin: 0 0 24px;
        line-height: 1.5;
    }

    .sov-modal-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: none;
        background: rgba(255,255,255,0.06);
        color: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        font-size: 0.85rem;
    }

    body.light-theme .sov-modal-close { background: rgba(0,0,0,0.05); }
    .sov-modal-close:hover { background: rgba(255,255,255,0.12); }
    body.light-theme .sov-modal-close:hover { background: rgba(0,0,0,0.1); }

    .sov-modal-input {
        width: 100%;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: inherit;
        font-family: inherit;
        font-size: 0.9rem;
        outline: none;
        transition: border 0.2s, background 0.2s;
        margin-bottom: 16px;
    }

    body.light-theme .sov-modal-input {
        border: 1px solid rgba(0,0,0,0.1);
        background: rgba(0,0,0,0.02);
    }

    .sov-modal-input:focus {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.08);
    }

    .sov-modal-btn {
        width: 100%;
        padding: 14px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        font-size: 0.9rem;
        color: #fff;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .sov-modal-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
    }

    .sov-modal-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
document.head.appendChild(sovStyles);

/* =================================
   CONTENEDOR DE TOASTS
================================= */

const toastContainer = document.createElement("div");
toastContainer.className = "sov-toast-container";
document.body.appendChild(toastContainer);

/* =================================
   SISTEMA DE TOASTS
================================= */

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
        <div class="sov-toast-icon">
            <i class="${toastIcons[type]}"></i>
        </div>
        <div class="sov-toast-content">
            <p class="sov-toast-title">${toastTitles[type]}</p>
            <p class="sov-toast-msg">${message}</p>
        </div>
        <button class="sov-toast-close" aria-label="Cerrar">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="sov-toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    toastContainer.appendChild(toast);

    const autoClose = setTimeout(() => removeToast(toast), duration);

    toast.querySelector(".sov-toast-close").addEventListener("click", () => {
        clearTimeout(autoClose);
        removeToast(toast);
    });
}

function removeToast(toast) {
    toast.classList.add("sov-hide");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

/* =================================
   TRADUCCIÓN DE ERRORES
================================= */

function translateFirebaseError(code) {
    const errors = {
        "auth/invalid-email": "El correo electrónico no es válido.",
        "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
        "auth/user-not-found": "No existe una cuenta con este correo.",
        "auth/wrong-password": "La contraseña es incorrecta.",
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
        "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
        "auth/network-request-failed": "Error de conexión. Revisa tu internet.",
        "auth/missing-password": "Debes ingresar una contraseña.",
        "auth/missing-email": "Debes ingresar un correo."
    };
    return errors[code] || "Ocurrió un error inesperado. Intenta de nuevo.";
}

/* =================================
   CERRAR SESIÓN (global, siempre disponible)
================================= */

window.cerrarSesion = async function () {
    try {
        await signOut(auth);
        showToast("Sesión cerrada. ¡Hasta pronto!", "info", 2000);
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        showToast("No se pudo cerrar la sesión. Intenta de nuevo.", "error", 4000);
    }
};

/* =================================
   LÓGICA DE LA PÁGINA DE LOGIN
================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitButton = document.querySelector(".login-button");
    const forgotLink = document.getElementById("forgotPassword");

    /* ---------- LOADING ---------- */

    function setLoading(isLoading) {
        const span = submitButton.querySelector("span");
        const icon = submitButton.querySelector("i");

        if (isLoading) {
            submitButton.disabled = true;
            submitButton.style.opacity = "0.75";
            submitButton.style.cursor = "not-allowed";
            span.innerHTML = `<span class="sov-spinner"></span>Iniciando...`;
            if (icon) icon.style.display = "none";
        } else {
            submitButton.disabled = false;
            submitButton.style.opacity = "1";
            submitButton.style.cursor = "pointer";
            span.textContent = "Iniciar sesión";
            if (icon) icon.style.display = "";
        }
    }

    function shakeForm() {
        loginForm.classList.add("sov-shake");
        loginForm.addEventListener("animationend", () => {
            loginForm.classList.remove("sov-shake");
        }, { once: true });
    }

    /* ---------- LOGIN ---------- */

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showToast("Por favor completa todos los campos.", "warning", 3500);
            shakeForm();
            return;
        }

        if (password.length < 6) {
            showToast("La contraseña debe tener al menos 6 caracteres.", "warning", 3500);
            shakeForm();
            return;
        }

        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            showToast("¡Bienvenido de nuevo! Redirigiendo al panel...", "success", 2500);
            localStorage.setItem("sovactive-user", user.email);

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);

        } catch (error) {
            console.error("Error de autenticación:", error.code);
            showToast(translateFirebaseError(error.code), "error", 4500);
            shakeForm();
            setLoading(false);
        }
    });

    /* =================================
       MODAL "OLVIDÉ MI CONTRASEÑA"
    ================================= */

    function openResetModal() {

        const overlay = document.createElement("div");
        overlay.className = "sov-modal-overlay";

        overlay.innerHTML = `
            <div class="sov-modal" role="dialog" aria-modal="true">
                <button class="sov-modal-close" aria-label="Cerrar">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="sov-modal-icon">
                    <i class="fa-solid fa-key"></i>
                </div>

                <h2>Recuperar contraseña</h2>
                <p class="sov-modal-desc">
                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <input
                    type="email"
                    class="sov-modal-input"
                    id="resetEmail"
                    placeholder="tu@correo.com"
                    value="${emailInput.value.trim()}"
                    autocomplete="email"
                >

                <button class="sov-modal-btn" id="resetSubmit">
                    <i class="fa-solid fa-paper-plane"></i>
                    Enviar enlace
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeBtn = overlay.querySelector(".sov-modal-close");
        const resetSubmit = overlay.querySelector("#resetSubmit");
        const resetEmail = overlay.querySelector("#resetEmail");

        function closeModal() {
            overlay.classList.add("sov-hide");
            overlay.addEventListener("animationend", () => overlay.remove(), { once: true });
        }

        closeBtn.addEventListener("click", closeModal);

        overlay.addEventListener("click", (ev) => {
            if (ev.target === overlay) closeModal();
        });

        document.addEventListener("keydown", function escHandler(ev) {
            if (ev.key === "Escape") {
                closeModal();
                document.removeEventListener("keydown", escHandler);
            }
        });

        resetEmail.focus();

        resetSubmit.addEventListener("click", async () => {

            const email = resetEmail.value.trim();

            if (!email) {
                showToast("Ingresa tu correo electrónico.", "warning", 3500);
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast("El correo no tiene un formato válido.", "warning", 3500);
                return;
            }

            resetSubmit.disabled = true;
            resetSubmit.innerHTML = `<span class="sov-spinner"></span>Enviando...`;

            try {
                await sendPasswordResetEmail(auth, email);

                closeModal();
                showToast("Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja (y spam).", "success", 6000);

            } catch (error) {
                console.error("Error al enviar el correo:", error.code);
                showToast(translateFirebaseError(error.code), "error", 4500);
                resetSubmit.disabled = false;
                resetSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Enviar enlace`;
            }
        });

        resetEmail.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") resetSubmit.click();
        });
    }

    if (forgotLink) {
        forgotLink.addEventListener("click", (ev) => {
            ev.preventDefault();
            openResetModal();
        });
    }

    /* ---------- SESIÓN ACTIVA ---------- */

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Sesión activa:", user.email);
        }
    });

}