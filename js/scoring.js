(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.NetCheckScoring = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function calculateGameplayScore(results, profile) {
        let score = 100;

        const profileMultiplier = {
            competitivo: 1.15,
            streaming: 0.95,
            casual: 0.9
        }[profile] || 1;

        if (results.ping.avg > 100) score -= 32 * profileMultiplier;
        else if (results.ping.avg > 60) score -= 16 * profileMultiplier;
        else if (results.ping.avg > 35) score -= 8 * profileMultiplier;

        if (results.packetLoss > 5) score -= 35 * profileMultiplier;
        else if (results.packetLoss > 1) score -= 18 * profileMultiplier;

        if (results.ping.jitter > 30) score -= 20 * profileMultiplier;
        else if (results.ping.jitter > 15) score -= 10 * profileMultiplier;

        if (results.bufferbloat === 'Alto') score -= 20 * profileMultiplier;
        else if (results.bufferbloat === 'Moderado') score -= 8 * profileMultiplier;

        if (results.download.avg < 20) score -= 6 * profileMultiplier;
        if (results.upload.avg < 10) score -= 6 * profileMultiplier;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function getReadinessLabel(score) {
        if (score >= 90) return 'Pronto para competir';
        if (score >= 75) return 'Boa estabilidade';
        if (score >= 55) return 'Requer ajustes';
        return 'Performance limitada';
    }

    function getProfileLabel(profile) {
        const labels = {
            competitivo: 'Competitivo',
            streaming: 'Streaming',
            casual: 'Casual'
        };
        return labels[profile] || 'Geral';
    }

    return {
        calculateGameplayScore,
        getReadinessLabel,
        getProfileLabel
    };
}));
