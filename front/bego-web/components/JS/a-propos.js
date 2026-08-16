/* =====================================================
   BEGO — À PROPOS
   a-propos.js
===================================================== */

(() => {

    /* =================================================
       CONTENU PRINCIPAL
       VOIR PLUS / VOIR MOINS
    ================================================= */

    const mainToggle =
        document.querySelector(
            ".bego-about__text-toggle"
        );

    const mainText =
        document.querySelector(
            ".bego-about__text"
        );

    const mainTextBox =
        document.querySelector(
            ".bego-about__text-box"
        );


    if (
        mainToggle &&
        mainText &&
        mainTextBox
    ) {

        mainToggle.addEventListener(
            "click",
            () => {

                const isOpen =
                    mainTextBox.classList.contains(
                        "is-open"
                    );


                /* =========================================
                   OUVRIR
                ========================================= */

                if (!isOpen) {

                    mainTextBox.classList.add(
                        "is-open"
                    );

                    mainText.classList.remove(
                        "bego-about__text--collapsed"
                    );

                    mainText.classList.add(
                        "bego-about__text--expanded"
                    );

                    mainToggle.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                }


                /* =========================================
                   FERMER
                ========================================= */

                else {

                    mainTextBox.classList.remove(
                        "is-open"
                    );

                    mainText.classList.remove(
                        "bego-about__text--expanded"
                    );

                    mainText.classList.add(
                        "bego-about__text--collapsed"
                    );

                    mainToggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

    }


    /* =================================================
       VALEURS / PILIERS
       VOIR PLUS / VOIR MOINS
    ================================================= */

    const valueCards =
        document.querySelectorAll(
            ".bego-about__value"
        );


    valueCards.forEach(
        (card) => {

            const toggle =
                card.querySelector(
                    ".bego-about__value-toggle"
                );

            const text =
                card.querySelector(
                    ".bego-about__value-text"
                );


            if (
                !toggle ||
                !text
            ) {

                return;

            }


            toggle.addEventListener(
                "click",
                () => {

                    const isOpen =
                        card.classList.contains(
                            "is-open"
                        );


                    /* =====================================
                       OUVRIR
                    ===================================== */

                    if (!isOpen) {

                        card.classList.add(
                            "is-open"
                        );

                        card.classList.remove(
                            "is-collapsed"
                        );

                        toggle.setAttribute(
                            "aria-expanded",
                            "true"
                        );

                    }


                    /* =====================================
                       FERMER
                    ===================================== */

                    else {

                        card.classList.remove(
                            "is-open"
                        );

                        card.classList.add(
                            "is-collapsed"
                        );

                        toggle.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }

                }
            );

        }
    );


    /* =================================================
       ACCESSIBILITÉ
       ENTER / ESPACE
    ================================================= */

    document
        .querySelectorAll(
            ".bego-about__text-toggle, " +
            ".bego-about__value-toggle"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {

                            event.preventDefault();

                            button.click();

                        }

                    }
                );

            }
        );


})();