// Impressão de ata em PDF (jsPDF)
// (extraído do index.html — scripts clássicos que compartilham o escopo global)

// =============================================
// IMPRESSÃO DE ATA EM PDF (jsPDF)
// =============================================
function imprimirAtaPDF(id) {
  const r = allReunioes.find(x => x.id === id);
  if (!r) return alert('Reunião não encontrada');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, margin = 20;
  let y = 20;

  // Header
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, W, 38, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(8);
  doc.text('A IGREJA DE JESUS CRISTO DOS SANTOS DOS ÚLTIMOS DIAS', W/2, 10, {align:'center'});
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('Ata — Presidência da Estaca Nova Iguaçu', W/2, 18, {align:'center'});
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text((r.titulo || 'Reunião de Presidência') + ' — ' + fmtAtaDate(r.data), W/2, 26, {align:'center'});
  doc.setFontSize(9);
  doc.text('Horário: ' + (r.horaInicio||'') + ' – ' + (r.horaTermino||'') + '  |  Presidida: ' + (r.presidida||'—') + '  |  Dirigida: ' + (r.dirigida||'—'), W/2, 32, {align:'center'});
  y = 44;

  doc.setTextColor(30, 30, 30);

  // Oração
  if (r.oracaoAbertura || r.oracaoEncerramento) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Orações:', margin, y); y += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    if (r.oracaoAbertura) { doc.text('Abertura: ' + r.oracaoAbertura, margin + 4, y); y += 5; }
    if (r.oracaoEncerramento) { doc.text('Encerramento: ' + r.oracaoEncerramento, margin + 4, y); y += 5; }
    y += 3;
  }

  // Assuntos
  const assuntos = r.assuntos || [];
  if (assuntos.length) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Assuntos Tratados:', margin, y); y += 6;
    assuntos.forEach((a, idx) => {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text((idx+1) + '. ' + (a.titulo||'Assunto'), margin, y); y += 5;
      if (a.responsavel) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text('Responsável: ' + a.responsavel, margin + 4, y); y += 4;
      }
      if (a.detalhes) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(a.detalhes, W - margin*2 - 4);
        lines.forEach(line => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, margin + 4, y); y += 4;
        });
      }
      if (a.decisao) {
        doc.setFont(undefined, 'italic');
        doc.setFontSize(9);
        doc.text('Decisão: ' + a.decisao, margin + 4, y); y += 4;
      }
      y += 3;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Gerado pelo Painel da Presidência da Estaca Nova Iguaçu — ' + new Date().toLocaleDateString('pt-BR'), W/2, 290, {align:'center'});

  doc.save('ata-estaca-' + (r.data || 'reuniao') + '.pdf');
}
