/* =================================
   SOVACTIVE SHOP
   SISTEMA GLOBAL DE TEMA
================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =================================
       TOGGLE DE TEMA
    ================================= */
    const themeToggle = document.getElementById("themeToggle");

    if (themeToggle) {
        const themeIcon = themeToggle.querySelector("i");

        function updateThemeIcon() {
            const isLight = document.body.classList.contains("light-theme");

            if (isLight) {
                themeIcon.classList.remove("fa-moon");
                themeIcon.classList.add("fa-sun");
                themeToggle.setAttribute("aria-label", "Cambiar a modo oscuro");
                themeToggle.setAttribute("title", "Cambiar a modo oscuro");
            } else {
                themeIcon.classList.remove("fa-sun");
                themeIcon.classList.add("fa-moon");
                themeToggle.setAttribute("aria-label", "Cambiar a modo claro");
                themeToggle.setAttribute("title", "Cambiar a modo claro");
            }
        }

        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("light-theme");
            const isLight = document.body.classList.contains("light-theme");
            localStorage.setItem("sovactive-theme", isLight ? "light" : "dark");
            updateThemeIcon();
        });

        // Cargar tema guardado
        const savedTheme = localStorage.getItem("sovactive-theme");
        if (savedTheme === "light") {
            document.body.classList.add("light-theme");
        }

        updateThemeIcon();

        /* =================================
           OCULTAR TOGGLE AL HACER SCROLL
        ================================= */
        let lastScrollY = window.scrollY;

        window.addEventListener("scroll", () => {
            const currentScrollY = window.scrollY;

            // Si bajamos más de 100px y estamos bajando → ocultar
            if (currentScrollY > 100 && currentScrollY > lastScrollY) {
                themeToggle.classList.add("hidden");
            } else {
                themeToggle.classList.remove("hidden");
            }

            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    /* =================================
       MOSTRAR / OCULTAR CONTRASEÑA
       (solo si existe en la página)
    ================================= */
    const togglePasswordButton = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    if (togglePasswordButton && passwordInput) {
        togglePasswordButton.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";
            const icon = togglePasswordButton.querySelector("i");

            if (isPassword) {
                passwordInput.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
                togglePasswordButton.setAttribute("aria-label", "Ocultar contraseña");
            } else {
                passwordInput.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
                togglePasswordButton.setAttribute("aria-label", "Mostrar contraseña");
            }
        });
    }

});