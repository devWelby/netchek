/**
 * Report Generator
 * Preenche a UI com os dados finais, gera texto diagnóstico, e exporta PDF.
 */
window.ReportGenerator = (function() {
    
    // Elements
    const resDownloadAvg = document.getElementById('resDownloadAvg');
    const resDownloadMax = document.getElementById('resDownloadMax');
    const resUploadAvg = document.getElementById('resUploadAvg');
    const resUploadMax = document.getElementById('resUploadMax');
    
    const resPingMin = document.getElementById('resPingMin');
    const resPingAvg = document.getElementById('resPingAvg');
    const resPingMax = document.getElementById('resPingMax');
    const resPingJitter = document.getElementById('resPingJitter');
    
    const resJitterAvg = document.getElementById('resJitterAvg');
    const resPacketLoss = document.getElementById('resPacketLoss');
    const resBufferbloat = document.getElementById('resBufferbloat');
    
    const overallGrade = document.getElementById('overallGrade');
    const diagnosticText = document.getElementById('diagnosticText');
    const recommendationsList = document.getElementById('recommendationsList');
    
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const copyReportBtn = document.getElementById('copyReportBtn');

    let lastResults = null;

    function generate(results) {
        lastResults = results;
        
        // Popular UI de Métricas
        resDownloadAvg.innerText = results.download.avg.toFixed(1);
        resDownloadMax.innerText = results.download.max.toFixed(1);
        resUploadAvg.innerText = results.upload.avg.toFixed(1);
        resUploadMax.innerText = results.upload.max.toFixed(1);
        
        resPingMin.innerText = results.ping.min.toFixed(1);
        resPingAvg.innerText = results.ping.avg.toFixed(1);
        resPingMax.innerText = results.ping.max.toFixed(1);
        resPingJitter.innerText = results.ping.jitter.toFixed(1);
        
        resJitterAvg.innerText = results.ping.jitter.toFixed(1);
        resPacketLoss.innerText = results.packetLoss.toFixed(2);
        resBufferbloat.innerText = results.bufferbloat;

        // Colorir Bufferbloat
        resBufferbloat.style.color = 
            results.bufferbloat === 'Alto' ? 'var(--danger)' : 
            results.bufferbloat === 'Moderado' ? 'var(--warning)' : 'var(--success)';
            
        // Gerar Grade
        const grade = calculateGrade(results);
        overallGrade.innerHTML = `<span>${grade}</span>`;
        overallGrade.style.borderColor = getGradeColor(grade);
        overallGrade.style.color = getGradeColor(grade);
        overallGrade.style.boxShadow = `0 0 20px ${getGradeColor(grade)}40`;

        // Gerar Diagnóstico Textual e Recomendações
        generateTextualAnalysis(results, grade);
    }

    function calculateGrade(r) {
        let score = 100;
        
        // Penalidade Latência
        if (r.ping.avg > 100) score -= 30;
        else if (r.ping.avg > 60) score -= 15;
        
        // Penalidade Packet Loss (Crítico)
        if (r.packetLoss > 5) score -= 40;
        else if (r.packetLoss > 1) score -= 20;
        
        // Penalidade Jitter
        if (r.ping.jitter > 30) score -= 20;
        else if (r.ping.jitter > 15) score -= 10;
        
        // Penalidade Bufferbloat
        if (r.bufferbloat === 'Alto') score -= 25;
        else if (r.bufferbloat === 'Moderado') score -= 10;
        
        if (score >= 95) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 70) return 'B';
        if (score >= 50) return 'C';
        if (score >= 30) return 'D';
        return 'F';
    }

    function getGradeColor(grade) {
        if (grade.startsWith('A')) return '#2ecc71';
        if (grade === 'B') return '#00d2ff';
        if (grade === 'C') return '#f1c40f';
        if (grade === 'D') return '#e67e22';
        return '#e74c3c';
    }

    function generateTextualAnalysis(r, grade) {
        diagnosticText.innerHTML = '';
        recommendationsList.innerHTML = '';
        
        const addDiag = (text) => {
            const li = document.createElement('li');
            li.innerHTML = text;
            diagnosticText.appendChild(li);
        };
        const addRec = (text) => {
            const li = document.createElement('li');
            li.innerHTML = text;
            recommendationsList.appendChild(li);
        };

        // Latência
        if (r.ping.avg < 30) {
            addDiag('✅ Sua latência base é excelente para jogos competitivos.');
        } else if (r.ping.avg < 80) {
            addDiag('⚠️ Sua latência é aceitável, mas pode colocar você em desvantagem no CS2.');
            addRec('Tente conectar-se em servidores mais próximos da sua região.');
        } else {
            addDiag('❌ Latência alta detectada. Isso causa atraso nos tiros e movimentação.');
            addRec('Se estiver no Wi-Fi, conecte um cabo de rede (Ethernet) imediatamente.');
        }

        // Bufferbloat
        if (r.bufferbloat === 'Alto') {
            addDiag('❌ <b>Bufferbloat Alto:</b> Sua rede engasga severamente quando há downloads ou uploads simultâneos na casa.');
            addRec('Ative QoS (Quality of Service) ou SQM nas configurações do seu roteador.');
            addRec('Limite temporariamente downloads em outros dispositivos enquanto joga.');
        } else if (r.bufferbloat === 'Moderado') {
            addDiag('⚠️ <b>Bufferbloat Moderado:</b> Pequenos picos de lag podem ocorrer se alguém na casa usar muita banda.');
        } else {
            addDiag('✅ <b>Bufferbloat Baixo:</b> Sua conexão lida bem com carga e não sofre lag por congestionamento.');
        }

        // Packet Loss
        if (r.packetLoss > 1) {
            addDiag(`❌ <b>Perda de pacotes de ${r.packetLoss.toFixed(1)}%:</b> Crítico para FPS. Causa "teleportes" e tiros não registrados.`);
            addRec('Verifique a integridade do cabeamento ou contate seu provedor com este relatório.');
        } else {
            addDiag('✅ Nenhuma perda significativa de pacotes detectada.');
        }
        
        // Geral
        if (grade.startsWith('A')) {
            addRec('Sua conexão está otimizada. Configure o rate do CS2 para máxima performance (rate 786432).');
        }
    }

    // Exportar para PDF
    exportPdfBtn.addEventListener('click', async () => {
        exportPdfBtn.innerText = "Gerando...";
        exportPdfBtn.disabled = true;
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const element = document.getElementById('pdfReportContent');
            
            // Usar fundo branco para o PDF para melhor leitura
            const originalBg = element.style.background;
            element.style.background = '#fff';
            element.style.color = '#000';
            
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            element.style.background = originalBg;
            element.style.color = '';
            
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            doc.text("Relatório NetChek Diagnostics", 10, 10);
            doc.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
            
            // Adicionar diagnósticos em texto
            doc.addPage();
            doc.text("Diagnóstico Técnico", 10, 10);
            const diagLines = doc.splitTextToSize(diagnosticText.innerText, 190);
            doc.text(diagLines, 10, 20);
            
            doc.text("Recomendações", 10, 100);
            const recLines = doc.splitTextToSize(recommendationsList.innerText, 190);
            doc.text(recLines, 10, 110);
            
            doc.save('netchek-report.pdf');
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar PDF.");
        } finally {
            exportPdfBtn.innerText = "📄 Baixar PDF";
            exportPdfBtn.disabled = false;
        }
    });

    // Copiar para área de transferência (Markdown)
    copyReportBtn.addEventListener('click', () => {
        if (!lastResults) return;
        
        const text = `
**NetChek Diagnostics - Relatório**
- Grade: ${overallGrade.innerText}
- Ping: ${lastResults.ping.avg.toFixed(1)}ms (Jitter: ${lastResults.ping.jitter.toFixed(1)}ms)
- Packet Loss: ${lastResults.packetLoss.toFixed(2)}%
- Bufferbloat: ${lastResults.bufferbloat}
- Download: ${lastResults.download.avg.toFixed(1)} Mbps
- Upload: ${lastResults.upload.avg.toFixed(1)} Mbps
        `.trim();
        
        navigator.clipboard.writeText(text).then(() => {
            const original = copyReportBtn.innerText;
            copyReportBtn.innerText = "Copiado!";
            setTimeout(() => copyReportBtn.innerText = original, 2000);
        });
    });

    return {
        generate
    };
})();
