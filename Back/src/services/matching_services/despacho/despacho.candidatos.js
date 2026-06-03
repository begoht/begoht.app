const { redis } = require("../../../config/redis");

async function ordenarCandidatosPorDistancia(candidatos) {
    try {
        if (!Array.isArray(candidatos) || !candidatos.length) {
            console.log("⚠️ Sin candidatos para ordenar");
            return [];
        }

        // 🔥 Ya NO usamos Redis para distancia (ya viene desde GEO)
        const data = candidatos.map(c => {
            const id = typeof c === "string" ? c : c.id;

            let dist = parseFloat(c.dist ?? c.km ?? 999);
            if (isNaN(dist)) dist = 999;

            return {
                id,           // 🔥 siempre string limpio
                dist,         // distancia real
                km: dist,     // alias para compatibilidad
                score: c.score ?? dist,
                raw: c        // opcional para debug
            };
        });

        // 🧠 Orden por distancia real
        data.sort((a, b) => (a.score - b.score) || (a.km - b.km));

        console.log("📊 Orden final candidatos:", data);

        return data;

    } catch (err) {
        console.error("❌ Error ordenando candidatos:", err);
        return [];
    }
}

module.exports = { ordenarCandidatosPorDistancia };
