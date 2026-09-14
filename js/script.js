/* =================================
   SOVACTIVE SHOP
   SISTEMA GLOBAL DE TEMA
================================= */


document.addEventListener("DOMContentLoaded", () => {


    /* =================================
       ELEMENTOS
    ================================= */

    const themeToggle =
        document.getElementById("themeToggle");

    const themeIcon =
        themeToggle.querySelector("i");


    const togglePasswordButton =
        document.getElementById("togglePassword");

    const passwordInput =
        document.getElementById("password");


    /* =================================
       CAMBIAR ICONO DEL TEMA
    ================================= */

    function updateThemeIcon() {

        const isLight =
            document.body.classList.contains("light-theme");


        if (isLight) {

            themeIcon.classList.remove("fa-moon");

            themeIcon.classList.add("fa-sun");

            themeToggle.setAttribute(
                "aria-label",
                "Cambiar a modo oscuro"
            );

            themeToggle.setAttribute(
                "title",
                "Cambiar a modo oscuro"
            );

        } else {

            themeIcon.classList.remove("fa-sun");

            themeIcon.classList.add("fa-moon");

            themeToggle.setAttribute(
                "aria-label",
                "Cambiar a modo claro"
            );

            themeToggle.setAttribute(
                "title",
                "Cambiar a modo claro"
            );

        }

    }



    /* =================================
       CAMBIAR TEMA
    ================================= */

    themeToggle.addEventListener("click", () => {


        document.body.classList.toggle(
            "light-theme"
        );


        const isLight =
            document.body.classList.contains(
                "light-theme"
            );


        /* Guardar preferencia */

        localStorage.setItem(
            "sovactive-theme",
            isLight ? "light" : "dark"
        );


        updateThemeIcon();

    });



    /* =================================
       CARGAR TEMA GUARDADO
    ================================= */

    const savedTheme =
        localStorage.getItem(
            "sovactive-theme"
        );


    if (savedTheme === "light") {

        document.body.classList.add(
            "light-theme"
        );

    }


    updateThemeIcon();



    /* =================================
       MOSTRAR / OCULTAR CONTRASEÑA
    ================================= */

    togglePasswordButton.addEventListener(
        "click",
        () => {


            const isPassword =
                passwordInput.type === "password";


            if (isPassword) {

                passwordInput.type = "text";


                togglePasswordButton
                    .querySelector("i")
                    .classList.remove(
                        "fa-eye"
                    );


                togglePasswordButton
                    .querySelector("i")
                    .classList.add(
                        "fa-eye-slash"
                    );


                togglePasswordButton.setAttribute(
                    "aria-label",
                    "Ocultar contraseña"
                );


            } else {

                passwordInput.type = "password";


                togglePasswordButton
                    .querySelector("i")
                    .classList.remove(
                        "fa-eye-slash"
                    );


                togglePasswordButton
                    .querySelector("i")
                    .classList.add(
                        "fa-eye"
                    );


                togglePasswordButton.setAttribute(
                    "aria-label",
                    "Mostrar contraseña"
                );

            }

        }
    );

});