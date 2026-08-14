/* =====================================================
   BEGO
   POLITIQUE DE CONFIDENTIALITÉ
===================================================== */


/* =====================================================
   SMOOTH SCROLL
===================================================== */

const privacyLinks =
    document.querySelectorAll(
        ".bego-privacy__nav a"
    );


privacyLinks.forEach(link => {

    link.addEventListener(
        "click",
        event => {

            const targetId =
                link.getAttribute("href");


            if (
                !targetId ||
                !targetId.startsWith("#")
            ) {
                return;
            }


            const target =
                document.querySelector(
                    targetId
                );


            if (!target) {
                return;
            }


            event.preventDefault();


            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


            history.replaceState(
                null,
                "",
                targetId
            );

        }
    );

});