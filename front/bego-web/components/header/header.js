(function () {

    const header =
        document.getElementById("site-header");

    const menuButton =
        document.getElementById("bego-menu-button");

    if (!header) return;

    function updateHeader() {

        if (window.scrollY > 20) {
            header.classList.add("is-scrolled");
        } else {
            header.classList.remove("is-scrolled");
        }

    }

    window.addEventListener(
        "scroll",
        updateHeader,
        { passive: true }
    );

    updateHeader();

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                const expanded =
                    menuButton.getAttribute(
                        "aria-expanded"
                    ) === "true";

                menuButton.setAttribute(
                    "aria-expanded",
                    String(!expanded)
                );

                header.classList.toggle(
                    "menu-open",
                    !expanded
                );

            }
        );

    }

})();