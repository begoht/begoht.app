(function () {

    "use strict";


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const header =
        document.getElementById("site-header");

    const menuButton =
        document.getElementById("bego-menu-button");

    const mobileMenu =
        document.getElementById("bego-mobile-menu");


    /* =====================================================
       SECURITY CHECK
    ===================================================== */

    if (!header) {
        return;
    }


    /* =====================================================
       HEADER SCROLL
    ===================================================== */

    function updateHeader() {

        header.classList.toggle(
            "is-scrolled",
            window.scrollY > 20
        );

    }


    window.addEventListener(
        "scroll",
        updateHeader,
        {
            passive: true
        }
    );


    updateHeader();


    /* =====================================================
       MOBILE MENU STATE
    ===================================================== */

    function setMenuState(isOpen) {

        header.classList.toggle(
            "menu-open",
            isOpen
        );


        if (menuButton) {

            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            menuButton.setAttribute(
                "aria-label",
                isOpen
                    ? "Cerrar menú"
                    : "Abrir menú"
            );

        }


        /*
         * Bloquea el scroll del documento cuando
         * el menú móvil está abierto.
         */

        document.body.classList.toggle(
            "bego-menu-is-open",
            isOpen
        );

    }


    /* =====================================================
       OPEN / CLOSE MOBILE MENU
    ===================================================== */

    if (
        menuButton &&
        mobileMenu
    ) {

        menuButton.addEventListener(
            "click",
            function () {

                const isOpen =
                    header.classList.contains(
                        "menu-open"
                    );

                setMenuState(
                    !isOpen
                );

            }
        );


        /* =================================================
           CLOSE WHEN CLICKING A LINK
        ================================================= */

        const mobileLinks =
            mobileMenu.querySelectorAll(
                "a"
            );


        mobileLinks.forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        setMenuState(
                            false
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       CLOSE WITH ESC
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                header.classList.contains(
                    "menu-open"
                )
            ) {

                setMenuState(
                    false
                );

            }

        }
    );


    /* =====================================================
       CLOSE WHEN RETURNING TO DESKTOP
    ===================================================== */

    const desktopMedia =
        window.matchMedia(
            "(min-width: 901px)"
        );


    function handleDesktopChange(event) {

        if (event.matches) {

            setMenuState(
                false
            );

        }

    }


    if (
        typeof desktopMedia.addEventListener ===
        "function"
    ) {

        desktopMedia.addEventListener(
            "change",
            handleDesktopChange
        );

    } else {

        desktopMedia.addListener(
            handleDesktopChange
        );

    }


    /* =====================================================
       CLOSE WHEN CLICKING OUTSIDE HEADER
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            if (
                !header.classList.contains(
                    "menu-open"
                )
            ) {
                return;
            }


            if (
                header.contains(
                    event.target
                )
            ) {
                return;
            }


            setMenuState(
                false
            );

        }
    );


    /* =====================================================
       PREVENT BODY SCROLL WHEN MENU IS OPEN
    ===================================================== */

    const style =
        document.createElement(
            "style"
        );


    style.textContent = `

        body.bego-menu-is-open {
            overflow: hidden;
        }

    `;


    document.head.appendChild(
        style
    );

})();