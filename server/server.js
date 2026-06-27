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

// Garantir que existe um arquivo de teste de 100MB
const testFilePath = path.join(__dirname, 'test-files', '100mb.dat');
if (!fs.existsSync(testFilePath)) {
    console.warn("⚠️ Arquivo de teste não encontrado. Crie usando o script generate-test-file.js");
}

// Endpoint de Download
app.get('/api/test/download', (req, res) => {
    // Para um teste leve (se o arquivo não existir), envia buffer na memória
    if (fs.existsSync(testFilePath)) {
        res.download(testFilePath);
    } else {
        res.setHeader('Content-Type', 'application/octet-stream');
        const buffer = Buffer.alloc(10 * 1024 * 1024); // 10MB fallback
        res.send(buffer);
    }
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
