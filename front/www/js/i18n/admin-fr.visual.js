(function () {
  "use strict";

  const exact = new Map();
  const add = (from, to) => exact.set(from, to);

  [
    ["BeGO Admin Command Center", "Centre de commande BeGO Admin"],
    ["Ofertas Pasajero | BeGO Admin", "Offres passager | BeGO Admin"],
    ["Dashboard", "Tableau de bord"],
    ["Centro", "Centre"],
    ["Centro de comando", "Centre de commande"],
    ["Control total pasajero + motorista", "Controle complet passager + chauffeur"],
    ["Supervisa pasajeros, motoristas, reservas, envios, creditos, wallets y retiros desde una sola consola.", "Supervisez passagers, chauffeurs, reservations, envois, credits, wallets et retraits depuis une seule console."],
    ["Buscar nombre, telefono, viaje, ciudad", "Rechercher nom, telephone, course, ville"],
    ["Todos", "Tous"],
    ["Todas", "Toutes"],
    ["Actualizar", "Actualiser"],
    ["Cargando", "Chargement"],
    ["Guardar", "Enregistrer"],
    ["Limpiar", "Effacer"],
    ["Accion", "Action"],
    ["Acciones", "Actions"],
    ["Estado", "Etat"],
    ["Fecha", "Date"],
    ["Tipo", "Type"],
    ["Ciudad", "Ville"],
    ["Monto", "Montant"],
    ["Pago", "Paiement"],
    ["Contacto", "Contact"],
    ["Nombre", "Nom"],
    ["Telefono", "Telephone"],
    ["Email", "E-mail"],
    ["Rol", "Role"],
    ["Alta", "Inscription"],
    ["Usuario", "Utilisateur"],
    ["Usuarios", "Utilisateurs"],
    ["Usuarios online", "Utilisateurs en ligne"],
    ["Usuarios de ambas apps", "Utilisateurs des deux apps"],
    ["Gestionar perfiles", "Gerer les profils"],
    ["Pasajero", "Passager"],
    ["Pasajeros", "Passagers"],
    ["Motorista", "Chauffeur"],
    ["Motoristas", "Chauffeurs"],
    ["Admins", "Admins"],
    ["Bloqueados", "Bloques"],
    ["Bloqueado", "Bloque"],
    ["Desbloqueado", "Debloque"],
    ["Verificado", "Verifie"],
    ["Activo", "Actif"],
    ["Inactivo", "Inactif"],
    ["No disponible", "Indisponible"],
    ["Pendiente", "En attente"],
    ["Pagado", "Paye"],
    ["Cancelado", "Annule"],
    ["Finalizado", "Termine"],
    ["Reservado", "Reserve"],
    ["Buscando", "Recherche"],
    ["Asignado", "Assigne"],
    ["En curso", "En cours"],
    ["Llego", "Arrive"],
    ["Efectivo", "Especes"],
    ["Wallet", "Wallet"],
    ["Viaje", "Course"],
    ["Viajes", "Courses"],
    ["Viajes hoy", "Courses aujourd'hui"],
    ["Viajes finalizados", "Courses terminees"],
    ["Viajes activos", "Courses actives"],
    ["Viajes y reservas", "Courses et reservations"],
    ["Lo que esta pasando ahora en pasajero y motorista.", "Ce qui se passe maintenant cote passager et chauffeur."],
    ["Reserva", "Reservation"],
    ["Reservas", "Reservations"],
    ["Reserva sin llegada", "Reservation sans arrivee"],
    ["Cola motorista", "File chauffeur"],
    ["Creada", "Creee"],
    ["Paquetes", "Colis"],
    ["Paquetes hasta 5 kg y codigo de entrega.", "Colis jusqu'a 5 kg et code de livraison."],
    ["Finanzas", "Finances"],
    ["Creditos", "Credits"],
    ["Creditos motoristas", "Credits chauffeurs"],
    ["Operaciones", "Operations"],
    ["Monitoreo", "Surveillance"],
    ["Lanzamiento", "Lancement"],
    ["Activar o pausar el contador que ven pasajero y motorista.", "Activer ou mettre en pause le compte a rebours vu par le passager et le chauffeur."],
    ["Al activarlo, el aviso aparece al iniciar sesion en pasajero y motorista.", "Une fois active, l'avis apparait a la connexion du passager et du chauffeur."],
    ["Ofertas pasajero", "Offres passager"],
    ["Wallets, retiros, saldo retenido y comisiones.", "Wallets, retraits, solde retenu et commissions."],
    ["Viajes, ingresos y comision del sistema.", "Courses, revenus et commission du systeme."],
    ["Comision", "Commission"],
    ["Comisiones recibidas", "Commissions recues"],
    ["Wallet admin", "Wallet admin"],
    ["Wallets", "Wallets"],
    ["Saldo", "Solde"],
    ["Saldo total", "Solde total"],
    ["Retenido", "Retenu"],
    ["Escrow/retiros", "Escrow/retraits"],
    ["Ultimo movimiento", "Dernier mouvement"],
    ["Retiro", "Retrait"],
    ["Retiros", "Retraits"],
    ["Metodo", "Methode"],
    ["Movimiento", "Mouvement"],
    ["Ingreso", "Revenu"],
    ["Ingresos", "Revenus"],
    ["Rating", "Note"],
    ["Estado app", "Etat app"],
    ["Ultimo viaje", "Derniere course"],
    ["Disponible", "Disponible"],
    ["Listo", "Pret"],
    ["Quitar check", "Retirer le check"],
    ["Verificar", "Verifier"],
    ["Elegible desde 1000", "Eligible a partir de 1000"],
    ["Tipos", "Types"],
    ["Viajes vs envios.", "Courses vs envois."],
    ["Salud produccion", "Sante production"],
    ["Atencion", "Attention"],
    ["Hay eventos recientes para revisar", "Il y a des evenements recents a examiner"],
    ["Servicios vivos", "Services actifs"],
    ["Ultima lectura de PM2, MongoDB, Redis, Socket.IO y frontend.", "Derniere lecture de PM2, MongoDB, Redis, Socket.IO et frontend."],
    ["Lectura", "Lecture"],
    ["Frontend movil", "Frontend mobile"],
    ["Alertas recientes", "Alertes recentes"],
    ["Eventos limpios desde /var/log/bego/critical.log.", "Evenements nettoyes depuis /var/log/bego/critical.log."],
    ["Actualizar monitor", "Actualiser le monitoring"],
    ["Errores frontend desde celulares", "Erreurs frontend depuis mobiles"],
    ["Pasajero y motorista reportan fallos reales, ruta, version, dispositivo y hora.", "Passager et chauffeur signalent les erreurs reelles, route, version, appareil et heure."],
    ["App", "App"],
    ["Nivel", "Niveau"],
    ["Mensaje", "Message"],
    ["Ruta", "Route"],
    ["Dispositivo", "Appareil"],
    ["App pasajero", "App passager"],
    ["App motorista", "App chauffeur"],
    ["No hay alertas recientes", "Aucune alerte recente"],
    ["Sin datos", "Aucune donnee"],
    ["Reasignacion por demora", "Reassignation par retard"],
    ["Viajes y reservas que superaron el tiempo permitido sin llegada del motorista.", "Courses et reservations ayant depasse le delai autorise sans arrivee du chauffeur."],
    ["Reasignar demoras", "Reassigner les retards"],
    ["Viajes atrasados", "Courses en retard"],
    ["Demora", "Retard"],
    ["Umbral", "Seuil"],
    ["Reasignar", "Reassigner"],
    ["Tarifas de viaje", "Tarifs de course"],
    ["Control de comision", "Controle de commission"],
    ["Los viajes ya finalizados mantienen su comision original. Este cambio aplica desde el proximo cierre de viaje.", "Les courses deja terminees conservent leur commission originale. Ce changement s'applique a partir de la prochaine cloture de course."],
    ["Porcentaje de comision", "Pourcentage de commission"],
    ["Controla la tarifa base y el precio por kilometro que se aplican a nuevas cotizaciones.", "Controlez le tarif de base et le prix par kilometre appliques aux nouvelles estimations."],
    ["Tarifa base HTG", "Tarif de base HTG"],
    ["Precio por km HTG", "Prix par km HTG"],
    ["Guardar tarifas", "Enregistrer tarifs"],
    ["Guardar comision", "Enregistrer commission"],
    ["Descuento Wallet pasajero", "Remise Wallet passager"],
    ["Controla el incentivo que aparece en el boton Wallet BeGO y se aplica al precio real del viaje.", "Controlez l'incitation affichee sur le bouton Wallet BeGO et appliquee au prix reel de la course."],
    ["El boton Wallet mostrara el descuento cuando este activo.", "Le bouton Wallet affichera la remise lorsqu'elle sera active."],
    ["Activar descuento", "Activer la remise"],
    ["Porcentaje de descuento", "Pourcentage de remise"],
    ["Guardar descuento", "Enregistrer remise"],
    ["Metodos de pago", "Methodes de paiement"],
    ["Activa o pausa metodos de pago en pasajero, recargas y validacion backend.", "Activez ou mettez en pause les methodes de paiement cote passager, recharges et validation backend."],
    ["Guardar metodos", "Enregistrer methodes"],
    ["Cuenta interna @bego. Los pagos digitales entran automatico; efectivo queda por cobrar hasta que el motorista transfiera.", "Compte interne @bego. Les paiements numeriques entrent automatiquement; l'espece reste a encaisser jusqu'au transfert du chauffeur."],
    ["Activar contador", "Activer le compte a rebours"],
    ["Apagar contador", "Desactiver le compte a rebours"],
    ["Lanzamiento BeGO", "Lancement BeGO"],
    ["Nueva oferta", "Nouvelle offre"],
    ["Buscar oferta", "Rechercher une offre"],
    ["Crear oferta", "Creer une offre"],
    ["Editar oferta", "Modifier l'offre"],
    ["Control de publicacion", "Controle de publication"],
    ["Borrador", "Brouillon"],
    ["Publicado", "Publie"],
    ["Publicar", "Publier"],
    ["Pausado", "En pause"],
    ["Pausar", "Mettre en pause"],
    ["Archivado", "Archive"],
    ["Archivar", "Archiver"],
    ["Publica, pausa y organiza las promociones visibles en la app pasajero.", "Publiez, mettez en pause et organisez les promotions visibles dans l'app passager."],
    ["Titulo", "Titre"],
    ["Etiqueta superior", "Etiquette superieure"],
    ["Descripcion", "Description"],
    ["Texto corto que vera el pasajero", "Texte court que le passager verra"],
    ["Icono FontAwesome", "Icone FontAwesome"],
    ["Orden", "Ordre"],
    ["Tema", "Theme"],
    ["Azul premium", "Bleu premium"],
    ["Paquete", "Colis"],
    ["Dorado", "Dore"],
    ["Verde", "Vert"],
    ["Oscuro", "Sombre"],
    ["Ubicacion", "Emplacement"],
    ["Home y Promos", "Accueil et Promos"],
    ["Solo home", "Accueil seulement"],
    ["Solo Promos", "Promos seulement"],
    ["Cordoba test", "Cordoba test"],
    ["Boton / CTA", "Bouton / CTA"],
    ["Ver promociones", "Voir les promotions"],
    ["Pedir viaje", "Demander une course"],
    ["Servicios", "Services"],
    ["Actividad", "Activite"],
    ["Inicio", "Debut"],
    ["Fin", "Fin"],
    ["Vista previa", "Apercu"],
    ["Produccion", "Production"],
    ["Solo las ofertas en estado Publicado y dentro de fecha aparecen en la app pasajero.", "Seules les offres publiees et dans la periode active apparaissent dans l'app passager."],
    ["No hay ofertas para mostrar.", "Aucune offre a afficher."],
    ["Cargando ofertas...", "Chargement des offres..."],
    ["Oferta BeGO", "Offre BeGO"],
    ["El titulo es obligatorio.", "Le titre est obligatoire."],
    ["Archivar esta oferta? Dejaria de mostrarse en la app.", "Archiver cette offre ? Elle ne sera plus affichee dans l'app."],
    ["Acceso solo para administradores", "Acces reserve aux administrateurs"],
    ["Panel actualizado", "Panneau actualise"],
    ["No se pudo cargar el panel", "Impossible de charger le panneau"],
    ["No se pudieron cargar los viajes", "Impossible de charger les courses"],
    ["Monitoreo actualizado", "Surveillance actualisee"],
    ["No se pudo cargar monitoreo", "Impossible de charger la surveillance"],
    ["Demoras actualizadas", "Retards actualises"],
    ["No se pudieron cargar demoras", "Impossible de charger les retards"],
    ["La comision debe estar entre 0% y 50%", "La commission doit etre entre 0 % et 50 %"],
    ["No se pudo guardar la comision", "Impossible d'enregistrer la commission"],
    ["La tarifa base debe estar entre 0 y 100,000 HTG", "Le tarif de base doit etre entre 0 et 100 000 HTG"],
    ["El precio por kilometro debe estar entre 0 y 100,000 HTG", "Le prix par kilometre doit etre entre 0 et 100 000 HTG"],
    ["No se pudieron guardar las tarifas", "Impossible d'enregistrer les tarifs"],
    ["Apagado", "Desactive"],
    ["Activalo para que el boton Wallet muestre el descuento.", "Activez-le pour que le bouton Wallet affiche la remise."],
    ["El descuento wallet debe estar entre 0% y 50%", "La remise Wallet doit etre entre 0 % et 50 %"],
    ["No se pudo guardar el descuento wallet", "Impossible d'enregistrer la remise Wallet"],
    ["Wallet BeGO no disponible por ahora.", "Wallet BeGO indisponible pour le moment."],
    ["Metodos de pago actualizados", "Methodes de paiement actualisees"],
    ["No se pudieron guardar los metodos de pago", "Impossible d'enregistrer les methodes de paiement"],
    ["Primero define fecha y hora del lanzamiento", "Definissez d'abord la date et l'heure du lancement"],
    ["Contador de lanzamiento activo", "Compte a rebours du lancement actif"],
    ["Contador guardado apagado", "Compte a rebours enregistre desactive"],
    ["No se pudo guardar el lanzamiento", "Impossible d'enregistrer le lancement"],
    ["Nuevo rol: pasajero, motorista o admin", "Nouveau role : passager, chauffeur ou admin"],
    ["Rol actualizado", "Role actualise"],
    ["Usuario desbloqueado", "Utilisateur debloque"],
    ["Usuario bloqueado", "Utilisateur bloque"],
    ["Verificacion retirada", "Verification retiree"],
    ["Usuario verificado", "Utilisateur verifie"],
    ["Motorista pausado", "Chauffeur mis en pause"],
    ["Motorista activado", "Chauffeur active"],
    ["Marcar este retiro como pagado?", "Marquer ce retrait comme paye ?"],
    ["Retiro marcado como pagado", "Retrait marque comme paye"],
    ["Motivo de reasignacion", "Motif de reassignation"],
    ["Reasignar este viaje a otro motorista? El motorista actual sera excluido de esta oferta.", "Reassigner cette course a un autre chauffeur ? Le chauffeur actuel sera exclu de cette offre."],
    ["Viaje enviado a reasignacion", "Course envoyee en reassignation"],
    ["No se pudo reasignar el viaje", "Impossible de reassigner la course"],
    ["No hay demoras para reasignar", "Aucun retard a reassigner"],
    ["No se pudo ejecutar la reasignacion por demora", "Impossible d'executer la reassignation par retard"],
    ["No hay retiros para mostrar", "Aucun retrait a afficher"],
    ["La wallet BeGO aun no tiene movimientos", "Le Wallet BeGO n'a pas encore de mouvements"],
    ["Comision recibida", "Commission recue"],
    ["Motorista demora en llegar", "Le chauffeur tarde a arriver"],
  ].forEach(([from, to]) => add(from, to));

  const regexRules = [
    [/^No se pudieron cargar ofertas: (.+)$/i, (m) => `Impossible de charger les offres : ${m[1]}`],
    [/^Comision actualizada a (.+)$/i, (m) => `Commission mise a jour a ${m[1]}`],
    [/^Tarifas actualizadas: (.+)$/i, (m) => `Tarifs mis a jour : ${m[1]}`],
    [/^(.+) se vera como badge en el boton Wallet BeGO\.$/i, (m) => `${m[1]} sera affiche comme badge sur le bouton Wallet BeGO.`],
    [/^Reasignar (\d+) viaje\(s\) demorados\? Cada motorista actual sera excluido de su oferta\.$/i, (m) => `Reassigner ${m[1]} course(s) en retard ? Chaque chauffeur actuel sera exclu de son offre.`],
    [/^Reasignados (\d+) de (\d+)$/i, (m) => `Reassignes ${m[1]} sur ${m[2]}`],
    [/^(\d+) desconexiones en (\d+) minutos$/i, (m) => `${m[1]} deconnexions en ${m[2]} minutes`],
    [/^(\d+) errores, (\d+) criticos en 10 min$/i, (m) => `${m[1]} erreurs, ${m[2]} critiques en 10 min`],
    [/^(\d+) reinicios acumulados, (\d+) nuevos$/i, (m) => `${m[1]} redemarrages cumules, ${m[2]} nouveaux`],
    [/^Exceso (\d+) min$/i, (m) => `Exces ${m[1]} min`],
    [/^(.+) estrellas$/i, (m) => `${m[1]} etoiles`],
    [/^Estado (.+)$/i, (m) => `Etat ${translateText(m[1])}`],
    [/^(.+) activo$/i, (m) => `${m[1]} actif`],
  ];

  const lowerTokens = new Map([
    ["pasajero", "passager"],
    ["motorista", "chauffeur"],
    ["usuario", "utilisateur"],
    ["admin", "admin"],
    ["activo", "actif"],
    ["activa", "active"],
    ["inactivo", "inactif"],
    ["bloqueado", "bloque"],
    ["verificado", "verifie"],
    ["pendiente", "en attente"],
    ["pagado", "paye"],
    ["efectivo", "especes"],
    ["wallet", "wallet"],
    ["finalizado", "termine"],
    ["cancelado", "annule"],
    ["reservado", "reserve"],
    ["buscando", "recherche"],
    ["asignado", "assigne"],
    ["en_curso", "en cours"],
    ["llego", "arrive"],
    ["draft", "brouillon"],
    ["published", "publie"],
    ["paused", "en pause"],
    ["archived", "archive"],
    ["warning", "alerte"],
    ["critical", "critique"],
    ["critico", "critique"],
    ["ready", "pret"],
    ["all", "toutes"],
    ["both", "accueil et promos"],
    ["home", "accueil"],
    ["promos", "promos"],
  ]);

  function translateText(text) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) return text;
    if (exact.has(normalized)) return exact.get(normalized);
    const lower = normalized.toLowerCase();
    if (lowerTokens.has(lower)) return lowerTokens.get(lower);
    for (const [pattern, formatter] of regexRules) {
      const match = normalized.match(pattern);
      if (match) return formatter(match);
    }
    return text;
  }

  function preserveWhitespace(original, translated) {
    if (translated === original) return original;
    const source = String(original);
    const prefix = source.match(/^\s*/)?.[0] || "";
    const suffix = source.match(/\s*$/)?.[0] || "";
    return `${prefix}${translated}${suffix}`;
  }

  function isSkippable(node) {
    const parent = node && node.parentElement;
    if (!parent) return true;
    return ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parent.tagName);
  }

  function translateTextNode(node) {
    if (isSkippable(node)) return;
    const original = node.nodeValue;
    const translated = translateText(original);
    const nextValue = preserveWhitespace(original, translated);
    if (nextValue !== original) node.nodeValue = nextValue;
  }

  function translateAttributes(element) {
    if (!element || element.nodeType !== 1) return;
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      const translated = translateText(value);
      if (translated !== value) element.setAttribute(attr, translated);
    });
    if (["BUTTON", "INPUT"].includes(element.tagName)) {
      const value = element.getAttribute("value");
      if (value) {
        const translated = translateText(value);
        if (translated !== value) element.setAttribute("value", translated);
      }
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      if (node.nodeType === Node.ELEMENT_NODE) translateAttributes(node);
      node = walker.nextNode();
    }
  }

  function wrapDialogs() {
    ["alert", "confirm", "prompt"].forEach((method) => {
      const original = window[method];
      if (typeof original !== "function" || original.__begoAdminFrWrapped) return;
      const wrapped = function (message, fallback) {
        const translated = preserveWhitespace(message, translateText(message));
        return method === "prompt"
          ? original.call(window, translated, fallback)
          : original.call(window, translated);
      };
      wrapped.__begoAdminFrWrapped = true;
      window[method] = wrapped;
    });
  }

  function start() {
    document.documentElement.lang = "fr";
    if (document.title) document.title = translateText(document.title);
    wrapDialogs();
    translateTree(document.body || document.documentElement);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach(translateTree);
        if (mutation.type === "attributes") translateAttributes(mutation.target);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "value"],
    });
  }

  document.documentElement.lang = "fr";
  if (document.title) document.title = translateText(document.title);
  wrapDialogs();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
