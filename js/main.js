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
    
    // Loop de tempo
    testInterval = setInterval(() => {
        remainingTime--;
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
    
    // Scroll para resultados
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Expor para outros módulos
window.UI = {
    updateStatus
};
