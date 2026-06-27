# NetGamer Diagnostics

Uma aplicação web completa e leve focada em diagnosticar problemas de rede para jogadores de esportes eletrônicos (como CS2 e Valorant). Ele mede latência em tempo real via WebSockets e testa Download/Upload para calcular Jitter e Bufferbloat, tudo exibido em gráficos usando Chart.js e gerando um relatório em PDF via jsPDF.

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, Vanilla JS (Sem frameworks)
- **Bibliotecas**: Chart.js (Gráficos), jsPDF & html2canvas (Relatórios PDF)
- **Backend (API e WebSocket)**: Node.js, Express, WS
- **Segurança**: Express Rate Limiting, CORS, `.htaccess`
- **PWA**: Manifest e Service Worker inclusos.

## Como Executar Localmente

### 1. Pré-requisitos
Certifique-se de ter o **Node.js** (v14+) instalado em sua máquina.

### 2. Instalar Dependências do Backend
Navegue até a pasta `server` e instale os pacotes:

```bash
cd server
npm install
```

### 3. Gerar o arquivo de teste de rede
Para que o teste de download funcione e force a banda, gere um arquivo dummy de 100MB usando o script incluso:

```bash
npm run generate-file
```

### 4. Iniciar o Servidor
Com as dependências instaladas e o arquivo de teste gerado, inicie o backend:

```bash
npm start
```
O servidor começará a rodar na porta 3000 e também servirá os arquivos estáticos do frontend.

### 5. Acessar a Aplicação
Abra o navegador e acesse:
[http://localhost:3000](http://localhost:3000)

## Estrutura de Arquivos

```
/netgamer-diagnostics
│-- index.html                 # Página principal
│-- /css/style.css             # Estilos gerais
│-- /js/
│   │-- main.js                # Lógica da interface UI
│   │-- network-test.js        # Engine do teste (Fetch + WebSockets)
│   │-- chart-manager.js       # Gráficos em tempo real (Chart.js)
│   │-- report-generator.js    # Avaliação e exportação de relatórios
│   └── monetization.js        # Inicialização do AdSense
│-- /server/
│   │-- server.js              # Backend em Express.js + ws
│   │-- package.json           # Dependências
│   └── /test-files/           # Arquivos de dummy payload
│-- manifest.json              # Configurações de PWA
│-- service-worker.js          # Service Worker
│-- robots.txt                 # SEO/Bloqueios
└── .htaccess                  # Cabeçalhos de segurança (para Apache em prod)
```

## Monetização (AdSense)
Os placeholders já estão definidos no arquivo HTML e gerenciados por `js/monetization.js`. Para habilitá-los em produção:
1. No `index.html`, remova os comentários ao redor dos scripts do AdSense (`<ins class="adsbygoogle"...>`).
2. Adicione seus códigos `client` e `slot`.

## Produção / Deploy
Como o Node.js serve tanto o backend de WebSocket quanto os arquivos estáticos, basta hospedar a pasta do projeto em serviços como Railway, Render ou Heroku. Certifique-se de que a variável de ambiente `PORT` está configurada dinamicamente, o que o `server.js` já suporta.
