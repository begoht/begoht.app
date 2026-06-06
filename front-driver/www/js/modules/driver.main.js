/*************************************************
 * 🚀 DRIVER MAIN - Modular Production
 *************************************************/

// Asegúrate de que estos archivos existan en estas rutas exactas
import { initSocket } from "./socket.js?v=20260606-monitoring";
import { initMap } from "./map.js?v=20260606-recenter-map";
import { initGPS } from "./gps.js?v=20260606-recenter-map";
import { initOferta } from "./oferta/oferta.index.js?v=20260606-recenter-map";
import { initViajeInicio } from "./viajeInicio/viajeInicio.js?v=20260606-recenter-map";
import { initViajeFinalizar } from "./viajeFinalizar.js?v=20260606-recenter-map";
import { initViajeControl } from "./viajeControl/viajeControl.js?v=20260606-recenter-map";
import { initDriverChat } from "./chat/viajeChat.js";
import { initDriverStatus } from "./driver.status.js?v=20260603-road-heading-stable";
import { initDriverSpa } from "./driver.spa.js?v=20260606-legal-trust";
import { iniciarSonidoOfertaLoop } from "./oferta/oferta.ui.js?v=20260602-offer-ui-singleton";
import { initLaunchCountdown } from "./launch-countdown.js?v=20260603-launch-gate";

document.addEventListener("DOMContentLoaded", async () => {

    const bootStatus = document.getElementById("driverBootStatus");

    function setBootStatus(message) {
        if (bootStatus) bootStatus.textContent = message;
    }

    let revealPromise = null;

    function mostrarAppConectada() {
        if (revealPromise) return revealPromise;

        revealPromise = (async () => {
            document.documentElement.classList.remove("driver-booting");
            document.documentElement.classList.add("driver-ready");
        })();

        return revealPromise;
    }

    /*************************************************
     * 🔐 VALIDACIÓN TOKEN
     *************************************************/
    let token = localStorage.getItem("token");

    // Limpiar comillas si existen (común en algunos almacenamientos)
    if (token?.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
    }

    if (!token) {
        console.error("❌ No se encontró token de acceso");
        alert("⚠️ Sesión expirada o no iniciada. Iniciá sesión nuevamente.");
        window.location.replace("login.html");
        return;
    }

    /*************************************************
     * 🌐 SERVER URL (Consistente con conexion.js)
     *************************************************/
    // Usamos la función global definida en conexion.js para evitar conflictos
    const serverUrl = typeof window.getServerUrl === "function" 
        ? window.getServerUrl() 
        : window.location.origin;

    console.log("🌐 Conectando Socket a:", serverUrl);
    setBootStatus("Verificando lanzamiento...");
    await initLaunchCountdown();
    setBootStatus("Conectando con el servidor...");

    /*************************************************
     * 🔌 SOCKET INICIALIZADO
     *************************************************/
    const socket = initSocket(serverUrl, token);
    initDriverStatus(socket);

    if (socket.connected) {
        mostrarAppConectada();
    }

    socket.once("connect", () => {
        setBootStatus("Conectado.");
        mostrarAppConectada();
    });

    socket.on("connect_error", (err) => {
        setBootStatus("No se pudo conectar. Reintentando...");
        console.error("Error de conexion inicial:", err?.message || err);
    });

    setTimeout(() => {
        if (socket.connected) {
            mostrarAppConectada();
        } else {
            setBootStatus("La conexion esta tardando. Seguimos reintentando...");
        }
    }, 12000);

    /*************************************************
     * 🎯 UI ELEMENTS
     *************************************************/
    const uiElements = {
        btnIniciar:   document.getElementById("btnIniciarViaje"),
        btnFinalizar: document.getElementById("btnFinalizar"),
        btnLlegue:    document.getElementById("btnLlegue"),
        estadoBox:    document.getElementById("estadoViaje")
    };

    /*************************************************
     * 🔥 INICIALIZAR MÓDULOS
     *************************************************/
    try {
        initMap();
        initGPS(socket);
        initViajeControl(socket, uiElements);
        initDriverChat(socket);
        initOferta(socket);
        initViajeInicio(socket);
        initViajeFinalizar(socket);
        initDriverSpa();

        // Actualizar nombre en la interfaz si existe
        const driverName = document.getElementById("driverName");
        // Aquí podrías cargar el nombre desde localStorage si lo guardaste en el login
        // driverName.innerText = localStorage.getItem("nombre") || "Motorista";

        console.log("✅ Todos los módulos de Motorista inicializados");
    } catch (error) {
        console.error("❌ Error inicializando módulos:", error);
    }

    /*************************************************
     * 📱 SIDEBAR & UI GLOBAL
     *************************************************/
    window.toggleMenu = function () {
        const sidebar = document.getElementById("sidebar");
        const backdrop = document.getElementById("backdrop");
        
        if (sidebar && backdrop) {
            sidebar.classList.toggle("active");
            backdrop.classList.toggle("active");
        }
    };
    
    
    let audioUnlocked = false;
    
    function unlockAudio() {
        if (audioUnlocked) return;
        
        const audio = new Audio();
        audio.play().catch(() => {});
        audioUnlocked = true;
        
        console.log("🔓 Audio desbloqueado");
        
        // 🔥 Si hay panel visible, reproducir sonido ahora
        const panel = document.getElementById("panelOferta");
        
        if (panel && !panel.classList.contains("hidden")) {
            iniciarSonidoOfertaLoop();
        }
    }
    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });
});
