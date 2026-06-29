// Gerenciamento de Tema
const themeToggleBtn = document.getElementById('themeToggle');
const body = document.body;

// Carregar tema salvo ou usar o dark por padrão
const savedTheme = localStorage.getItem('theme') || 'theme-dark';
body.className = savedTheme;

themeToggleBtn.addEventListener('click', () => {
    if (body.classList.contains('theme-dark')) {
        body.classList.replace('theme-dark', 'theme-light');
        localStorage.setItem('theme', 'theme-light');
    } else {
        body.classList.replace('theme-light', 'theme-dark');
        localStorage.setItem('theme', 'theme-dark');
    }
});

// Elementos de UI
const startBtn = document.getElementById('startBtn');
const testDurationSelect = document.getElementById('testDuration');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const statusText = document.getElementById('statusText');
const timeRemaining = document.getElementById('timeRemaining');
const liveDashboard = document.getElementById('liveDashboard');
const resultsSection = document.getElementById('resultsSection');

// Estado global do teste
let isTestRunning = false;
let testInterval;
let remainingTime = 0;
let totalTime = 0;

// Inicializar teste
startBtn.addEventListener('click', async () => {
    if (isTestRunning) return;
    
    totalTime = parseInt(testDurationSelect.value, 10);
    remainingTime = totalTime;
    
    // UI Updates
    startBtn.disabled = true;
    startBtn.innerText = 'TESTE EM ANDAMENTO...';
    testDurationSelect.disabled = true;
    resultsSection.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    liveDashboard.classList.remove('hidden');
    
    progressFill.style.width = '0%';
    
    // Iniciar Módulos (Definidos nos outros arquivos)
    if (window.NetChart) window.NetChart.init();
    if (window.NetworkTest) await window.NetworkTest.start(totalTime);
    
    isTestRunning = true;
    
    // Loop de tempo usando timestamp delta para evitar throttle do Chrome
    const endTime = Date.now() + (totalTime * 1000);
    testInterval = setInterval(() => {
        remainingTime = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        
        const progressPercent = ((totalTime - remainingTime) / totalTime) * 100;
        progressFill.style.width = `${progressPercent}%`;
        timeRemaining.innerText = `Tempo restante: ${remainingTime}s`;
        
        if (remainingTime <= 0) {
            finishTest();
        }
    }, 1000);
});

function updateStatus(message) {
    if (statusText) statusText.innerText = message;
}

async function finishTest() {
    isTestRunning = false;
    clearInterval(testInterval);
    
    startBtn.disabled = false;
    startBtn.innerText = 'INICIAR TESTE COMPLETO';
    testDurationSelect.disabled = false;
    progressFill.style.width = '100%';
    timeRemaining.innerText = 'Concluído!';
    
    // Parar Módulos
    let testResults = {};
    if (window.NetworkTest) {
        testResults = await window.NetworkTest.stop();
    }
    
    // Esconder dashboard live e mostrar resultados
    liveDashboard.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    // Gerar Relatório (Definido em report-generator.js)
    if (window.ReportGenerator) {
        window.ReportGenerator.generate(testResults);
    }
    
    saveTestToHistory(testResults);
    
    // Scroll para resultados
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Expor para outros módulos
window.UI = {
    updateStatus
};

// --- Histórico de Testes ---
const historyGrid = document.getElementById('historyGrid');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function loadHistory() {
    if (!historyGrid) return;
    const history = JSON.parse(localStorage.getItem('netchek_history') || '[]');
    historyGrid.innerHTML = '';
    
    if (history.length === 0) {
        historyGrid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center;">Nenhum teste anterior encontrado.</p>';
        if(clearHistoryBtn) clearHistoryBtn.style.display = 'none';
        return;
    }
    
    if(clearHistoryBtn) clearHistoryBtn.style.display = 'block';

    history.forEach(item => {
        const date = new Date(item.date).toLocaleString('pt-BR');
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <h4>${date}</h4>
            <p>Ping: <strong>${item.ping.avg.toFixed(1)}ms</strong></p>
            <p>Download: <strong>${item.download.avg.toFixed(1)} Mbps</strong></p>
            <p>Upload: <strong>${item.upload.avg.toFixed(1)} Mbps</strong></p>
            <p>Bufferbloat: <span class="grade">${item.bufferbloat}</span></p>
        `;
        historyGrid.appendChild(card);
    });
}

function saveTestToHistory(results) {
    let history = JSON.parse(localStorage.getItem('netchek_history') || '[]');
    // Adiciona no topo
    history.unshift({
        date: new Date().toISOString(),
        ping: results.ping,
        download: results.download,
        upload: results.upload,
        bufferbloat: results.bufferbloat
    });
    // Manter apenas os últimos 5
    if (history.length > 5) history.pop();
    
    localStorage.setItem('netchek_history', JSON.stringify(history));
    loadHistory();
}

if(clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('netchek_history');
        loadHistory();
    });
}

// Inicializar histórico
loadHistory();

// --- FAQ Accordion ---
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Fechar todos
        faqItems.forEach(faq => faq.classList.remove('active'));
        
        // Abrir o clicado, se não estava ativo
        if (!isActive) {
            item.classList.add('active');
        }
    });
});
