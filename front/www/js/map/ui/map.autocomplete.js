// /map/ui/map.autocomplete.js

import { buscarLugares, cancelarBusqueda } from "../services/map.search.js";

let inputHandler = null;
let docHandler = null;

/*************************************************
 * 🚀 INIT AUTOCOMPLETE
 *************************************************/
export function initAutocomplete({
  map,
  onSelect
}) {

  const input = document.getElementById("inputDestino");

  if (!input) return;

  let results = document.getElementById("search-results");

  if (!results) {

    results = document.createElement("div");
    results.id = "search-results";

    input.parentNode.appendChild(results);
  }

  let timeout;

  inputHandler = () => {

    clearTimeout(timeout);

    const query = input.value.trim();

    if (query.length < 4) {

      results.innerHTML = "";
      cancelarBusqueda();

      return;
    }

    timeout = setTimeout(async () => {

      const data = await buscarLugares(query);

      results.innerHTML = "";

      data.forEach((item) => {

        const div = document.createElement("div");

        div.className = "search-item";

        const nombrePrincipal =
          item.display_name.split(",")[0];

        div.innerHTML = `
          <div style="display:flex; gap:10px; align-items:center;">
            <i class="fa-solid fa-location-dot" style="color:var(--secondary)"></i>

            <div>
              <strong>${nombrePrincipal}</strong>

              <small style="
                display:block;
                color:var(--muted);
                font-size:11px;
              ">
                ${item.display_name}
              </small>
            </div>
          </div>
        `;

        div.onclick = () => {

          onSelect({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }, item.display_name);

          results.innerHTML = "";
        };

        results.appendChild(div);
      });

    }, 500);
  };

  input.addEventListener("input", inputHandler);

  docHandler = (e) => {

    if (e.target !== input) {
      results.innerHTML = "";
    }
  };

  document.addEventListener("click", docHandler);
}

/*************************************************
 * 🧹 CLEANUP
 *************************************************/
export function cleanupAutocomplete() {

  const input = document.getElementById("inputDestino");

  if (inputHandler && input) {
    input.removeEventListener("input", inputHandler);
  }

  if (docHandler) {
    document.removeEventListener("click", docHandler);
  }

  inputHandler = null;
  docHandler = null;
}