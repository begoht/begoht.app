/* =====================================================
   BEGO
   TÉLÉCHARGER
===================================================== */


/*
 * Les liens des applications seront ajoutés
 * lorsque les URLs définitives seront disponibles.
 */


const downloadButtons =
    document.querySelectorAll(
        ".bego-download-button"
    );


downloadButtons.forEach(button => {

    button.addEventListener(
        "click",
        event => {

            const href =
                button.getAttribute("href");


            if (
                !href ||
                href === "#"
            ) {

                event.preventDefault();

                console.log(
                    "Lien de téléchargement BeGO à configurer."
                );

            }

        }
    );

});