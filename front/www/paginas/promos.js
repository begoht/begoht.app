export function renderPromos() {
  return `
    <section class="promos-page-shell">
      <header class="promos-page-hero">
        <div>
          <span>Avantages BeGO</span>
          <h1>Offres</h1>
          <p>Retrouvez les offres publiees par BeGO pour vos trajets, colis et paiements.</p>
        </div>
        <strong id="passengerPromosStatus">Chargement...</strong>
      </header>

      <section class="promos-page-list" id="passengerPromosList" aria-live="polite"></section>
    </section>
  `;
}
