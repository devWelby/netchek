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
    const shareWhatsappBtn = document.getElementById('shareWhatsappBtn');
    const shareTwitterBtn = document.getElementById('shareTwitterBtn');
    const profileSelect = document.getElementById('profileSelect');
    const gradeDescription = document.getElementById('gradeDescription');
    const readinessText = document.getElementById('readinessText');

    let lastResults = null;

    function generate(results) {
        lastResults = results;
        const profile = profileSelect ? profileSelect.value : 'competitivo';
        
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
        const score = window.NetCheckScoring ? window.NetCheckScoring.calculateGameplayScore(results, profile) : 0;
        const grade = calculateGrade(results, score);
        overallGrade.innerHTML = `<span>${grade}</span>`;
        overallGrade.style.borderColor = getGradeColor(grade);
        overallGrade.style.color = getGradeColor(grade);
        overallGrade.style.boxShadow = `0 0 20px ${getGradeColor(grade)}40`;

        if (gradeDescription) {
            gradeDescription.innerText = `Avaliação focada em ${window.NetCheckScoring ? window.NetCheckScoring.getProfileLabel(profile) : 'jogos'} e estabilidade de rede.`;
        }

        if (readinessText) {
            readinessText.innerText = `${window.NetCheckScoring ? window.NetCheckScoring.getReadinessLabel(score) : 'Prontidão em análise'} • Score ${score}/100`;
        }

        // Gerar Diagnóstico Textual e Recomendações
        generateTextualAnalysis(results, grade);
        
        // Renderizar Game Radar
        if (results.gameRadar) {
            renderGameRadar(results.gameRadar);
        }
    }

    function calculateGrade(r, scoreOverride) {
        let score = scoreOverride ?? 100;
        
        if (typeof scoreOverride === 'number') {
            return score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';
        }
        
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

    function renderGameRadar(radarData) {
        const grid = document.getElementById('gameRadarGrid');
        if (!grid) return;
        
        grid.innerHTML = ''; // Limpar anterior
        
        radarData.servers.forEach(game => {
            const ping = radarData.latencies[game.id] || 999;
            
            // Lógica de Status
            let statusClass = 'status-bad';
            let statusText = 'Rota Lagada';
            
            if (ping < 40) {
                statusClass = 'status-good';
                statusText = 'Competitivo 🟢';
            } else if (ping < 80) {
                statusClass = 'status-warn';
                statusText = 'Aceitável 🟡';
            } else {
                statusClass = 'status-bad';
                statusText = 'Desvantagem 🔴';
            }
            
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div class="game-icon">${game.icon}</div>
                <div class="game-name">${game.name}</div>
                <div class="game-ping">${ping === 999 ? '--' : ping}<small>ms</small></div>
                <div class="status-badge ${statusClass}">${statusText}</div>
            `;
            grid.appendChild(card);
        });
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
- Upload: ${lastResults.upload.avg.toFixed(1)} Mbps
${lastResults.gameRadar ? '\n**Ping nos Jogos:**\n' + lastResults.gameRadar.servers.map(g => `- ${g.name}: ${lastResults.gameRadar.latencies[g.id]}ms`).join('\n') : ''}
        `.trim();
        
        navigator.clipboard.writeText(text).then(() => {
            const original = copyReportBtn.innerText;
            copyReportBtn.innerText = "Copiado!";
            setTimeout(() => copyReportBtn.innerText = original, 2000);
        });
    });

    // Compartilhar no WhatsApp
    if (shareWhatsappBtn) {
        shareWhatsappBtn.addEventListener('click', () => {
            if (!lastResults) return;
            
            let gameStats = '';
            if (lastResults.gameRadar) {
                gameStats = '\n\n🎮 *Ping nos Jogos:*\n' + lastResults.gameRadar.servers.map(g => `${g.icon} ${g.name}: ${lastResults.gameRadar.latencies[g.id]}ms`).join('\n');
            }
            
            const text = `⚡ Fiz um teste no NetChek e minha nota foi ${overallGrade.innerText}!\n\n📶 Ping: ${lastResults.ping.avg.toFixed(1)}ms\n⬇️ Download: ${lastResults.download.avg.toFixed(1)} Mbps\n⬆️ Upload: ${lastResults.upload.avg.toFixed(1)} Mbps\n🔴 Bufferbloat: ${lastResults.bufferbloat}${gameStats}\n\nFaça seu teste também: https://netchek.onrender.com`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        });
    }

    // Compartilhar no Twitter (X)
    if (shareTwitterBtn) {
        shareTwitterBtn.addEventListener('click', () => {
            if (!lastResults) return;
            const text = `⚡ Minha conexão para jogos tirou nota ${overallGrade.innerText} no NetChek!\n\nPing: ${lastResults.ping.avg.toFixed(1)}ms | Bufferbloat: ${lastResults.bufferbloat}\n\nDescubra se a sua rede está pronta para o competitivo:`;
            const url = "https://netchek.onrender.com";
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        });
    }

    return {
        generate
    };
})();
