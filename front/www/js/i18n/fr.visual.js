(function () {
  "use strict";

  const exact = new Map();
  const add = (from, to) => exact.set(from, to);

  [
    ["BeGO - Acceso", "BeGO - Acces"],
    ["BeGO - Acceso pasajero", "BeGO - Acces passager"],
    ["Riders App - Driver", "BeGO Driver"],
    ["Motorista BeGO - Acceso", "Chauffeur BeGO - Acces"],
    ["Motorista BeGO - Registro", "Chauffeur BeGO - Inscription"],
    ["Entrada oficial", "Entree officielle"],
    ["Elige como quieres entrar.", "Choisissez comment entrer."],
    ["La misma plataforma para pedir viajes o trabajar como motorista.", "La meme plateforme pour demander une course ou travailler comme chauffeur."],
    ["Acceso BeGO", "Acces BeGO"],
    ["Selecciona tu perfil para abrir la experiencia correcta.", "Selectionnez votre profil pour ouvrir la bonne experience."],
    ["Pasajero", "Passager"],
    ["Pedir viaje, gestionar pagos y ver tu cuenta.", "Commander une course, gerer les paiements et consulter votre compte."],
    ["Motorista", "Chauffeur"],
    ["Entrar al panel, activar disponibilidad y recibir viajes.", "Ouvrir le tableau de bord, activer la disponibilite et recevoir des courses."],
    ["Si ya tienes la app instalada, puedes seguir usandola normalmente.", "Si l'application est deja installee, vous pouvez continuer a l'utiliser normalement."],
    ["Descargar app Android", "Telecharger l'application Android"],
    ["App pasajero", "App passager"],
    ["App motorista", "App chauffeur"],
    ["Redes sociales oficiales", "Reseaux sociaux officiels"],

    ["Usar ubicaciÃ³n actual", "Utiliser ma position actuelle"],
    ["Usar ubicación actual", "Utiliser ma position actuelle"],
    ["Desde", "Depart"],
    ["Hacia", "Destination"],
    ["Â¿A dÃ³nde te gustarÃ­a ir hoy?", "Ou souhaitez-vous aller aujourd'hui ?"],
    ["¿A dónde te gustaría ir hoy?", "Ou souhaitez-vous aller aujourd'hui ?"],
    ["Ingresa tu destino", "Saisissez votre destination"],
    ["Â¿CÃ³mo deseas pagar?", "Comment souhaitez-vous payer ?"],
    ["¿Cómo deseas pagar?", "Comment souhaitez-vous payer ?"],
    ["ðŸ’µ Efectivo", "Especes"],
    ["Efectivo", "Especes"],
    ["Wallet BeGO", "Wallet BeGO"],
    ["MonCash", "MonCash"],
    ["NatCash", "NatCash"],
    ["Recarga instantanea", "Recharge instantanee"],
    ["Recarga telefonica", "Recharge telephonique"],
    ["Recarga tu celular", "Rechargez votre telephone"],
    ["Usa tu Wallet BeGO para enviar saldo a Digicel o Natcom con recibo firmado.", "Utilisez votre Wallet BeGO pour envoyer du credit Digicel ou Natcom avec recu signe."],
    ["Saldo disponible", "Solde disponible"],
    ["Destino", "Destination"],
    ["Haiti", "Haiti"],
    ["Numero de celular", "Numero de telephone"],
    ["Operadora", "Operateur"],
    ["Selecciona una", "Selectionnez"],
    ["Recarga movil", "Recharge mobile"],
    ["Monto", "Montant"],
    ["Otro monto", "Autre montant"],
    ["Saldo despues", "Solde apres"],
    ["Recargar ahora", "Recharger maintenant"],
    ["Verificar firma digital del recibo", "Verifier la signature numerique du recu"],
    ["Recibo firmado", "Recu signe"],
    ["Pago desde wallet", "Paiement depuis wallet"],
    ["Proceso inmediato", "Traitement immediat"],
    ["Procesando recarga", "Recharge en cours"],
    ["Estamos confirmando la operacion de forma segura.", "Nous confirmons l'operation en toute securite."],
    ["Ingresa un numero valido.", "Saisissez un numero valide."],
    ["Selecciona Digicel o Natcom.", "Selectionnez Digicel ou Natcom."],
    ["El monto debe estar entre HTG 10 y HTG 5,000.", "Le montant doit etre entre 10 HTG et 5 000 HTG."],
    ["Saldo insuficiente en tu Wallet BeGO.", "Solde insuffisant dans votre Wallet BeGO."],
    ["Promociones", "Promotions"],
    ["Club BeGO", "Club BeGO"],
    ["Promociones para hoy", "Promotions du jour"],
    ["Beneficios BeGO", "Avantages BeGO"],
    ["Promociones activas", "Promotions actives"],
    ["Ver todas las promociones", "Voir toutes les promotions"],
    ["Ver todas", "Voir tout"],
    ["Oferta destacada", "Offre vedette"],
    ["Viaja con beneficio premium", "Voyagez avec un avantage premium"],
    ["Aplica el codigo MITAD y revisa el precio final antes de confirmar tu solicitud.", "Appliquez le code MITAD et verifiez le prix final avant de confirmer votre demande."],
    ["Activo hoy", "Actif aujourd'hui"],
    ["50% menos en tu proximo viaje", "-50 % sur votre prochaine course"],
    ["Usa MITAD antes de confirmar y revisa el precio final al instante.", "Utilisez MITAD avant de confirmer et verifiez le prix final instantanement."],
    ["Codigo", "Code"],
    ["Codigo promocional MITAD", "Code promotionnel MITAD"],
    ["Valido segun disponibilidad", "Valable selon disponibilite"],
    ["Beneficio activo", "Avantage actif"],
    ["descuento sugerido", "reduction suggeree"],
    ["Recargar wallet", "Recharger wallet"],
    ["Mas beneficios disponibles", "Autres avantages disponibles"],
    ["Envio paquete", "Envoi de colis"],
    ["Promos disponibles para servicios seleccionados.", "Promos disponibles pour certains services."],
    ["Paga rapido y evita manejar efectivo.", "Payez rapidement et evitez les especes."],
    ["Compra saldo desde tu wallet con recibo firmado.", "Achetez du credit depuis votre wallet avec recu signe."],
    ["Asistencia", "Assistance"],
    ["Soporte listo para ayudarte en produccion.", "Assistance prete a vous aider en production."],
    ["Envio sin costo", "Livraison offerte"],
    ["Primer paquete con tarifa bonificada.", "Premier colis avec tarif offert."],
    ["Wallet segura", "Wallet securise"],
    ["Recarga y paga sin efectivo.", "Rechargez et payez sans especes."],
    ["Soporte prioritario", "Assistance prioritaire"],
    ["Ayuda rapida durante tu viaje.", "Aide rapide pendant votre course."],
    ["Â¡Viaje al 50%!", "Course a -50 % !"],
    ["¡Viaje al 50%!", "Course a -50 % !"],
    ["Usa el cÃ³digo: MITAD", "Utilisez le code : MITAD"],
    ["Usa el código: MITAD", "Utilisez le code : MITAD"],
    ["EnvÃ­o Gratis", "Livraison gratuite"],
    ["Envío Gratis", "Livraison gratuite"],
    ["En tu primera compra", "Pour votre premier achat"],
    ["Puntos Dobles", "Points doubles"],
    ["Solo por hoy", "Aujourd'hui seulement"],
    ["Buscando motorista", "Recherche d'un chauffeur"],
    ["Esto puede tardar unos segundosâ€¦", "Cela peut prendre quelques secondes..."],
    ["Esto puede tardar unos segundos…", "Cela peut prendre quelques secondes..."],
    ["Conductor verificado", "Chauffeur verifie"],
    ["Tarifa", "Tarif"],
    ["Pago", "Paiement"],
    ["Distancia", "Distance"],
    ["ETA", "ETA"],
    ["Calculando", "Calcul en cours"],
    ["Llegando", "Arrive bientot"],
    ["Recogida", "Prise en charge"],
    ["Origen confirmado", "Depart confirme"],
    ["Destino", "Destination"],
    ["Destino confirmado", "Destination confirmee"],
    ["Viaje activo", "Course active"],
    ["Vehiculo verificado", "Vehicule verifie"],
    ["VehÃ­culo verificado", "Vehicule verifie"],
    ["Compartir", "Partager"],
    ["Llamar", "Appeler"],
    ["WhatsApp", "WhatsApp"],
    ["Ver perfil", "Voir le profil"],
    ["En camino", "En route"],
    ["Confirmar viaje", "Confirmer la course"],
    ["Precio estimado:", "Prix estime :"],
    ["Confirmar", "Confirmer"],
    ["Cancelar", "Annuler"],
    ["Finalizar", "Terminer"],
    ["Listo", "Pret"],
    ["Hola", "Bonjour"],
    ["Invitado", "Invite"],
    ["Listo para viajar", "Pret a voyager"],
    ["Elige tu experiencia", "Choisissez votre experience"],
    ["Tus viajes y pagos", "Vos courses et paiements"],
    ["Perfil y beneficios", "Profil et avantages"],
    ["Saldo y movimientos", "Solde et mouvements"],
    ["Preferencias", "Preferences"],
    ["Viaja protegido", "Voyagez protege"],
    ["Soporte BeGO", "Assistance BeGO"],
    ["Estamos contigo", "Nous sommes avec vous"],
    ["Genera con BeGO", "Gagnez avec BeGO"],
    ["Resumen del viaje", "Resume de la course"],
    ["Agrega saldo", "Ajouter du solde"],
    ["Comprobante", "Justificatif"],
    ["Cuentas familiares", "Comptes familiaux"],
    ["Metodos disponibles", "Moyens disponibles"],
    ["Métodos disponibles", "Moyens disponibles"],
    ["Viaje en vivo", "Course en direct"],
    ["Beneficios activos", "Avantages actifs"],
    ["Cambiar foto de perfil", "Changer la photo de profil"],
    ["Cambiar foto", "Changer la photo"],
    ["Notificaciones", "Notifications"],
    ["Volver", "Retour"],
    ["Cabecera principal", "En-tete principal"],
    ["Cabecera de seccion", "En-tete de section"],
    ["Configuracion", "Configuration"],
    ["ConfiguraciÃ³n", "Configuration"],
    ["Inicio", "Accueil"],
    ["Servicios", "Services"],
    ["Actividad", "Activite"],
    ["Cuenta", "Compte"],
    ["Pedir viaje", "Commander"],

    ["Tipo de servicio", "Type de service"],
    ["Seleccionar servicio", "Selectionner le service"],
    ["Viaje", "Course"],
    ["Envio", "Livraison"],
    ["EnvÃ­o", "Livraison"],
    ["Peso", "Poids"],
    ["Contenido del paquete", "Contenu du colis"],
    ["Instrucciones para entregar", "Instructions de livraison"],
    ["Maximo 5 kg", "Maximum 5 kg"],
    ["Peso maximo permitido: 5 kg", "Poids maximum autorise : 5 kg"],
    ["Codigo de entrega al confirmar", "Code de livraison genere a la confirmation"],
    ["Entrega completada", "Livraison terminee"],
    ["Viaje completado", "Course terminee"],
    ["Tu paquete fue entregado correctamente.", "Votre colis a ete livre correctement."],
    ["Gracias por viajar con BeGO.", "Merci de voyager avec BeGO."],
    ["Total pagado", "Total paye"],
    ["Origen", "Depart"],
    ["Entregado por", "Livre par"],
    ["Conductor", "Chauffeur"],
    ["Califica la experiencia", "Notez l'experience"],
    ["Calificacion", "Note"],
    ["Dejar comentario (opcional)", "Laisser un commentaire (facultatif)"],
    ["Siguenos para promociones y novedades", "Suivez-nous pour les promotions et nouveautes"],
    ["Codigo de entrega", "Code de livraison"],
    ["Comparte este codigo solo cuando recibas el paquete.", "Partagez ce code uniquement lorsque vous recevez le colis."],

    ["Pasajeros BeGO", "Passagers BeGO"],
    ["Tu viaje empieza con una cuenta segura.", "Votre trajet commence avec un compte securise."],
    ["Entra rapido, revisa tu perfil y pide tu motorista cuando estes listo.", "Connectez-vous vite, verifiez votre profil et commandez votre chauffeur quand vous etes pret."],
    ["Disponible", "Disponible"],
    ["En vivo", "En direct"],
    ["Seguro", "Securise"],
    ["Cuenta pasajero", "Compte passager"],
    ["Bienvenido a BeGO", "Bienvenue sur BeGO"],
    ["Conexion segura", "Connexion securisee"],
    ["ConexiÃ³n segura", "Connexion securisee"],
    ["Ingresar", "Connexion"],
    ["Crear cuenta", "Creer un compte"],
    ["Iniciar sesion", "Connexion"],
    ["Iniciar sesiÃ³n", "Connexion"],
    ["Usa tu telefono o email registrado.", "Utilisez votre telephone ou email enregistre."],
    ["Telefono o email", "Telephone ou email"],
    ["TelÃ©fono o email", "Telephone ou email"],
    ["Contrasena", "Mot de passe"],
    ["ContraseÃ±a", "Mot de passe"],
    ["Tu contrasena", "Votre mot de passe"],
    ["Tu contraseÃ±a", "Votre mot de passe"],
    ["Ingresar con huella", "Connexion par empreinte"],
    ["No tienes cuenta?", "Vous n'avez pas de compte ?"],
    ["Registrate", "Inscrivez-vous"],
    ["RegÃ­strate", "Inscrivez-vous"],
    ["Datos basicos para identificarte en tus viajes.", "Donnees de base pour vous identifier pendant vos courses."],
    ["Nombre", "Prenom"],
    ["Apellido", "Nom"],
    ["Telefono", "Telephone"],
    ["TelÃ©fono", "Telephone"],
    ["Email opcional", "Email facultatif"],
    ["Continuar", "Continuer"],
    ["Ya tienes cuenta?", "Vous avez deja un compte ?"],
    ["Seguridad", "Securite"],
    ["Crea una contrasena fuerte para proteger tu cuenta.", "Creez un mot de passe fort pour proteger votre compte."],
    ["Confirmar contrasena", "Confirmer le mot de passe"],
    ["Confirmar contraseÃ±a", "Confirmer le mot de passe"],
    ["Minimo 8 caracteres", "Minimum 8 caracteres"],
    ["MÃ­nimo 8 caracteres", "Minimum 8 caracteres"],
    ["Repite tu contrasena", "Repetez votre mot de passe"],
    ["Repite tu contraseÃ±a", "Repetez votre mot de passe"],
    ["Acepto terminos y condiciones", "J'accepte les conditions generales"],
    ["Atras", "Retour"],
    ["AtrÃ¡s", "Retour"],
    ["Creando cuenta...", "Creation du compte..."],
    ["Ingresando...", "Connexion..."],
    ["Bienvenido ðŸš€", "Bienvenue"],
    ["Completa todos los campos", "Completez tous les champs"],
    ["Completa nombre, apellido y telÃ©fono", "Completez le prenom, le nom et le telephone"],
    ["TelÃ©fono invÃ¡lido", "Telephone invalide"],
    ["Email invÃ¡lido", "Email invalide"],
    ["La contraseÃ±a debe tener mÃ­nimo 8 caracteres", "Le mot de passe doit contenir au moins 8 caracteres"],
    ["Las contraseÃ±as no coinciden", "Les mots de passe ne correspondent pas"],
    ["Debes aceptar los tÃ©rminos", "Vous devez accepter les conditions"],
    ["Cuenta creada correctamente âœ…", "Compte cree correctement"],
    ["Credenciales invÃ¡lidas", "Identifiants invalides"],
    ["Error de conexiÃ³n", "Erreur de connexion"],
    ["Error en registro", "Erreur d'inscription"],
    ["Crear Cuenta", "Creer le compte"],

    ["Historial BeGO", "Historique BeGO"],
    ["Viajes, envios y recargas organizados para revisar rapido cada movimiento.", "Courses, livraisons et recharges organisees pour verifier rapidement chaque mouvement."],
    ["Viajes", "Courses"],
    ["Recargas", "Recharges"],
    ["Todos", "Tous"],
    ["Envios", "Livraisons"],
    ["Viaje cancelado", "Course annulee"],
    ["Envio completado", "Livraison terminee"],
    ["Recarga celular", "Recharge mobile"],
    ["Operadora", "Operateur"],
    ["No hay actividad para este filtro.", "Aucune activite pour ce filtre."],
    ["Inicia sesion para ver tu actividad.", "Connectez-vous pour voir votre activite."],
    ["Cuenta personal", "Compte personnel"],
    ["Perfil BeGO", "Profil BeGO"],
    ["Editar cuenta", "Modifier le compte"],
    ["Ayuda", "Aide"],
    ["Billetera", "Portefeuille"],
    ["Soporte", "Assistance"],
    ["Proba BeGO sin costo", "Essayez BeGO sans frais"],
    ["Desbloquea un 15% en creditos", "Debloquez 15 % en credits"],
    ["Centro de Seguridad", "Centre de securite"],
    ["Viajes mas seguros y acompanados", "Courses plus sures et accompagnees"],
    ["Cargando saldo...", "Chargement du solde..."],
    ["Familia PRO", "Famille PRO"],
    ["Administra cuentas familiares", "Gerez les comptes familiaux"],
    ["Personaliza tu experiencia", "Personnalisez votre experience"],
    ["Modo simple", "Mode simple"],
    ["Interfaz simplificada", "Interface simplifiee"],
    ["Generar ganancias", "Generer des revenus"],
    ["Gana dinero con BeGO", "Gagnez de l'argent avec BeGO"],
    ["Cerrar sesion", "Deconnexion"],
    ["Cerrar sesiÃ³n", "Deconnexion"],
    ["Salir de este dispositivo", "Quitter cet appareil"],
    ["BeGO Premium", "BeGO Premium"],
    ["Todo lo que necesitas para moverte, pagar y seguir tus viajes con una experiencia mas clara.", "Tout ce qu'il faut pour vous deplacer, payer et suivre vos courses plus clairement."],
    ["Viajes rapidos", "Courses rapides"],
    ["Movete por la ciudad evitando el trafico", "Deplacez-vous en ville en evitant le trafic"],
    ["Ir al mapa", "Aller a la carte"],
    ["Seguimiento en vivo", "Suivi en direct"],
    ["Mira tu recorrido en tiempo real", "Suivez votre trajet en temps reel"],
    ["Tarifas claras", "Tarifs clairs"],
    ["Precio visible antes de confirmar", "Prix visible avant confirmation"],
    ["Motoristas verificados y soporte", "Chauffeurs verifies et assistance"],
    ["Entrega rapida de paquetes", "Livraison rapide de colis"],
    ["Disponible 24/7", "Disponible 24/7"],
    ["Usa BeGO cuando quieras", "Utilisez BeGO quand vous voulez"],
    ["Pagos", "Paiements"],
    ["MonCash, NatCash o tarjeta", "MonCash, NatCash ou carte"],
    ["Recarga Tel", "Recharge Tel"],
    ["Recarga tu celular al instante", "Rechargez votre telephone instantanement"],

    ["Editar perfil", "Modifier le profil"],
    ["Cambiar nÃºmero", "Changer le numero"],
    ["Cambiar contraseÃ±a", "Changer le mot de passe"],
    ["AplicaciÃ³n", "Application"],
    ["Modo oscuro", "Mode sombre"],
    ["Compartir ubicaciÃ³n", "Partager la position"],
    ["Emergencia", "Urgence"],
    ["LlamÃ¡ rÃ¡pidamente a BeGO", "Appelez BeGO rapidement"],
    ["Compartir viaje en tiempo real", "Partager la course en temps reel"],
    ["CompartÃ­ tu recorrido con alguien de confianza", "Partagez votre trajet avec une personne de confiance"],
    ["Contactos de confianza", "Contacts de confiance"],
    ["Llamar a contacto de emergencia", "Appeler un contact d'urgence"],
    ["Datos del motorista", "Infos du chauffeur"],
    ["Identidad y vehÃ­culo asignado", "Identite et vehicule assigne"],
    ["GrabaciÃ³n de audio", "Enregistrement audio"],
    ["GuardÃ¡ evidencia del viaje", "Conservez une preuve de la course"],
    ["Reportar un problema", "Signaler un probleme"],
    ["DenunciÃ¡ situaciones inseguras", "Signaler une situation dangereuse"],
    ["Â¿En quÃ© podemos ayudarte?", "Comment pouvons-nous vous aider ?"],
    ["Hablar con soporte", "Parler a l'assistance"],
    ["Mi viaje", "Ma course"],
    ["Pagos y billetera", "Paiements et portefeuille"],
    ["Motoristas", "Chauffeurs"],
    ["Preguntas frecuentes", "Questions frequentes"],
    ["Â¿CÃ³mo cancelo un viaje?", "Comment annuler une course ?"],
    ["Desde la pantalla del viaje podÃ©s tocar \"Cancelar\".", "Depuis l'ecran de course, touchez \"Annuler\"."],
    ["Â¿QuÃ© hago si el motorista no llega?", "Que faire si le chauffeur n'arrive pas ?"],
    ["PodÃ©s reportarlo o pedir otro motorista.", "Vous pouvez le signaler ou demander un autre chauffeur."],
    ["Â¿CÃ³mo recargo mi billetera?", "Comment recharger mon portefeuille ?"],
    ["EntrÃ¡ a Wallet BeGO y elegÃ­ un mÃ©todo de pago.", "Ouvrez Wallet BeGO et choisissez un moyen de paiement."],
    ["BuscÃ¡ ayuda...", "Rechercher de l'aide..."],
    ["Chat en vivo", "Chat en direct"],

    ["Alias", "Alias"],
    ["Disponible ahora", "Disponible maintenant"],
    ["Movimientos", "Mouvements"],
    ["PIN + antifraude", "PIN + antifraude"],
    ["Activo", "Actif"],
    ["Escrow en viajes", "Escrow sur les courses"],
    ["PIN requerido", "PIN requis"],
    ["Recibos verificables", "Recus verifiables"],
    ["Enviar dinero", "Envoyer de l'argent"],
    ["Â¿CÃ³mo querÃ©s enviar dinero?", "Comment voulez-vous envoyer de l'argent ?"],
    ["Con nÃºmero de telÃ©fono", "Avec numero de telephone"],
    ["Con alias, CBU o CVU", "Avec alias, CBU ou CVU"],
    ["TUS FAVORITOS", "VOS FAVORIS"],
    ["AcÃ¡ vas a ver tus", "Vous verrez ici vos"],
    ["contactos favoritos.", "contacts favoris."],
    ["Enviar con Alias/CBU", "Envoyer avec Alias/CBU"],
    ["Continuar", "Continuer"],
    ["Saldo disponible:", "Solde disponible :"],
    ["Monto a enviar", "Montant a envoyer"],
    ["Ingresa tu PIN", "Saisissez votre PIN"],
    ["Confirmar EnvÃ­o", "Confirmer l'envoi"],
    ["Recargar", "Recharger"],
    ["Enviar", "Envoyer"],
    ["Retirar", "Retirer"],
    ["Configurar PIN de Seguridad", "Configurer le PIN de securite"],
    ["Nuevo PIN", "Nouveau PIN"],
    ["Guardar PIN", "Enregistrer le PIN"],
    ["Cambiar PIN", "Changer le PIN"],
    ["PIN actual", "PIN actuel"],
    ["Actualizar PIN", "Mettre a jour le PIN"],
    ["Motorista", "Chauffeur"],
    ["Repetir viaje", "Repeter la course"],
    ["Calificar", "Noter"],
    ["Calificar motorista", "Noter le chauffeur"],
    ["Comentario (opcional)", "Commentaire (facultatif)"],
    ["Enviar", "Envoyer"],

    ["Hasta 3 destinos", "Jusqu'a 3 destinations"],
    ["Guardados", "Enregistrees"],
    ["Destinos guardados", "Destinations enregistrees"],
    ["Guardar destino actual", "Enregistrer la destination actuelle"],
    ["Elige un destino en el mapa o en la busqueda y guardalo aqui.", "Choisissez une destination sur la carte ou dans la recherche et enregistrez-la ici."],
    ["Destino guardado", "Destination enregistree"],
    ["Eliminar destino", "Supprimer la destination"],
    ["Espera a que cargue tu ubicacion para trazar la ruta.", "Attendez le chargement de votre position pour tracer l'itineraire."],
    ["Destino eliminado.", "Destination supprimee."],
    ["Primero elige un destino dentro de la ciudad.", "Choisissez d'abord une destination dans la ville."],
    ["Destino guardado.", "Destination enregistree."],

    ["Conectando GoMoto Driver", "Connexion a BeGO Driver"],
    ["Verificando sesion y ubicacion...", "Verification de la session et de la position..."],
    ["Desconectado", "Hors ligne"],
    ["Conectado", "Connecte"],
    ["Reconectando", "Reconnexion"],
    ["Ganancias", "Revenus"],
    ["Creditos", "Credits"],
    ["Ajustes", "Parametres"],
    ["Conectar", "Se connecter"],
    ["Offline", "Hors ligne"],
    ["Online", "En ligne"],
    ["1 VIAJE EN ESPERA", "1 COURSE EN ATTENTE"],
    ["RECOGER EN:", "PRISE EN CHARGE :"],
    ["DESTINO FINAL:", "DESTINATION FINALE :"],
    ["Buscando origen...", "Recherche du depart..."],
    ["Buscando destino...", "Recherche de la destination..."],
    ["ACEPTAR", "ACCEPTER"],
    ["En camino", "En route"],
    ["LLEGUÃ‰ AL PUNTO", "ARRIVE AU POINT"],
    ["INICIAR VIAJE", "DEMARRER LA COURSE"],
    ["FINALIZAR", "TERMINER"],
    ["Resumen de rendimiento", "Resume des performances"],
    ["Hoy", "Aujourd'hui"],
    ["Ingresos netos", "Revenus nets"],
    ["Semana", "Semaine"],
    ["Proyeccion activa", "Projection active"],
    ["Aceptacion", "Acceptation"],
    ["Viajes tomados", "Courses acceptees"],
    ["Tiempo online", "Temps en ligne"],
    ["Sesion actual", "Session actuelle"],
    ["Meta diaria", "Objectif quotidien"],
    ["Las metricas se actualizan con tus viajes finalizados y pagos capturados.", "Les indicateurs se mettent a jour avec vos courses terminees et paiements captures."],
    ["Cargando actividad", "Chargement de l'activite"],
    ["Capital para motoristas top", "Capital pour chauffeurs performants"],
    ["Rendimiento", "Performance"],
    ["Evaluando", "Evaluation"],
    ["Calculando elegibilidad automatica.", "Calcul automatique de l'eligibilite."],
    ["Monto del credito", "Montant du credit"],
    ["Cuota semanal", "Versement hebdomadaire"],
    ["Tasa semanal", "Taux hebdomadaire"],
    ["Meta", "Objectif"],
    ["Para activar credito", "Pour activer le credit"],
    ["Viajes actuales", "Courses actuelles"],
    ["Score", "Score"],
    ["Rendimiento semanal", "Performance hebdomadaire"],
    ["Progreso", "Progression"],
    ["Al llegar a 1000 viajes finalizados, BeGO calcula tu credito semanal automaticamente.", "A 1000 courses terminees, BeGO calcule automatiquement votre credit hebdomadaire."],
    ["Cargando creditos", "Chargement des credits"],
    ["Viajes y reservas", "Courses et reservations"],
    ["Estado actual", "Etat actuel"],
    ["Viaje en curso", "Course en cours"],
    ["Sin viaje activo", "Aucune course active"],
    ["Cuando aceptes una oferta, aparecera el seguimiento aqui.", "Quand vous acceptez une offre, le suivi apparaitra ici."],
    ["Ingresos", "Revenus"],
    ["Finalizados", "Terminees"],
    ["Cancelados", "Annulees"],
    ["Control", "Controle"],
    ["Reservas", "Reservations"],
    ["Pendientes", "En attente"],
    ["Historial", "Historique"],
    ["Pagos y balance", "Paiements et solde"],
    ["Balance disponible", "Solde disponible"],
    ["Actualizado por wallet en tiempo real", "Mis a jour par le wallet en temps reel"],
    ["Revisa pagos y movimientos", "Verifier paiements et mouvements"],
    ["Cargando movimientos", "Chargement des mouvements"],
    ["Buscando historial de wallet.", "Recherche de l'historique du wallet."],
    ["Perfil profesional", "Profil professionnel"],
    ["Motorista verificado", "Chauffeur verifie"],
    ["Motorista BeGO", "Chauffeur BeGO"],
    ["Documentos, vehiculo y reputacion en un solo lugar.", "Documents, vehicule et reputation au meme endroit."],
    ["Datos personales", "Donnees personnelles"],
    ["Telefono, foto y documentos.", "Telephone, photo et documents."],
    ["Vehiculo", "Vehicule"],
    ["Marca, placa, color y seguro.", "Marque, plaque, couleur et assurance."],
    ["Creditos BeGO", "Credits BeGO"],
    ["Preaprobado automatico desde 1000 viajes.", "Preapprouve automatiquement a partir de 1000 courses."],
    ["Reputacion", "Reputation"],
    ["Calificacion, puntualidad y comentarios.", "Note, ponctualite et commentaires."],
    ["PIN, huella y contactos de emergencia.", "PIN, empreinte et contacts d'urgence."],
    ["Preferencias de trabajo", "Preferences de travail"],
    ["Modo operativo", "Mode operationnel"],
    ["El boton superior controla si entras o sales del matching de viajes.", "Le bouton superieur controle l'entree et la sortie du matching des courses."],
    ["Sonido de ofertas", "Son des offres"],
    ["Vibracion", "Vibration"],
    ["Aceptar reservas", "Accepter les reservations"],
    ["Modo bajo consumo", "Mode economie d'energie"],
    ["Ayuda para tu operacion", "Aide pour votre operation"],
    ["Chat con soporte", "Chat avec l'assistance"],
    ["Reporta problemas de pago, viaje o pasajero.", "Signalez un probleme de paiement, de course ou de passager."],
    ["Acceso rapido durante un viaje activo.", "Acces rapide pendant une course active."],
    ["Guias", "Guides"],
    ["Buenas practicas para viajes premium.", "Bonnes pratiques pour les courses premium."],
    ["Credito preaprobado", "Credit preapprouve"],
    ["Construyendo elegibilidad", "Eligibilite en construction"],
    ["Monto calculado por tu volumen semanal y promedio reciente.", "Montant calcule selon votre volume hebdomadaire et votre moyenne recente."],
    ["Al completar 1000 viajes se activa la linea automaticamente.", "La ligne s'active automatiquement apres 1000 courses."],
    ["Disponible ahora", "Disponible maintenant"],
    ["Cuotas", "Versements"],
    ["Proximo cobro estimado", "Prochain prelevement estime"],
    ["Aun no disponible", "Pas encore disponible"],
    ["La linea se activa al superar 1000 viajes finalizados.", "La ligne s'active apres plus de 1000 courses terminees."],
    ["Sigue completando viajes", "Continuez a terminer des courses"],
    ["Cada viaje finalizado acerca tu credito automatico.", "Chaque course terminee rapproche votre credit automatique."],
    ["No pudimos cargar tus creditos.", "Nous n'avons pas pu charger vos credits."],
    ["No pudimos cargar la actividad.", "Nous n'avons pas pu charger l'activite."],
    ["No pudimos cargar la billetera.", "Nous n'avons pas pu charger le portefeuille."],
    ["No pudimos cargar tus ganancias.", "Nous n'avons pas pu charger vos revenus."],
    ["Sin movimientos recientes", "Aucun mouvement recent"],
    ["Los pagos apareceran aqui cuando cierres viajes.", "Les paiements apparaitront ici apres vos courses."],
    ["Ultimo viaje finalizado", "Derniere course terminee"],

    ["Centro BeGO", "Centre BeGO"],
    ["Resuelve dudas de viaje, pagos, cuenta y seguridad desde un solo lugar.", "Resoudre les questions de course, paiement, compte et securite depuis un seul endroit."],
    ["Abrir asistencia", "Ouvrir l'assistance"],
    ["Buscar ayuda", "Rechercher de l'aide"],
    ["Accesos de ayuda", "Acces d'aide"],
    ["Asistencia en vivo", "Assistance en direct"],
    ["Habla con soporte BeGO.", "Parlez avec l'assistance BeGO."],
    ["Mis viajes", "Mes courses"],
    ["Revisa historial y estados.", "Consultez l'historique et les statuts."],
    ["Herramientas para viajar protegido.", "Outils pour voyager protege."],
    ["Wallet, recargas y saldos.", "Wallet, recharges et soldes."],
    ["Respuesta rápida", "Reponse rapide"],
    ["Respuesta rapida", "Reponse rapide"],
    ["¿Cómo cancelo un viaje?", "Comment annuler une course ?"],
    ["¿Qué hago si el motorista no llega?", "Que faire si le chauffeur n'arrive pas ?"],
    ["¿Dónde veo mis pagos?", "Ou voir mes paiements ?"],
    ["Desde la pantalla del viaje puedes tocar Cancelar antes de que el viaje avance a una etapa no cancelable.", "Depuis l'ecran de course, vous pouvez toucher Annuler avant que la course atteigne une etape non annulable."],
    ["Entra a Seguridad o Asistencia para reportarlo, compartir tu viaje o pedir ayuda al equipo BeGO.", "Ouvrez Securite ou Assistance pour le signaler, partager votre course ou demander de l'aide a l'equipe BeGO."],
    ["Abre Wallet para consultar saldo, movimientos, recargas y comprobantes disponibles.", "Ouvrez Wallet pour consulter solde, mouvements, recharges et justificatifs disponibles."],
    ["Protección activa", "Protection active"],
    ["Proteccion activa", "Protection active"],
    ["Acciones rápidas para compartir tu viaje, pedir ayuda y reportar cualquier situación.", "Actions rapides pour partager votre course, demander de l'aide et signaler toute situation."],
    ["Enviar emergencia", "Envoyer une urgence"],
    ["Sin viaje activo", "Aucune course active"],
    ["Ver viaje activo", "Voir la course active"],
    ["Acciones de seguridad", "Actions de securite"],
    ["Alertar a BeGO ahora.", "Alerter BeGO maintenant."],
    ["Compartir viaje", "Partager la course"],
    ["Enviar seguimiento en vivo.", "Envoyer le suivi en direct."],
    ["Contacto seguro", "Contact securise"],
    ["Llamar a tu contacto guardado.", "Appeler votre contact enregistre."],
    ["Informar un problema.", "Signaler un probleme."],
    ["Controles del viaje", "Controles de la course"],
    ["Verificación BeGO", "Verification BeGO"],
    ["Verificacion BeGO", "Verification BeGO"],
    ["Identidad, vehículo y placa asignada.", "Identite, vehicule et plaque assignee."],
    ["Identidad, vehiculo y placa asignada.", "Identite, vehicule et plaque assignee."],
    ["Registro de audio", "Enregistrement audio"],
    ["Guardar evidencia del viaje cuando sea necesario.", "Conserver une preuve de la course si necessaire."],
    ["Asistencia BeGO", "Assistance BeGO"],
    ["Hablar con soporte por viaje, pago o cuenta.", "Parler a l'assistance pour course, paiement ou compte."],
    ["Atención para viajes, pagos, seguridad y cuenta con prioridad según tu situación.", "Assistance pour courses, paiements, securite et compte avec priorite selon votre situation."],
    ["Atencion para viajes, pagos, seguridad y cuenta con prioridad segun tu situacion.", "Assistance pour courses, paiements, securite et compte avec priorite selon votre situation."],
    ["Abrir seguridad", "Ouvrir la securite"],
    ["Buscar asistencia", "Rechercher une assistance"],
    ["Prioridad alta", "Priorite haute"],
    ["Viaje en curso", "Course en cours"],
    ["Usa Seguridad si necesitas compartir ubicación, reportar o enviar una alerta.", "Utilisez Securite si vous devez partager la position, signaler ou envoyer une alerte."],
    ["Usa Seguridad si necesitas compartir ubicacion, reportar o enviar una alerta.", "Utilisez Securite si vous devez partager la position, signaler ou envoyer une alerte."],
    ["Canales de asistencia", "Canaux d'assistance"],
    ["Hablar con el equipo.", "Parler avec l'equipe."],
    ["Viajes y recibos", "Courses et recus"],
    ["Resolver cargos o historial.", "Resoudre les frais ou l'historique."],
    ["Wallet, saldo o recarga.", "Wallet, solde ou recharge."],
    ["Perfil, acceso y seguridad.", "Profil, acces et securite."],
    ["Temas frecuentes", "Sujets frequents"],
    ["Producción", "Production"],
    ["Produccion", "Production"],
    ["Problema con un viaje", "Probleme avec une course"],
    ["Revisa la actividad y abre el detalle correspondiente.", "Consultez l'activite et ouvrez le detail correspondant."],
    ["Pago o saldo", "Paiement ou solde"],
    ["Consulta movimientos antes de iniciar un reclamo.", "Consultez les mouvements avant de commencer une reclamation."],
    ["Guía de uso", "Guide d'utilisation"],
    ["Guia de uso", "Guide d'utilisation"],
    ["Preguntas rápidas sobre BeGO.", "Questions rapides sur BeGO."],

    ["Centro de control", "Centre de controle"],
    ["Ajusta tu cuenta, seguridad, privacidad y experiencia de uso en BeGO.", "Ajustez votre compte, securite, confidentialite et experience BeGO."],
    ["Abrir cuenta", "Ouvrir le compte"],
    ["Perfil activo", "Profil actif"],
    ["Cuenta BeGO protegida", "Compte BeGO protege"],
    ["Identidad", "Identite"],
    ["Nombre, foto y datos personales.", "Nom, photo et donnees personnelles."],
    ["Cambiar número", "Changer le numero"],
    ["Cambiar numero", "Changer le numero"],
    ["Actualiza tu teléfono de contacto.", "Mettez a jour votre telephone de contact."],
    ["Actualiza tu telefono de contacto.", "Mettez a jour votre telephone de contact."],
    ["Cambiar contraseña", "Changer le mot de passe"],
    ["Cambiar contrasena", "Changer le mot de passe"],
    ["Refuerza el acceso a tu cuenta.", "Renforcez l'acces a votre compte."],
    ["Experiencia", "Experience"],
    ["Apariencia premium nocturna.", "Apparence premium nocturne."],
    ["Interfaz más directa y liviana.", "Interface plus directe et legere."],
    ["Interfaz mas directa y liviana.", "Interface plus directe et legere."],
    ["Alertas de viaje, pagos y seguridad.", "Alertes de course, paiements et securite."],
    ["Seguridad y privacidad", "Securite et confidentialite"],
    ["Protección", "Protection"],
    ["Proteccion", "Protection"],
    ["Compartir viaje, SOS y reportes.", "Partager la course, SOS et signalements."],
    ["Permisos de GPS para viajes precisos.", "Autorisations GPS pour des courses precises."],
    ["Asistencia", "Assistance"],
    ["Soporte para cuenta, pagos o seguridad.", "Assistance pour compte, paiements ou securite."]
  ].forEach(([from, to]) => add(from, to));

  const regexRules = [
    [/^(\d+)\s+VIAJES?\s+EN\s+ESPERA$/i, (_, n) => `${n} COURSE${Number(n) === 1 ? "" : "S"} EN ATTENTE`],
    [/^(\d+)\s*\/\s*(\d+)\s+viajes$/i, (_, a, b) => `${a} / ${b} courses`],
    [/^(\d+)\s+viajes restantes$/i, (_, n) => `${n} courses restantes`],
    [/^(\d+)\s+registros$/i, (_, n) => `${n} enregistrements`],
    [/^(\d+)\s+registros locales$/i, (_, n) => `${n} enregistrements locaux`],
    [/^Viaje\s+(.+)$/i, (_, id) => `Course ${id}`],
    [/^Envio\s+(.+)$/i, (_, id) => `Livraison ${id}`],
    [/^Color\s+(.+)$/i, (_, color) => `Couleur ${color}`],
    [/^Saldo retenido:\s*(.+)$/i, (_, amount) => `Solde retenu : ${amount}`],
    [/^Te faltan\s+(\d+)\s+viajes finalizados para activar creditos\.$/i, (_, n) => `Il vous manque ${n} courses terminees pour activer les credits.`],
    [/^Esta semana hiciste\s+(\d+)\s+viajes sobre una meta de\s+(\d+)\.$/i, (_, a, b) => `Cette semaine, vous avez fait ${a} courses sur un objectif de ${b}.`],
    [/^(\d+)\s+pagos semanales de\s+(.+)$/i, (_, n, amount) => `${n} paiements hebdomadaires de ${amount}`],
    [/^(.+)\s+preaprobados$/i, (_, amount) => `${amount} preapprouves`],
    [/^(.+)\s+completados$/i, (_, n) => `${n} terminees`],
    [/^(.+)\s+acumulados$/i, (_, amount) => `${amount} accumules`],
    [/^ID\s+(.+)$/i, (_, id) => `ID ${id}`]
  ];

  function translateCore(value) {
    const direct = exact.get(value);
    if (direct) return direct;

    for (const [pattern, replacer] of regexRules) {
      if (pattern.test(value)) {
        return value.replace(pattern, replacer);
      }
    }

    return value;
  }

  function translateText(value) {
    if (value == null) return value;
    const text = String(value);
    const trimmed = text.trim();
    if (!trimmed) return text;

    const translated = translateCore(trimmed);
    if (translated === trimmed) return text;

    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    return `${leading}${translated}${trailing}`;
  }

  function shouldSkipElement(element) {
    return ["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName);
  }

  function translateElement(element) {
    if (!element || shouldSkipElement(element)) return;

    ["placeholder", "title", "aria-label", "value"].forEach((attr) => {
      if (!element.hasAttribute?.(attr)) return;
      if (attr === "value" && !["BUTTON", "INPUT"].includes(element.tagName)) return;
      const current = element.getAttribute(attr);
      const next = translateText(current);
      if (next !== current) element.setAttribute(attr, next);
    });
  }

  function translateNode(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.tagName === "TEXTAREA") return;
      const next = translateText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE || shouldSkipElement(node)) return;

    translateElement(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(candidate) {
        if (candidate.nodeType === Node.ELEMENT_NODE && shouldSkipElement(candidate)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let current = walker.currentNode;
    while (current) {
      if (current !== node) {
        if (current.nodeType === Node.TEXT_NODE) translateNode(current);
        if (current.nodeType === Node.ELEMENT_NODE) translateElement(current);
      }
      current = walker.nextNode();
    }
  }

  function installWindowTranslators() {
    const wrap = (name) => {
      const original = window[name];
      if (typeof original !== "function" || original.__begoFrWrapped) return;
      const wrapped = function (message, fallback) {
        if (name === "prompt") {
          return original.call(window, translateText(message), translateText(fallback));
        }
        return original.call(window, translateText(message));
      };
      wrapped.__begoFrWrapped = true;
      window[name] = wrapped;
    };

    wrap("alert");
    wrap("confirm");
    wrap("prompt");
  }

  function boot() {
    document.documentElement.lang = "fr";
    document.title = translateText(document.title);
    installWindowTranslators();

    const root = document.body || document.documentElement;
    translateNode(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateNode(mutation.target);
          continue;
        }
        if (mutation.type === "attributes") {
          translateElement(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach(translateNode);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "value"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
