const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/ping' });

const PORT = process.env.PORT || 3000;

// Segurança: CORS restrito (em prod, mudar para o domínio específico)
app.use(cors({
    origin: '*', // Para testes locais. Em prod: 'https://seusite.com'
    methods: ['GET', 'POST']
}));

// Headers de Segurança Adicionais
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Strict-Transport-Security (HSTS) para forçar conexões seguras
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Content-Security-Policy básica (Impede injeção de scripts externos desconhecidos)
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://pagead2.googlesyndication.com https://via.placeholder.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pagead2.googlesyndication.com https://partner.googleadservices.com; frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; connect-src 'self' https://via.placeholder.com wss://netchek.onrender.com ws://localhost:3000 wss://localhost:3000 https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://pagead2.googlesyndication.com;");
    
    next();
});

// Confiar no proxy do Render para o Rate Limit funcionar com IPs reais
app.set('trust proxy', 1);

// Rate Limiting para Upload/Download (evitar abuso)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Limite de 1000 requests por IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Servir frontend estático a partir do diretório raiz do projeto (um nível acima)
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

const crypto = require('crypto');

// Endpoint de Download dinâmico na memória (Sem I/O de disco)
app.get('/api/test/download', (req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Validação estrita do tamanho do arquivo gerado para evitar Memory/CPU DoS via query parameters
    const MAX_SIZE = 500 * 1024 * 1024; // Máximo de 500MB
    const MIN_SIZE = 1024; // Mínimo de 1KB
    const rawSize = parseInt(req.query.size, 10);
    const requestedSize = (rawSize >= MIN_SIZE && rawSize <= MAX_SIZE) ? rawSize : (100 * 1024 * 1024);
 
    const chunkSize = 1024 * 1024; // 1MB chunks para não sobrecarregar a RAM
    
    res.setHeader('Content-Length', requestedSize);

    let bytesSent = 0;
    // Pré-gera um chunk randomico para não gastar CPU durante o loop
    const chunk = crypto.randomBytes(chunkSize);

    function streamData() {
        let canWrite = true;
        while (canWrite && bytesSent < requestedSize) {
            let writeSize = Math.min(chunkSize, requestedSize - bytesSent);
            let writeChunk = writeSize === chunkSize ? chunk : chunk.subarray(0, writeSize);
            canWrite = res.write(writeChunk);
            bytesSent += writeSize;
        }

        if (bytesSent < requestedSize) {
            // Aguarda o buffer do express esvaziar antes de escrever mais
            res.once('drain', streamData);
        } else {
            res.end();
        }
    }

    req.on('close', () => {
        // Interrompe se o cliente cancelar
        bytesSent = requestedSize; 
    });

    streamData();
});

// Endpoint de Upload
// Lida com payload grande diretamente
app.post('/api/test/upload', (req, res) => {
    let size = 0;
    req.on('data', chunk => {
        size += chunk.length;
    });
    req.on('end', () => {
        res.json({ success: true, bytesReceived: size });
    });
    req.on('error', (err) => {
        console.error(err);
        res.status(500).send("Upload error");
    });
});

// WebSocket para medição de Ping/Latência com validação básica de Origin
wss.on('connection', (ws, req) => {
    
    // Validação rudimentar de Origin para impedir bots genéricos em páginas de terceiros
    const origin = req.headers.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('netchek.onrender.com')) {
        // Encerra a conexão se a origin for suspeita
        ws.close(1008, "Origin not allowed");
        return;
    }

    // Rate Limiting Básico em Memória por WS connection
    let pingCount = 0;
    const rateLimitInterval = setInterval(() => { pingCount = 0; }, 1000);

    ws.on('message', (message) => {
        pingCount++;
        // Limita a 20 pings por segundo por cliente
        if (pingCount > 20) {
            return; // Ignora pacotes de flood silenciosamente
        }

        try {
            const data = JSON.parse(message);
            if (data.type === 'ping') {
                // Responde imediatamente com o mesmo timestamp
                ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp }));
            }
        } catch (e) {
            console.error('Invalid WS message', e);
        }
    });

    ws.on('close', () => {
        clearInterval(rateLimitInterval);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para visualizar a aplicação.`);
});
