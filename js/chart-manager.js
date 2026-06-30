/**
 * Chart Manager
 * Gerencia a renderização e atualização do gráfico Chart.js
 */
window.NetChart = (function() {
    let chartInstance = null;
    const ctx = document.getElementById('liveChart');

    // Estilos baseados no tema CSS via getComputedStyle
    let colors = getThemeColors();

    function getThemeColors() {
        const style = getComputedStyle(document.body);
        return {
            primary: style.getPropertyValue('--primary-color').trim(),
            secondary: style.getPropertyValue('--secondary-color').trim(),
            danger: style.getPropertyValue('--danger').trim(),
            text: style.getPropertyValue('--text-main').trim(),
            grid: style.getPropertyValue('--border-color').trim(),
        };
    }

    function init() {
        if (!ctx) return;
        
        // Atualiza cores baseado no tema atual
        colors = getThemeColors();

        if (chartInstance) {
            chartInstance.destroy();
        }

        const gradientDownload = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradientDownload.addColorStop(0, colors.primary + '60');
        gradientDownload.addColorStop(1, colors.primary + '00');

        const gradientUpload = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradientUpload.addColorStop(0, colors.secondary + '60');
        gradientUpload.addColorStop(1, colors.secondary + '00');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Download (Mbps)',
                        data: [],
                        borderColor: colors.primary,
                        backgroundColor: gradientDownload,
                        fill: true,
                        yAxisID: 'yBandwidth',
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Upload (Mbps)',
                        data: [],
                        borderColor: colors.secondary,
                        backgroundColor: gradientUpload,
                        fill: true,
                        yAxisID: 'yBandwidth',
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Ping (ms)',
                        data: [],
                        borderColor: colors.danger,
                        backgroundColor: 'transparent',
                        yAxisID: 'yPing',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                animation: {
                    duration: 400,
                    easing: 'easeOutQuart'
                },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Tempo (s)', color: colors.text },
                        grid: { color: colors.grid },
                        ticks: { color: colors.text }
                    },
                    yBandwidth: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Banda (Mbps)', color: colors.text },
                        grid: { color: colors.grid },
                        ticks: { color: colors.text },
                        min: 0
                    },
                    yPing: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Latência (ms)', color: colors.text },
                        grid: { drawOnChartArea: false }, // não sobrepor grids
                        ticks: { color: colors.text },
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: colors.text }
                    }
                }
            }
        });
    }

    function update(dataPoint) {
        if (!chartInstance) return;

        const { time, ping, download, upload } = dataPoint;

        chartInstance.data.labels.push(time);
        chartInstance.data.datasets[0].data.push(download);
        chartInstance.data.datasets[1].data.push(upload);
        chartInstance.data.datasets[2].data.push(ping);

        // Manter máximo de X pontos (opcional, para testes longos pode ser melhor manter tudo e fazer scroll/downsample)
        // Se quisermos mostrar tudo, deixamos crescer.
        
        chartInstance.update();
    }

    // Escutar mudança de tema para recriar gráfico
    document.getElementById('themeToggle').addEventListener('click', () => {
        // Pequeno delay para o DOM atualizar a classe do body
        setTimeout(() => {
            if (chartInstance) {
                // Guarda dados atuais
                const currentData = JSON.parse(JSON.stringify(chartInstance.data));
                init();
                chartInstance.data = currentData;
                chartInstance.update();
            }
        }, 50);
    });

    return {
        init,
        update
    };
})();
