// ─────────────────────────────────────────────────────────────
// components/LowGradesReportModal.jsx — Relatório de Alunos < 5,0 e Sem Nota
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { 
  X, AlertCircle, Printer, Table as TableIcon, Search, UserCheck, 
  BookOpen, Calendar, Filter, ArrowUpDown, AlertTriangle, Users, 
  ChevronRight, Sparkles 
} from 'lucide-react';
import { parseGrade, formatDisciplina, formatBimestre, checkIsMissing, isNonSubjectHeader } from '../utils/helpers';
import { getXLSX } from '../services/api';

const LowGradesReportModal = ({
  allStudents = [],
  onClose,
  onSelectStudent,
  initialPeriod = 'Média Geral',
  initialTurma = 'Todas'
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [selectedDiscipline, setSelectedDiscipline] = useState('Todas');
  const [selectedTurma, setSelectedTurma] = useState(() => {
    return initialTurma && initialTurma !== 'Todas' ? String(initialTurma).trim() : 'Todas';
  });
  const [removeMissing, setRemoveMissing] = useState(true); // false = mostra sem nota por padrão; true = remove sem nota
  const [searchTerm, setSearchTerm] = useState('');


  // Estados para classificação por coluna
  const [sortColumn, setSortColumn] = useState('notaNum');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // ── Coletar apenas bimestres com nota lançada, disciplinas e turmas ────────
  const { availablePeriods, availableDisciplines, availableTurmas } = useMemo(() => {
    const bimSet = new Set();
    const discSet = new Set();
    const turmaSet = new Set();

    allStudents.forEach(s => {
      if (s.situacao && String(s.situacao).trim() !== 'Ativo') return;
      const tClean = String(s.turma || '').trim();
      if (tClean) turmaSet.add(tClean);
      const hist = s.historicoConceitos || [];
      hist.forEach(b => {
        const bFormatted = formatBimestre(b.bimestre);
        let hasGradeInBim = false;
        Object.keys(b.notas || {}).forEach(d => {
          if (isNonSubjectHeader(d)) return;
          const raw = b.notas[d];
          if (!checkIsMissing(raw)) {
            hasGradeInBim = true;
          }
          if (raw && raw !== '-') {
            discSet.add(formatDisciplina(d));
          }
        });
        if (hasGradeInBim && bFormatted) {
          bimSet.add(bFormatted);
        }
      });
    });

    const turmasSorted = Array.from(turmaSet).sort((a, b) => 
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );

    const discSorted = Array.from(discSet).sort((a, b) => 
      a.localeCompare(b, 'pt-BR')
    );

    const periodsSorted = ['Média Geral', ...Array.from(bimSet).sort()];

    return {
      availablePeriods: periodsSorted,
      availableDisciplines: ['Todas', ...discSorted],
      availableTurmas: ['Todas', ...turmasSorted]
    };
  }, [allStudents]);

  // Sincronizar período inicial se prop mudar
  useEffect(() => {
    if (initialPeriod) {
      setSelectedPeriod(initialPeriod);
    }
  }, [initialPeriod]);

  // Sincronizar turma inicial com as turmas disponíveis na montagem/atualização
  useEffect(() => {
    if (!initialTurma || initialTurma === 'Todas') {
      setSelectedTurma('Todas');
      return;
    }
    const cleanTarget = String(initialTurma).trim().toLowerCase();
    const matched = availableTurmas.find(t => t.toLowerCase() === cleanTarget);
    if (matched) {
      setSelectedTurma(matched);
    } else {
      setSelectedTurma(String(initialTurma).trim());
    }
  }, [initialTurma, availableTurmas]);

  // ── Extração, Filtragem e Ordenação unificadas e rigorosas ────────────────
  const reportRecords = useMemo(() => {
    const records = [];
    const targetTurmaClean = String(selectedTurma || '').trim().toLowerCase();
    const targetSearchClean = String(searchTerm || '').trim().toLowerCase();

    const formatFreqSafe = (val) => {
      if (val == null || val === '') return '-';
      if (typeof val === 'number') return Number.isFinite(val) ? `${val.toFixed(1)}%` : '-';
      const num = parseFloat(String(val).replace('%', '').replace(',', '.'));
      return Number.isFinite(num) ? `${num.toFixed(1)}%` : '-';
    };

    allStudents.forEach(s => {
      if (s.situacao && String(s.situacao).trim() !== 'Ativo') return;
      const turmaAluno = String(s.turma || '').trim().toLowerCase();
      if (targetTurmaClean !== 'todas' && turmaAluno !== targetTurmaClean) return;
      if (targetSearchClean && !String(s.nome || '').toLowerCase().includes(targetSearchClean)) return;

      const hist = s.historicoConceitos || [];
      const discKeysMap = new Map();
      hist.forEach(b => {
        Object.keys(b.notas || {}).forEach(d => {
          if (isNonSubjectHeader(d)) return;
          discKeysMap.set(formatDisciplina(d), d);
        });
      });

      const discsToInspect = discKeysMap.size > 0 
        ? Array.from(discKeysMap.entries()) 
        : availableDisciplines.filter(d => d !== 'Todas').map(d => [d, d]);

      discsToInspect.forEach(([discFormatted, rawDisc]) => {
        if (selectedDiscipline !== 'Todas' && discFormatted !== selectedDiscipline) return;

        if (selectedPeriod === 'Média Geral') {
          let soma = 0, count = 0;
          hist.forEach(b => {
            if (b.situacao && String(b.situacao).trim() !== 'Ativo') return;
            const raw = b.notas?.[rawDisc];
            if (!checkIsMissing(raw)) {
              const val = parseGrade(raw);
              if (val > 0) { soma += val; count++; }
            }
          });
          const media = count > 0 ? Number((soma / count).toFixed(1)) : null;
          const isMissing = count === 0 || media === null || media <= 0 || isNaN(media);

          if (isMissing) {
            if (!removeMissing) {
              records.push({
                id: `${s.nome}-${discFormatted}-MG-missing`,
                aluno: s.nome,
                turma: turmaAluno || '-',
                tutor: s.tutor || '-',
                disciplina: discFormatted,
                periodo: 'Média Geral',
                nota: 'Sem Nota (-)',
                notaNum: -100,
                isMissing: true,
                faltas: s.totalFaltas != null ? s.totalFaltas : '-',
                frequencia: formatFreqSafe(s.frequenciaMedia)
              });
            }
          } else if (media !== null && Number.isFinite(media) && media < 5.0) {
            records.push({
              id: `${s.nome}-${discFormatted}-MG`,
              aluno: s.nome,
              turma: turmaAluno || '-',
              tutor: s.tutor || '-',
              disciplina: discFormatted,
              periodo: 'Média Geral',
              nota: media.toFixed(1),
              notaNum: media,
              isMissing: false,
              faltas: s.totalFaltas != null ? s.totalFaltas : '-',
              frequencia: formatFreqSafe(s.frequenciaMedia)
            });
          }
        } else {
          const bimObj = hist.find(b => formatBimestre(b.bimestre) === selectedPeriod || b.bimestre === selectedPeriod);
          if (bimObj && bimObj.situacao && String(bimObj.situacao).trim() !== 'Ativo') return;

          const rawVal = bimObj?.notas?.[rawDisc];
          const isMissing = checkIsMissing(rawVal);
          const val = isMissing ? 0 : parseGrade(rawVal);

          const parseN = (v) => {
            if (v == null) return null;
            const n = parseFloat(String(v).replace('%','').replace(',','.'));
            return isNaN(n) ? null : n;
          };
          const fp = bimObj ? parseN(bimObj.freqBimestre) : null;
          const freqFormatted = fp !== null 
            ? formatFreqSafe(fp <= 1 && !String(bimObj.freqBimestre || '').includes('%') ? fp * 100 : fp)
            : formatFreqSafe(s.frequenciaMedia);

          if (isMissing) {
            if (!removeMissing) {
              records.push({
                id: `${s.nome}-${discFormatted}-${selectedPeriod}-missing`,
                aluno: s.nome,
                turma: turmaAluno || '-',
                tutor: s.tutor || '-',
                disciplina: discFormatted,
                periodo: selectedPeriod,
                nota: 'Sem Nota (-)',
                notaNum: -100,
                isMissing: true,
                faltas: bimObj?.tfBimestre ?? bimObj?.faltas ?? s.totalFaltas ?? '-',
                frequencia: freqFormatted
              });
            }
          } else if (val < 5.0 && Number.isFinite(Number(val))) {
            records.push({
              id: `${s.nome}-${discFormatted}-${selectedPeriod}`,
              aluno: s.nome,
              turma: turmaAluno || '-',
              tutor: s.tutor || '-',
              disciplina: discFormatted,
              periodo: selectedPeriod,
              nota: Number(val).toFixed(1),
              notaNum: val,
              isMissing: false,
              faltas: bimObj?.tfBimestre ?? bimObj?.faltas ?? s.totalFaltas ?? '-',
              frequencia: freqFormatted
            });
          }
        }
      });
    });

    // Barreira absoluta final: remove sem nota ou notas <= 0
    const filtered = removeMissing 
      ? records.filter(r => !r.isMissing && r.nota !== 'Sem Nota (-)' && r.notaNum > 0)
      : records;

    // AGRUPAMENTO QUANDO 'TODAS' DISCIPLINAS SÃO SELECIONADAS
    let groupedFiltered = filtered;
    if (selectedDiscipline === 'Todas') {
      const groupMap = new Map();
      filtered.forEach(r => {
        const key = `${r.aluno}-${r.periodo}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            ...r,
            disciplinasList: [r.disciplina],
            notasList: [r.nota],
            notaNumList: [r.notaNum],
            isMissingList: [r.isMissing]
          });
        } else {
          const existing = groupMap.get(key);
          existing.disciplinasList.push(r.disciplina);
          existing.notasList.push(r.nota);
          existing.notaNumList.push(r.notaNum);
          existing.isMissingList.push(r.isMissing);
          
          const minNum = Math.min(
             existing.notaNum,
             r.isMissing ? -100 : r.notaNum
          );
          existing.notaNum = minNum;
          if (r.isMissing) {
            existing.isMissing = true;
          }
        }
      });

      groupedFiltered = Array.from(groupMap.values()).map(g => {
        g.disciplina = g.disciplinasList.map((d, i) => {
          const gradeStr = g.isMissingList[i] ? 'SN' : g.notasList[i];
          return `• ${d} (${gradeStr})`;
        }).join('\n');
        g.nota = String(g.disciplinasList.length);
        g.notaNum = g.disciplinasList.length;
        return g;
      });
    }

    // Ordenação pura sem mutação do array base
    return [...groupedFiltered].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (sortColumn === 'notaNum') {
        valA = a.isMissing ? -100 : a.notaNum;
        valB = b.isMissing ? -100 : b.notaNum;
      } else if (sortColumn === 'turma') {
        const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
      } else if (sortColumn === 'faltas') {
        const numA = parseFloat(a.faltas) || 0;
        const numB = parseFloat(b.faltas) || 0;
        if (numA !== numB) return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA !== valB) return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA || '');
      const strB = String(valB || '');
      const cmpStr = strA.localeCompare(strB, 'pt-BR');
      if (cmpStr !== 0) return sortDirection === 'asc' ? cmpStr : -cmpStr;

      return a.aluno.localeCompare(b.aluno, 'pt-BR');
    });
  }, [allStudents, selectedTurma, selectedDiscipline, selectedPeriod, searchTerm, availableDisciplines, removeMissing, sortColumn, sortDirection]);

  // ── Estatísticas e Indicadores Rápidos do Relatório ────────────────────────
  const stats = useMemo(() => {
    const totalRecords = reportRecords.length;
    const uniqueStudents = new Set(reportRecords.map(r => r.aluno)).size;
    
    let totalLowGradesCount = 0;
    const discCounts = {};
    let freqSum = 0;
    let freqCount = 0;

    reportRecords.forEach(r => {
      if (r.disciplinasList) {
        totalLowGradesCount += r.disciplinasList.length;
        r.disciplinasList.forEach(d => {
          discCounts[d] = (discCounts[d] || 0) + 1;
        });
      } else {
        totalLowGradesCount += 1;
        discCounts[r.disciplina] = (discCounts[r.disciplina] || 0) + 1;
      }

      const freqNum = parseFloat(String(r.frequencia || '').replace('%', '').replace(',', '.'));
      if (!isNaN(freqNum) && freqNum >= 0) {
        freqSum += freqNum;
        freqCount++;
      }
    });

    let topDisc = '-';
    let maxDiscCount = 0;
    Object.entries(discCounts).forEach(([disc, count]) => {
      if (count > maxDiscCount) { maxDiscCount = count; topDisc = disc; }
    });

    const avgFreq = freqCount > 0 ? (freqSum / freqCount).toFixed(1) + '%' : '-';

    return { totalRecords, uniqueStudents, topDisc, maxDiscCount, totalLowGradesCount, avgFreq };
  }, [reportRecords]);

  // ── Exportação Excel ──────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      const XLSX = await getXLSX();
      
      const exportData = reportRecords.map(r => ({
        "Aluno": r.aluno,
        "Turma": r.turma,
        "Tutor": r.tutor,
        "Disciplina": r.disciplina,
        "Período Avaliado": r.periodo,
        "Nota / Situação": r.nota,
        "Faltas": r.faltas,
        "Frequência": r.frequencia
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos_Conselho");

      const safePeriod = String(selectedPeriod).replace(/[^a-z0-9]/gi, '_');
      const safeDisc = String(selectedDiscipline).replace(/[^a-z0-9]/gi, '_');
      const filename = `Relatorio_Conselho_${safePeriod}_${safeDisc}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      alert("Não foi possível gerar o arquivo Excel.");
    }
  };

  // ── Renderização de cabeçalho ordenável ───────────────────────────────────
  const renderSortHeader = (label, colKey, alignClass = 'text-left', extraClass = '') => {
    const isActive = sortColumn === colKey;
    const isStudentCol = colKey === 'aluno';
    return (
      <th
        onClick={() => handleSort(colKey)}
        className={`px-5 py-3.5 cursor-pointer hover:bg-slate-200/80 transition-colors select-none border-b-2 border-slate-300 ${
          isStudentCol ? 'sticky left-0 z-20 bg-slate-50 border-r border-slate-200/70 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]' : ''
        } ${alignClass} ${extraClass}`}
        title={`Classificar por ${label}`}
      >
        <div className={`flex items-center gap-1.5 ${alignClass === 'text-center' ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          <span className="inline-flex flex-col text-[10px] leading-[10px]">
            {isActive ? (
              sortDirection === 'asc' ? (
                <span className="text-blue-700 font-extrabold">▲</span>
              ) : (
                <span className="text-blue-700 font-extrabold">▼</span>
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30 text-slate-500" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // ── Impressão via window.print() ────────────────────────────────────────────
  const handlePrint = () => {
    const records = reportRecords;
    if (!records || records.length === 0) {
      alert('Nenhum registro para imprimir com os filtros selecionados.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });


    const PID = 'lg-pa';
    const SID = 'lg-ps';
    document.getElementById(PID)?.remove();
    document.getElementById(SID)?.remove();

    const s = document.createElement('style');
    s.id = SID;
    s.textContent = `
      @media print{
        @page{size:A4 portrait;margin:8mm 10mm}
        html,body{margin:0;padding:0;height:auto;overflow:visible}
        body>*:not(#${PID}){display:none!important}
        #${PID}{display:block!important;width:100%;font-family:system-ui,-apple-system,sans-serif;font-size:9.5px;color:#0f172a;background:#fff;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        #${PID} *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
        #${PID} table{width:100%;border-collapse:collapse;font-size:9px}
        #${PID} thead{display:table-header-group}
        #${PID} th{background:#1e3a8a!important;color:#fff!important;text-align:left;text-transform:uppercase;font-weight:700;font-size:8px;letter-spacing:.04em;padding:6px 7px;white-space:nowrap}
        #${PID} td{padding:5px 7px;vertical-align:middle;border-bottom:1px solid #e2e8f0}
        #${PID} tr.even{background:#fff}
        #${PID} tr.odd{background:#f8fafc}
      }
      @media screen{#${PID}{display:none!important}}
    `;
    document.head.appendChild(s);

    const rowsHTML = records.map((r, idx) => {
      const bg = idx % 2 === 0 ? 'even' : 'odd';
      const notaBg = r.isMissing ? '#f1f5f9' : '#fee2e2';
      const notaColor = r.isMissing ? '#64748b' : '#991b1b';
      const notaBorder = r.isMissing ? '#cbd5e1' : '#fca5a5';
      const printDisc = typeof r.disciplina === 'string' ? r.disciplina.replace(/\n/g, '<br/>') : r.disciplina;
      
      return [
        `<tr class="${bg}">`,
        `<td style="font-weight:800;color:#0f172a;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.aluno}</td>`,
        `<td style="font-weight:700;color:#334155;text-align:center;width:50px">${r.turma}</td>`,
        `<td style="color:#475569;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.tutor}</td>`,
        `<td style="font-weight:600;color:#1e293b;width:200px;line-height:1.4;padding-top:8px;padding-bottom:8px">${printDisc}</td>`,
        `<td style="color:#64748b;width:68px;white-space:nowrap">${r.periodo}</td>`,
        `<td style="text-align:center;width:60px;font-weight:900;color:${notaColor};font-size:12px">${r.nota}</td>`,
        `<td style="text-align:center;color:#475569;font-size:8px;width:72px;white-space:nowrap">F:${r.faltas} ${r.frequencia}</td>`,
        '</tr>',
      ].join('');
    }).join('');

    const d = document.createElement('div');
    d.id = PID;
    d.innerHTML = `
<div style="border-top:5px solid #1e3a8a;padding:8px 0 8px;border-bottom:1.5px solid #e2e8f0;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <span style="display:inline-block;background:#eff6ff;color:#1e3a8a;font-size:7.5px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:2px 7px;border-radius:4px;border:1px solid #bfdbfe;margin-bottom:4px">📋 Conselho de Classe — Relatório Oficial</span>
    <div style="font-size:15px;font-weight:900;color:#0f172a;line-height:1.1">Acompanhamento Pedagógico — Foco de Atenção${!removeMissing ? ' e Sem Nota' : ''}</div>
  </div>
  <div style="text-align:right;font-size:8px;color:#475569;font-weight:700;background:#f8fafc;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;line-height:1.5">
    <div style="color:#0f172a;font-weight:900;font-size:8.5px">EMISSÃO DO DOSSIÊ</div>
    ${dateStr} · ${timeStr}
  </div>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
  <div style="background:#f8fafc;padding:6px 9px;border-radius:6px;border:1px solid #e2e8f0"><span style="font-size:7px;font-weight:800;text-transform:uppercase;color:#64748b;display:block">Período Avaliado</span><span style="font-size:11px;font-weight:900;color:#1e3a8a">${selectedPeriod}</span></div>
  <div style="background:#f8fafc;padding:6px 9px;border-radius:6px;border:1px solid #e2e8f0"><span style="font-size:7px;font-weight:800;text-transform:uppercase;color:#64748b;display:block">Disciplina</span><span style="font-size:10px;font-weight:900;color:#0f172a">${selectedDiscipline}</span></div>
  <div style="background:#eff6ff;padding:6px 9px;border-radius:6px;border:1px solid #bfdbfe"><span style="font-size:7px;font-weight:800;text-transform:uppercase;color:#1e40af;display:block">Estudantes</span><span style="font-size:13px;font-weight:900;color:#1e3a8a">${stats.uniqueStudents}</span></div>
  <div style="background:#eff6ff;padding:6px 9px;border-radius:6px;border:1px solid #bfdbfe"><span style="font-size:7px;font-weight:800;text-transform:uppercase;color:#1e40af;display:block">Registros</span><span style="font-size:13px;font-weight:900;color:#1e3a8a">${stats.totalRecords}</span></div>
</div>
<table>
  <thead>
    <tr>
      <th>Estudante</th>
      <th style="text-align:center;width:50px">Turma</th>
      <th>Tutor(a)</th>
      <th>Disciplina</th>
      <th style="width:68px">Período</th>
      <th style="text-align:center;width:60px">Nota</th>
      <th style="text-align:center;width:72px">Assiduidade</th>
    </tr>
  </thead>
  <tbody>${rowsHTML}</tbody>
</table>
<div style="margin-top:14px;border-top:1px dashed #cbd5e1;padding-top:8px;display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8">
  <span>Sistema Pedagógico Drácker Adapta / TutorDash</span>
  <span>Impressão Oficial do Conselho de Classe</span>
</div>`;
    document.body.appendChild(d);
    window.print();
    d.remove();
    s.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white w-[98vw] max-w-[1640px] h-[95vh] max-h-[96vh] rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Cabeçalho do Modal (Clean & Executivo) */}
        <div className="px-6 sm:px-8 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Conselho de Classe — Diagnóstico e Acompanhamento
                </span>
                {selectedTurma !== 'Todas' && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                    Turma {selectedTurma}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                  {selectedPeriod}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Relatório de Alunos — Foco de Atenção
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="Fechar"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Painel de Indicadores Rápidos (KPIs) */}
        <div className="px-6 sm:px-8 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 flex-1 max-w-4xl">
            {/* KPI 1: Estudantes */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                  Estudantes
                </span>
                <span className="text-lg font-black text-slate-900 leading-tight">
                  {stats.uniqueStudents}
                </span>
              </div>
            </div>

            {/* KPI 2: Registros */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                  Registros
                </span>
                <span className="text-lg font-black text-slate-900 leading-tight">
                  {stats.totalLowGradesCount || stats.totalRecords}
                </span>
              </div>
            </div>

            {/* KPI 3: Maior Incidência */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight truncate">
                  Maior Incidência
                </span>
                <span className="text-xs font-black text-slate-900 leading-tight truncate block" title={stats.topDisc}>
                  {stats.topDisc !== '-' ? `${stats.topDisc} (${stats.maxDiscCount})` : 'Nenhuma'}
                </span>
              </div>
            </div>

            {/* KPI 4: Freq. Média */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-tight">
                  Freq. Média
                </span>
                <span className="text-lg font-black text-slate-900 leading-tight">
                  {stats.avgFreq}
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={handleExportExcel}
              disabled={reportRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={reportRecords.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Controles Integrada */}
        <div className="px-6 sm:px-8 py-3.5 bg-white border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0 items-end">
          {/* Seletor 1: Período */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Período Avaliado
            </label>
            <select
              aria-label="Selecionar período avaliado"
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
            >
              {availablePeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Seletor 2: Disciplina */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Disciplina
            </label>
            <select
              aria-label="Filtrar por disciplina"
              value={selectedDiscipline}
              onChange={e => setSelectedDiscipline(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
            >
              {availableDisciplines.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Seletor 3: Turma */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" /> Turma
            </label>
            <select
              aria-label="Filtrar por turma"
              value={selectedTurma}
              onChange={e => setSelectedTurma(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
            >
              {availableTurmas.map(t => (
                <option key={t} value={t}>{t === 'Todas' ? 'Todas as Turmas' : `Turma ${t}`}</option>
              ))}
            </select>
          </div>

          {/* Campo de Busca */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" /> Buscar Aluno
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Checkbox / Toggle Remover Sem Nota */}
          <div>
            <label
              className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 cursor-pointer transition-colors shadow-2xs select-none h-[38px]"
            >
              <input
                type="checkbox"
                checked={removeMissing}
                onChange={(e) => setRemoveMissing(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                Remover Sem Nota (-)
              </span>
            </label>
          </div>
        </div>

        {/* Tabela Rolável com Registros e Cabeçalhos Classificáveis */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
          {reportRecords.length > 0 ? (
            <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
                    {renderSortHeader('Estudante', 'aluno')}
                    {renderSortHeader('Turma', 'turma', 'text-center')}
                    {renderSortHeader('Tutor(a)', 'tutor')}
                    {renderSortHeader('Disciplinas em Foco', 'disciplina')}
                    {renderSortHeader('Período', 'periodo', 'text-center')}
                    {renderSortHeader(selectedDiscipline === 'Todas' ? 'Qtde Disciplina' : 'Nota / Situação', 'notaNum', 'text-center', 'bg-blue-50 text-blue-900')}
                    {renderSortHeader('Assiduidade', 'faltas', 'text-center')}
                    {onSelectStudent && <th className="px-3 py-3.5 text-center w-12 border-b-2 border-slate-300">Ação</th>}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {reportRecords.map((r, i) => {
                    const isEven = i % 2 === 0;
                    const count = r.disciplinasList?.length || 1;
                    const freqNum = parseFloat(String(r.frequencia || '').replace('%', '').replace(',', '.'));
                    const isFreqRisk = !isNaN(freqNum) && freqNum < 75.0;

                    return (
                      <tr 
                        key={r.id} 
                        className={`transition-colors group ${
                          isEven 
                            ? 'bg-white hover:bg-blue-50/50' 
                            : 'bg-slate-100 hover:bg-blue-50/60'
                        }`}
                      >
                        {/* Estudante */}
                        <td className={`px-5 py-3.5 sticky left-0 z-10 min-w-[220px] max-w-[320px] border-b border-slate-300 border-r border-slate-200/70 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors ${
                          isEven 
                            ? 'bg-white group-hover:bg-blue-50/70' 
                            : 'bg-slate-100 group-hover:bg-blue-50/70'
                        }`}>
                          {onSelectStudent ? (
                            <button
                              onClick={() => {
                                onSelectStudent(r.aluno);
                                onClose();
                              }}
                              className="text-left font-black text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-2.5 group/student cursor-pointer w-full"
                              title="Abrir perfil detalhado do aluno"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 font-bold text-xs flex items-center justify-center shrink-0 group-hover/student:bg-blue-600 group-hover/student:text-white transition-colors">
                                {r.aluno.charAt(0).toUpperCase()}
                              </div>
                              <span className="group-hover/student:underline truncate">{r.aluno}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {r.aluno.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900 truncate">{r.aluno}</span>
                            </div>
                          )}
                        </td>

                        {/* Turma */}
                        <td className="px-4 py-3.5 text-center font-bold whitespace-nowrap border-b border-slate-300">
                          <span className="bg-white border border-slate-200/90 shadow-2xs px-2.5 py-1 rounded-lg text-slate-700 text-[11px] font-black uppercase">
                            {r.turma}
                          </span>
                        </td>

                        {/* Tutor */}
                        <td className="px-4 py-3.5 whitespace-nowrap border-b border-slate-300 font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-semibold border bg-white border-slate-200/80 shadow-2xs text-slate-600">
                            <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{r.tutor}</span>
                          </span>
                        </td>

                        {/* Disciplinas em Foco com Badges Elegantes */}
                        <td className="px-5 py-3 border-b border-slate-300">
                          {r.disciplinasList && r.disciplinasList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {r.disciplinasList.map((d, idx) => {
                                const isMissing = r.isMissingList?.[idx];
                                const gradeVal = r.notasList?.[idx];
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors"
                                  >
                                    <span className="text-slate-700">{d}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                                      isMissing 
                                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                    }`}>
                                      {isMissing ? 'S/N' : gradeVal}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200/90 shadow-2xs">
                              <span className="text-slate-700">{r.disciplina}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                                r.isMissing 
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                              }`}>
                                {r.isMissing ? 'S/N' : r.nota}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Período */}
                        <td className="px-4 py-3.5 text-center font-medium text-slate-500 whitespace-nowrap border-b border-slate-300">
                          {r.periodo}
                        </td>

                        {/* Qtde Disciplina / Nota — Apenas número, fora de tag, fonte preta, excelente visual e leitura */}
                        <td className="px-4 py-3.5 text-center border-b border-slate-300">
                          {selectedDiscipline === 'Todas' ? (
                            <span
                              className="text-lg font-black tracking-tight inline-block select-none text-slate-900"
                              title={`${count} disciplina${count > 1 ? 's' : ''} em foco`}
                            >
                              {count}
                            </span>
                          ) : (
                            <span
                              className={`text-base font-black tracking-tight inline-block select-none ${
                                r.isMissing ? 'text-slate-500 text-xs font-bold' : 'text-slate-900'
                              }`}
                            >
                              {r.nota}
                            </span>
                          )}
                        </td>

                        {/* Assiduidade com Alerta de Infrequência (< 75%) */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap border-b border-slate-300">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-bold border shadow-2xs ${
                            isFreqRisk 
                              ? 'bg-rose-50 text-rose-700 border-rose-200/80' 
                              : 'bg-white text-slate-700 border-slate-200/80'
                          }`}>
                            {isFreqRisk && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                            <span>Freq: {r.frequencia}</span>
                            <span className="text-slate-400 font-normal">({r.faltas}f)</span>
                          </span>
                        </td>

                        {/* Ação */}
                        {onSelectStudent && (
                          <td className="px-3 py-3.5 text-center border-b border-slate-300">
                            <button
                              onClick={() => {
                                onSelectStudent(r.aluno);
                                onClose();
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-2xs transition-colors cursor-pointer"
                              title={`Abrir perfil de ${r.aluno}`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-3xl p-16 text-center bg-slate-50/50 flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <span className="text-2xl font-bold">✓</span>
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
                Nenhum estudante em situação de risco encontrado
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mt-1">
                Com o filtro atual ({selectedPeriod} • {selectedDiscipline} • Turma {selectedTurma}), não foram identificados alunos com nota &lt; 5,0 {!removeMissing ? 'ou sem nota' : ''}.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 sm:px-8 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <span className="text-xs font-semibold text-slate-400">
            Dica: Clique em qualquer cabeçalho da tabela para classificar por coluna (A-Z ou Numérico). Clique no nome para abrir o aluno.
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              {reportRecords.length} estudante{reportRecords.length !== 1 ? 's' : ''} em exibição
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LowGradesReportModal;
