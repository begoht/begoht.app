const DEBUG = true;

function generarWaves(candidatosOrdenados) {
    const waves = [];

    if (!Array.isArray(candidatosOrdenados) || !candidatosOrdenados.length) {
        console.warn("⚠️ Sin candidatos");
        return waves;
    }

    const valid = candidatosOrdenados.filter(c => c?.id);

    if (DEBUG) {
        console.log("🧠 Generando waves...");
        console.log("📊 Candidatos:", valid.map(c => ({
            id: c.id,
            km: c.dist,
            score: c.score
        })));
    }

    // 🥇 1
    if (valid[0]) {
        const wave1 = [valid[0].id];
        waves.push(wave1);
        console.log("🥇 Wave 1:", wave1);
    }

    // 🥈 2
    if (valid.length > 1) {
        const wave2 = valid.slice(1, 3).map(c => c.id);
        if (wave2.length) {
            waves.push(wave2);
            console.log("🥈 Wave 2:", wave2);
        }
    }

    // 🥉 resto
    if (valid.length > 3) {
        const wave3 = valid.slice(3).map(c => c.id);
        if (wave3.length) {
            waves.push(wave3);
            console.log("🥉 Wave 3:", wave3);
        }
    }

    console.log("📦 Waves finales:", waves);

    return waves;
}

module.exports = { generarWaves };