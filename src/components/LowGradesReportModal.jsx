// ─────────────────────────────────────────────────────────────
// components/LowGradesReportModal.jsx — Relatório de Alunos < 5,0 e Sem Nota
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { X, AlertCircle, Printer, Table as TableIcon, Search, UserCheck, BookOpen, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import { parseGrade, formatDisciplina, formatBimestre } from '../utils/helpers';
import { getXLSX } from '../services/api';

// Função auxiliar ultra-robusta para verificar se um valor de célula é "Sem Nota"
const checkIsMissing = (raw) => {
  if (raw === undefined || raw === null) return true;
  const str = String(raw).trim();
  if (!str) return true;
  
  // Apenas traços, pontos ou espaços (ex: "-", "–", "—", ".")
  if (/^[-–—_.\s]+$/.test(str)) return true;
  
  // Siglas ou palavras indicativas de ausência de nota
  if (/^(S\/N|S\/D|S\/C|FALTA|AUSENTE|NC|NA|N\/A|N\/C|SEM\s*NOTA|DISP|DISPENSADO)$/i.test(str)) return true;
  
  // Textos que contenham palavras de ausência
  if (/falta|sem\s*nota|ausente|dispensado/i.test(str)) return true;

  const val = parseGrade(raw);
  if (isNaN(val) || val <= 0) return true;
  return false;
};

const LowGradesReportModal = ({
  allStudents = [],
  onClose,
  onSelectStudent
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Média Geral');
  const [selectedDiscipline, setSelectedDiscipline] = useState('Todas');
  const [selectedTurma, setSelectedTurma] = useState('Todas');
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

  // ── Extração, Filtragem e Ordenação unificadas e rigorosas ────────────────
  const reportRecords = useMemo(() => {
    const records = [];
    const targetTurmaClean = String(selectedTurma || '').trim();
    const targetSearchClean = String(searchTerm || '').trim().toLowerCase();

    const formatFreqSafe = (val) => {
      if (val == null || val === '') return '-';
      if (typeof val === 'number') return Number.isFinite(val) ? `${val.toFixed(1)}%` : '-';
      const num = parseFloat(String(val).replace('%', '').replace(',', '.'));
      return Number.isFinite(num) ? `${num.toFixed(1)}%` : '-';
    };

    allStudents.forEach(s => {
      if (s.situacao && String(s.situacao).trim() !== 'Ativo') return;
      const turmaAluno = String(s.turma || '').trim();
      if (targetTurmaClean !== 'Todas' && turmaAluno !== targetTurmaClean) return;
      if (targetSearchClean && !String(s.nome || '').toLowerCase().includes(targetSearchClean)) return;

      const hist = s.historicoConceitos || [];
      const discKeysMap = new Map();
      hist.forEach(b => {
        Object.keys(b.notas || {}).forEach(d => {
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

    // Ordenação pura sem mutação do array base
    return [...filtered].sort((a, b) => {
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

  // ── Estatísticas do Relatório ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalRecords = reportRecords.length;
    const uniqueStudents = new Set(reportRecords.map(r => r.aluno)).size;
    
    const discCounts = {};
    reportRecords.forEach(r => {
      discCounts[r.disciplina] = (discCounts[r.disciplina] || 0) + 1;
    });
    let topDisc = '-';
    let maxDiscCount = 0;
    Object.entries(discCounts).forEach(([disc, count]) => {
      if (count > maxDiscCount) { maxDiscCount = count; topDisc = disc; }
    });

    return { totalRecords, uniqueStudents, topDisc, maxDiscCount };
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
    return (
      <th
        onClick={() => handleSort(colKey)}
        className={`px-5 py-3.5 cursor-pointer hover:bg-slate-200/80 transition-colors select-none ${alignClass} ${extraClass}`}
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
      return [
        `<tr class="${bg}">`,
        `<td style="font-weight:800;color:#0f172a;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.aluno}</td>`,
        `<td style="font-weight:700;color:#334155;text-align:center;width:50px">${r.turma}</td>`,
        `<td style="color:#475569;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.tutor}</td>`,
        `<td style="font-weight:600;color:#1e293b;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.disciplina}</td>`,
        `<td style="color:#64748b;width:68px;white-space:nowrap">${r.periodo}</td>`,
        `<td style="text-align:center;width:60px"><span style="display:inline-block;background:${notaBg};color:${notaColor};font-weight:900;padding:2px 7px;border-radius:4px;border:1px solid ${notaBorder};font-size:8.5px">${r.nota}</span></td>`,
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
    <div style="font-size:15px;font-weight:900;color:#0f172a;line-height:1.1">Acompanhamento Pedagógico — Notas &lt; 5,0${!removeMissing ? ' e Sem Nota' : ''}</div>
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
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Cabeçalho do Modal (Tons de Azul Institucional) */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <AlertCircle className="w-8 h-8 text-blue-200" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
                📋 Conselho de Classe — Acompanhamento
              </span>
              <h2 className="text-2xl font-black tracking-tight mt-0.5">
                Relatório de Alunos (&lt; 5,0 {!removeMissing ? 'e Sem Nota' : ''})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 shrink-0 items-end">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Período Avaliado
            </label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {availablePeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Disciplina
            </label>
            <select
              value={selectedDiscipline}
              onChange={e => setSelectedDiscipline(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {availableDisciplines.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" /> Turma
            </label>
            <select
              value={selectedTurma}
              onChange={e => setSelectedTurma(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {availableTurmas.map(t => (
                <option key={t} value={t}>{t === 'Todas' ? 'Todas as Turmas' : `Turma ${t}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" /> Buscar Aluno
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nome do aluno..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center h-[42px]">
            <button
              type="button"
              onClick={() => setRemoveMissing(prev => !prev)}
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors w-full shadow-2xs select-none"
            >
              <input
                type="checkbox"
                checked={removeMissing}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 pointer-events-none"
              />
              <span className="text-xs font-bold text-slate-700">Remover Sem Nota (-)</span>
            </button>
          </div>
        </div>

        {/* Resumo de Indicadores Rápido */}
        <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Estudantes</span>
              <span className="text-2xl font-black text-blue-800">({stats.uniqueStudents})</span>
            </div>
            <div className="w-px h-6 bg-blue-200 hidden sm:block" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Registros</span>
              <span className="text-2xl font-black text-blue-800">({stats.totalRecords})</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={reportRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <TableIcon className="w-4 h-4 text-emerald-600" /> Exportar Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={reportRecords.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" /> Imprimir Relatório
            </button>
          </div>
        </div>

        {/* Tabela Rolável com Registros e Cabeçalhos Classificáveis */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {reportRecords.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
                    {renderSortHeader('Estudante', 'aluno')}
                    {renderSortHeader('Turma', 'turma', 'text-center')}
                    {renderSortHeader('Tutor(a)', 'tutor')}
                    {renderSortHeader('Disciplina', 'disciplina')}
                    {renderSortHeader('Período', 'periodo', 'text-center')}
                    {renderSortHeader('Nota / Situação', 'notaNum', 'text-center', 'bg-blue-100/60 text-blue-900')}
                    {renderSortHeader('Assiduidade', 'faltas', 'text-center')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reportRecords.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {onSelectStudent ? (
                          <button
                            onClick={() => {
                              onSelectStudent(r.aluno);
                              onClose();
                            }}
                            className="text-left font-black text-blue-600 hover:text-blue-800 hover:underline transition-all flex items-center gap-1.5"
                          >
                            {r.aluno}
                          </button>
                        ) : (
                          r.aluno
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 text-[11px] font-black">
                          {r.turma}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {r.tutor}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">
                        {r.disciplina}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-500">
                        {r.periodo}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center font-black text-xs px-3 py-1 rounded-xl border shadow-2xs ${
                          r.isMissing
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-blue-100/80 text-blue-800 border-blue-200'
                        }`}>
                          {r.nota}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-600">
                        <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg">
                          Faltas: <strong className="text-slate-800">{r.faltas}</strong> • Freq: <strong className="text-slate-800">{r.frequencia}</strong>
                        </span>
                      </td>
                    </tr>
                  ))}
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
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-400">
            Dica: Clique em qualquer cabeçalho da tabela para classificar por coluna (A-Z ou Numérico). Clique no nome para abrir o aluno.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-wider transition-colors"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};

export default LowGradesReportModal;
