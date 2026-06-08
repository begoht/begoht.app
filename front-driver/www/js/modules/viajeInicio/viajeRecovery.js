import { 
    setEstadoViaje, 
    getViajeEnCursoId, 
    setViajeEnCurso, 
    setViajeReservadoId,
    viajesActivos 
} from "../viajeControl/viajeEstado.js";
import { reconstruirUIDesdeEstado } from "../viajeControl/viajeUI.js?v=20260608-offer-net-cash";
import { getUltimaPosicion } from "../gps.js?v=20260608-gps-accept";
import { redibujarRutaRecovery } from "./viajeInicioUI.js?v=20260606-recenter-map";
let ultimoSyncProcesado = null;
let ultimoSyncTs = 0;
export function initViajeRecovery(socket) {
    if (!socket) return;
    socket.off("sync-viaje");
    
    socket.on("sync-viaje", (data) => {
        if (!data?.viajeId) return;
        
        const ahora = Date.now();
        
        // 🛡️ ANTI DUPLICACIÓN FUERTE
        if (
            ultimoSyncProcesado === data.viajeId &&
            (ahora - ultimoSyncTs < 1500)
        ) {
            console.log("⚠️ Sync duplicado ignorado:", data.viajeId);
            return;
        }
        
        ultimoSyncProcesado = data.viajeId;
        ultimoSyncTs = ahora;
        
        const { viajeId, estado, tipo } = data;
        
        if (estado === "finalizado" || estado === "cancelado") {
            console.log("🛑 Sync terminal. Limpiando...");
            viajesActivos.delete(viajeId);
            
            if (getViajeEnCursoId() === viajeId) {
                setViajeEnCurso(null);
                setEstadoViaje(null);
            }
            
            reconstruirUIDesdeEstado();
            return;
        }
        
        console.log(`♻️ Sync: [${viajeId}] | Estado: ${estado}`);
        
        viajesActivos.set(viajeId, { ...(viajesActivos.get(viajeId) || {}), ...data });

        if (tipo === "reserva") {
            setViajeReservadoId(viajeId);
        } else if (tipo === "principal" || !getViajeEnCursoId()) {
            setViajeEnCurso(viajeId);
            setEstadoViaje(estado);
        }
        
        reconstruirUIDesdeEstado();
        
        const pos = getUltimaPosicion();
        if (pos && viajeId === getViajeEnCursoId()) {
            redibujarRutaRecovery(estado, data, pos);
        }

        if (viajeId.estado === "llego") {
            alert("🚖 Tu motorista ya está afuera");
        }


    });
}
