/**
 * Network Test Engine
 * Executa testes de ping via WebSocket e testes paralelos de download/upload.
 */
window.NetworkTest = (function() {
    let ws;
    let isRunning = false;
    let dataLog = []; // [{ time, ping, download, upload, packetLoss }]
    
    let pingHistory = [];
    let sentPings = 0;
    let lostPings = 0;
    let currentPing = 0;
    let packetLoss = 0;
    
    let downloadSpeed = 0;
    let uploadSpeed = 0;
    
    let downloadAborts = [];
    let uploadAborts = [];
    
    let updateInterval;
    let startTime;
    
    // Configurações (Ajuste para o servidor de produção)
    // Para teste local, assumindo backend na porta 3000
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : '';
        
    const WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'ws://localhost:3000/ws/ping'
        : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/ping`;

    const DOWNLOAD_URL = `${API_BASE}/api/test/download`;
    const UPLOAD_URL = `${API_BASE}/api/test/upload`;

    // DOM Elements para Live Update
    const liveDownload = document.getElementById('liveDownload');
    const liveUpload = document.getElementById('liveUpload');
    const livePing = document.getElementById('livePing');
    const livePacketLoss = document.getElementById('livePacketLoss');

    async function start(durationSeconds) {
        isRunning = true;
        dataLog = [];
        pingHistory = [];
        sentPings = 0;
        lostPings = 0;
        packetLoss = 0;
        downloadSpeed = 0;
        uploadSpeed = 0;
        downloadAborts = [];
        uploadAborts = [];
        startTime = Date.now();

        window.UI.updateStatus('Conectando WebSocket para medição de latência...');
        await initWebSocket();
        
        window.UI.updateStatus('Iniciando Testes de Tráfego...');
        startPingLoop();
        startDownloadTest();
        startUploadTest();
        
        // Loop de atualização da UI a cada 500ms
        updateInterval = setInterval(updateLiveMetrics, 500);
    }

    async function stop() {
        isRunning = false;
        clearInterval(updateInterval);
        
        // Fechar WebSocket
        if (ws) {
            ws.close();
        }
        
        // Abortar requisições pendentes
        downloadAborts.forEach(controller => controller.abort());
        uploadAborts.forEach(controller => controller.abort());
        
        // Calcular Resultados
        const results = calculateFinalResults();
        return results;
    }

    function initWebSocket() {
        return new Promise((resolve, reject) => {
            ws = new WebSocket(WS_URL);
            
            ws.onopen = () => {
                resolve();
            };
            
            ws.onerror = (err) => {
                console.error("WebSocket Error: ", err);
                // Fallback graceful se não conseguir conectar
                resolve(); 
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') {
                        const rtt = Date.now() - data.timestamp;
                        currentPing = rtt;
                        pingHistory.push(rtt);
                    }
                } catch(e) {}
            };
        });
    }

    function startPingLoop() {
        // Envia ping a cada 100ms
        const pingInterval = setInterval(() => {
            if (!isRunning) {
                clearInterval(pingInterval);
                return;
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                sentPings++;
                ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                
                // Checar packet loss simples: se enviamos X mas recebemos menos de X (com uma margem de atraso)
                // Atualizado em updateLiveMetrics
            }
        }, 100);
    }

    function startDownloadTest() {
        // Iniciar múltiplas threads de download
        const numThreads = 4;
        for (let i = 0; i < numThreads; i++) {
            downloadWorker();
        }
    }
    
    async function downloadWorker() {
        if (!isRunning) return;
        
        const controller = new AbortController();
        downloadAborts.push(controller);
        
        try {
            const startReqTime = Date.now();
            const response = await fetch(`${DOWNLOAD_URL}?t=${Date.now()}`, { 
                signal: controller.signal,
                cache: 'no-store'
            });
            
            if (!response.ok) throw new Error("Network err");
            
            const reader = response.body.getReader();
            let receivedLength = 0;
            
            while (isRunning) {
                const {done, value} = await reader.read();
                if (done) break;
                receivedLength += value.length;
                
                // Calcular mbps instantâneo simples
                // Consideramos que chunk arrive em X ms
                const timeElapsed = (Date.now() - startReqTime) / 1000; // segundos
                if (timeElapsed > 0) {
                    const bitsLoaded = receivedLength * 8;
                    // Media suave da thread
                    const threadSpeed = (bitsLoaded / timeElapsed) / 1000000; // Mbps
                    // Acumulado global simplificado
                    downloadSpeed = downloadSpeed * 0.8 + threadSpeed * 0.2; 
                }
            }
        } catch (err) {
            // Se abortado ou erro de rede, apenas tenta de novo se rodando
        }
        
        // Loop infinito enquanto durar o teste
        if (isRunning) {
            setTimeout(downloadWorker, 100);
        }
    }

    function startUploadTest() {
        const numThreads = 2;
        for (let i = 0; i < numThreads; i++) {
            uploadWorker();
        }
    }

    async function uploadWorker() {
        if (!isRunning) return;
        
        const controller = new AbortController();
        uploadAborts.push(controller);
        
        // Gerar payload aleatório (~2MB)
        const payloadSize = 2 * 1024 * 1024;
        const payload = new Uint8Array(payloadSize);
        for(let i=0; i<payloadSize; i++) payload[i] = Math.floor(Math.random() * 256);
        
        try {
            const startReqTime = Date.now();
            await fetch(`${UPLOAD_URL}?t=${Date.now()}`, {
                method: 'POST',
                body: payload,
                signal: controller.signal
            });
            
            const timeElapsed = (Date.now() - startReqTime) / 1000;
            if (timeElapsed > 0) {
                const bitsSent = payloadSize * 8;
                const threadSpeed = (bitsSent / timeElapsed) / 1000000;
                uploadSpeed = uploadSpeed * 0.8 + threadSpeed * 0.2;
            }
            
        } catch(err) {}
        
        if (isRunning) {
            setTimeout(uploadWorker, 100);
        }
    }

    function updateLiveMetrics() {
        // Atualizar estimativa de packet loss
        const expectedResponses = sentPings - 5; // Margem de delay
        if (expectedResponses > 0) {
            lostPings = Math.max(0, expectedResponses - pingHistory.length);
            packetLoss = (lostPings / expectedResponses) * 100;
        }

        const dataPoint = {
            time: ((Date.now() - startTime) / 1000).toFixed(1),
            ping: currentPing || 0,
            download: downloadSpeed > 0 ? downloadSpeed.toFixed(2) : 0,
            upload: uploadSpeed > 0 ? uploadSpeed.toFixed(2) : 0,
            packetLoss: packetLoss
        };

        dataLog.push(dataPoint);
        
        // Update DOM
        if (liveDownload) liveDownload.innerHTML = `${dataPoint.download} <small>Mbps</small>`;
        if (liveUpload) liveUpload.innerHTML = `${dataPoint.upload} <small>Mbps</small>`;
        if (livePing) livePing.innerHTML = `${dataPoint.ping} <small>ms</small>`;
        if (livePacketLoss) livePacketLoss.innerHTML = `${dataPoint.packetLoss.toFixed(1)} <small>%</small>`;

        // Update Chart
        if (window.NetChart) {
            window.NetChart.update(dataPoint);
        }
    }

    function calculateFinalResults() {
        // Calcular médias
        let dAvg = 0, uAvg = 0, dMax = 0, uMax = 0;
        
        if (dataLog.length > 0) {
            const downloads = dataLog.map(d => parseFloat(d.download));
            const uploads = dataLog.map(d => parseFloat(d.upload));
            
            dMax = Math.max(...downloads);
            uMax = Math.max(...uploads);
            
            // Ignora os primeiros 20% do teste (ramp up)
            const validD = downloads.slice(Math.floor(downloads.length * 0.2));
            const validU = uploads.slice(Math.floor(uploads.length * 0.2));
            
            dAvg = validD.length ? validD.reduce((a,b)=>a+b,0) / validD.length : 0;
            uAvg = validU.length ? validU.reduce((a,b)=>a+b,0) / validU.length : 0;
        }

        // Ping Math
        let pMin = 0, pMax = 0, pAvg = 0, pJitter = 0, bufferbloat = 'Baixo';
        
        if (pingHistory.length > 0) {
            pMin = Math.min(...pingHistory);
            pMax = Math.max(...pingHistory);
            pAvg = pingHistory.reduce((a,b)=>a+b,0) / pingHistory.length;
            
            // Jitter: Média da diferença absoluta entre pings consecutivos
            let diffs = [];
            for(let i=1; i<pingHistory.length; i++){
                diffs.push(Math.abs(pingHistory[i] - pingHistory[i-1]));
            }
            pJitter = diffs.length ? diffs.reduce((a,b)=>a+b,0) / diffs.length : 0;
            
            // Bufferbloat Estimation (Simplificada)
            // Se o ping máximo sob carga (durante down/up) for muito maior que o mínimo
            const loadDiff = pMax - pMin;
            if (loadDiff > 100) bufferbloat = 'Alto';
            else if (loadDiff > 40) bufferbloat = 'Moderado';
        }

        return {
            download: { avg: dAvg, max: dMax },
            upload: { avg: uAvg, max: uMax },
            ping: { min: pMin, max: pMax, avg: pAvg, jitter: pJitter },
            packetLoss: packetLoss,
            bufferbloat: bufferbloat,
            dataLog: dataLog
        };
    }

    return {
        start,
        stop
    };
})();
