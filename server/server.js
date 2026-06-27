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
    next();
});

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

    // Default 100MB, mas permite configuração por query string (ex: ?size=52428800)
    const requestedSize = parseInt(req.query.size) || (100 * 1024 * 1024); 
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

// WebSocket para medição de Ping/Latência
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
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
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para visualizar a aplicação.`);
});
