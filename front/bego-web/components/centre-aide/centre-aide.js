/* =====================================================
   BEGO
   CENTRE D'AIDE
===================================================== */


/* =====================================================
   FAQ
===================================================== */

const faqItems =
    document.querySelectorAll(
        ".bego-help-faq__item"
    );


faqItems.forEach(item => {

    const button =
        item.querySelector(
            ".bego-help-faq__question"
        );


    button.addEventListener(
        "click",
        () => {

            const isOpen =
                item.classList.contains(
                    "is-open"
                );


            /*
             * Fermer les autres
             */

            faqItems.forEach(other => {

                other.classList.remove(
                    "is-open"
                );

            });


            /*
             * Ouvrir celui sélectionné
             */

            if (!isOpen) {

                item.classList.add(
                    "is-open"
                );

            }

        }
    );

});



/* =====================================================
   SEARCH
===================================================== */

const searchInput =
    document.querySelector(
        "#helpSearch"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();


            faqItems.forEach(item => {

                const text =
                    item.textContent
                        .toLowerCase();


                if (
                    !query ||
                    text.includes(query)
                ) {

                    item.style.display =
                        "";

                } else {

                    item.style.display =
                        "none";

                }

            });

        }
    );

}