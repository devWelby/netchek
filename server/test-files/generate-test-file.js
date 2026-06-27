const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const fileName = '100mb.dat';
const filePath = path.join(__dirname, fileName);

console.log(`Gerando arquivo de teste de ${FILE_SIZE / (1024 * 1024)}MB...`);

const buffer = Buffer.alloc(FILE_SIZE);
crypto.randomFillSync(buffer);

fs.writeFileSync(filePath, buffer);

console.log(`✅ Arquivo gerado em: ${filePath}`);
