// ─────────────────────────────────────────────────────────────
// components/LaunchTraceabilityModal.jsx — Auditoria e Rastreabilidade de Lançamentos
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Search, AlertTriangle, CheckCircle2, Clock, 
  Copy, Users, BookOpen, 
  Check, ArrowUpDown, School,
  FileSpreadsheet, Eye
} from 'lucide-react';
import { parseGrade, formatDisciplina, formatBimestre } from '../utils/helpers';
import { getXLSX } from '../services/api';

// Verificação robusta de célula sem nota
const checkIsMissing = (raw) => {
  if (raw === undefined || raw === null) return true;
  const str = String(raw).trim();
  if (!str) return true;
  if (/^[-–—_.\s]+$/.test(str)) return true;
  if (/^(S\/N|S\/D|S\/C|FALTA|AUSENTE|NC|NA|N\/A|N\/C|SEM\s*NOTA|DISP|DISPENSADO)$/i.test(str)) return true;
  if (/falta|sem\s*nota|ausente|dispensado/i.test(str)) return true;
  const val = parseGrade(raw);
  if (isNaN(val) || val <= 0) return true;
  return false;
};

const LaunchTraceabilityModal = ({
  isOpen = false,
  onClose,
  allStudents = [],
  selectedBimestre = '3',
  initialTurma = 'Todas',
  onSelectStudent
}) => {
  const [activeTab, setActiveTab] = useState('alunos'); // 'alunos' | 'turmas' | 'disciplinas'
  const [selectedTurma, setSelectedTurma] = useState(() => {
    return initialTurma && initialTurma !== 'Todas' ? String(initialTurma).trim() : 'Todas';
  });
  const [pendingTypeFilter, setPendingTypeFilter] = useState('todos'); // 'todos' | 'furos' | 'parciais' | 'nao_iniciadas'
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  useEffect(() => {
    if (initialTurma && initialTurma !== 'Todas') {
      setSelectedTurma(String(initialTurma).trim());
    } else {
      setSelectedTurma('Todas');
    }
  }, [initialTurma]);

  // Ordenação de alunos
  const [sortField, setSortField] = useState('furos');
  const [sortDirection, setSortDirection] = useState('desc');

  // Formatação consistente do nome do bimestre
  const bimestreLabel = useMemo(() => {
    if (selectedBimestre === 'geral') return 'Média Geral';
    if (String(selectedBimestre).includes('º')) return String(selectedBimestre);
    return `${selectedBimestre}º Bimestre`;
  }, [selectedBimestre]);

  // ── Motor de Auditoria e Rastreabilidade ──────────────────────────────────
  const auditData = useMemo(() => {
    // 1. Filtrar estritamente alunos ativos
    const activeStudents = allStudents.filter(s => !s.situacao || String(s.situacao).trim() === 'Ativo');

    // 2. Mapear disciplinas esperadas por turma a partir do histórico curricular
    const turmasDisciplinasMap = new Map(); // turma -> Set(disciplinas formatadas)
    allStudents.forEach(s => {
      const t = String(s.turma || '').trim();
      if (!t) return;
      if (!turmasDisciplinasMap.has(t)) turmasDisciplinasMap.set(t, new Set());
      const discSet = turmasDisciplinasMap.get(t);
      (s.historicoConceitos || []).forEach(b => {
        Object.keys(b.notas || {}).forEach(rawDisc => {
          const formatted = formatDisciplina(rawDisc);
          if (formatted && formatted !== '-' && formatted !== 'SITUAÇÃO' && formatted !== 'TOTAL') {
            discSet.add(formatted);
          }
        });
      });
    });

    // 3. Mapear todas as turmas cadastradas com alunos ativos
    const turmasSet = new Set();
    activeStudents.forEach(s => {
      const t = String(s.turma || '').trim();
      if (t) turmasSet.add(t);
    });
    const turmasList = Array.from(turmasSet).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true })
    );

    // 4. Analisar por turma e disciplina para descobrir quem já lançou
    const turmasAudit = new Map();

    turmasList.forEach(turmaName => {
      const alunosDaTurma = activeStudents.filter(s => String(s.turma || '').trim() === turmaName);
      const discList = Array.from(turmasDisciplinasMap.get(turmaName) || []).sort();

      const discAudit = {};
      let totalNotasLancadasTurma = 0;
      let totalNotasEsperadasTurma = alunosDaTurma.length * (discList.length > 0 ? discList.length : 1);

      discList.forEach(disc => {
        discAudit[disc] = { comNota: [], semNota: [] };
      });

      alunosDaTurma.forEach(aluno => {
        const hist = aluno.historicoConceitos || [];
        const bimRecord = hist.find(b => {
          const bFormatted = formatBimestre(b.bimestre);
          return bFormatted === bimestreLabel || String(b.bimestre).includes(selectedBimestre);
        });

        discList.forEach(disc => {
          let rawNota = null;
          if (bimRecord && bimRecord.notas) {
            const chaves = Object.keys(bimRecord.notas);
            const foundKey = chaves.find(k => formatDisciplina(k) === disc);
            if (foundKey) rawNota = bimRecord.notas[foundKey];
          }

          if (checkIsMissing(rawNota)) {
            discAudit[disc].semNota.push(aluno);
          } else {
            discAudit[disc].comNota.push(aluno);
            totalNotasLancadasTurma++;
          }
        });
      });

      const hasAnyGrade = totalNotasLancadasTurma > 0;
      const isComplete = totalNotasEsperadasTurma > 0 && totalNotasLancadasTurma === totalNotasEsperadasTurma;
      let turmaStatus = 'nao_iniciada';
      if (isComplete) turmaStatus = 'concluida';
      else if (hasAnyGrade) turmaStatus = 'em_andamento';

      turmasAudit.set(turmaName, {
        turma: turmaName,
        totalAtivos: alunosDaTurma.length,
        alunos: alunosDaTurma,
        disciplinas: discAudit,
        discList,
        totalNotasLancadas: totalNotasLancadasTurma,
        totalNotasEsperadas: totalNotasEsperadasTurma,
        porcentagemConcluida: totalNotasEsperadasTurma > 0 ? Math.round((totalNotasLancadasTurma / totalNotasEsperadasTurma) * 100) : 0,
        status: turmaStatus
      });
    });

    // 5. Analisar cada Aluno Ativo individualmente
    const alunosAuditList = [];
    let totalFurosGeral = 0;
    let alunosComPendenciaCount = 0;

    activeStudents.forEach(aluno => {
      const turmaName = String(aluno.turma || '').trim();
      const turmaInfo = turmasAudit.get(turmaName);
      const discList = turmaInfo ? turmaInfo.discList : [];

      const hist = aluno.historicoConceitos || [];
      const bimRecord = hist.find(b => {
        const bFormatted = formatBimestre(b.bimestre);
        return bFormatted === bimestreLabel || String(b.bimestre).includes(selectedBimestre);
      });

      const furosDeDigitacao = [];
      const materiasNaoLancadasNaTurma = [];
      const materiasComNota = [];

      discList.forEach(disc => {
        let rawNota = null;
        if (bimRecord && bimRecord.notas) {
          const chaves = Object.keys(bimRecord.notas);
          const foundKey = chaves.find(k => formatDisciplina(k) === disc);
          if (foundKey) rawNota = bimRecord.notas[foundKey];
        }

        if (checkIsMissing(rawNota)) {
          const discStats = turmaInfo?.disciplinas?.[disc];
          const outrosAlunosTemNota = discStats && discStats.comNota.length > 0;
          if (outrosAlunosTemNota) {
            furosDeDigitacao.push({
              disciplina: disc,
              colegasComNota: discStats.comNota.length,
              totalTurma: turmaInfo.totalAtivos
            });
          } else {
            materiasNaoLancadasNaTurma.push(disc);
          }
        } else {
          materiasComNota.push({
            disciplina: disc,
            nota: rawNota
          });
        }
      });

      const isTurmaNaoIniciada = turmaInfo ? turmaInfo.status === 'nao_iniciada' : true;
      const temPendencia = furosDeDigitacao.length > 0 || materiasNaoLancadasNaTurma.length > 0;

      if (temPendencia) alunosComPendenciaCount++;
      if (furosDeDigitacao.length > 0) totalFurosGeral += furosDeDigitacao.length;

      alunosAuditList.push({
        id: `${aluno.nome}__${turmaName}`,
        nome: aluno.nome,
        turma: turmaName || '-',
        tutor: aluno.tutor || 'Sem Tutor',
        isTurmaNaoIniciada,
        materiasComNota,
        furosDeDigitacao,
        materiasNaoLancadasNaTurma,
        totalPendencias: furosDeDigitacao.length + materiasNaoLancadasNaTurma.length,
        totalFuros: furosDeDigitacao.length,
        totalDisciplinasEsperadas: discList.length,
        porcentagemConcluida: discList.length > 0 ? Math.round((materiasComNota.length / discList.length) * 100) : 0
      });
    });

    // 6. Analisar cada Disciplina de forma agregada
    const discAgregadaMap = new Map();
    turmasList.forEach(turmaName => {
      const tInfo = turmasAudit.get(turmaName);
      if (!tInfo) return;
      tInfo.discList.forEach(disc => {
        if (!discAgregadaMap.has(disc)) {
          discAgregadaMap.set(disc, {
            disciplina: disc,
            turmasIniciadas: 0,
            turmasTotal: 0,
            alunosComNotaTotal: 0,
            alunosEsperadosTotal: 0,
            furosTotal: 0,
            turmasDetalhes: []
          });
        }
        const dObj = discAgregadaMap.get(disc);
        const dInfo = tInfo.disciplinas[disc];
        dObj.turmasTotal++;
        dObj.alunosEsperadosTotal += tInfo.totalAtivos;
        dObj.alunosComNotaTotal += dInfo.comNota.length;
        if (dInfo.comNota.length > 0) {
          dObj.turmasIniciadas++;
          if (dInfo.semNota.length > 0) {
            dObj.furosTotal += dInfo.semNota.length;
          }
        }
        dObj.turmasDetalhes.push({
          turma: turmaName,
          comNota: dInfo.comNota.length,
          semNota: dInfo.semNota.length,
          total: tInfo.totalAtivos,
          status: dInfo.comNota.length === tInfo.totalAtivos ? 'concluida' : (dInfo.comNota.length > 0 ? 'parcial' : 'nao_iniciada')
        });
      });
    });

    const discAgregadaList = Array.from(discAgregadaMap.values()).sort((a, b) => 
      a.disciplina.localeCompare(b.disciplina, 'pt-BR')
    );

    // Métricas gerais de resumo
    const totalAlunosAtivos = activeStudents.length;
    const turmasIniciadasCount = Array.from(turmasAudit.values()).filter(t => t.status !== 'nao_iniciada').length;
    const turmasTotalCount = turmasList.length;

    let totalNotasEscolaLancadas = 0;
    let totalNotasEscolaEsperadas = 0;
    turmasAudit.forEach(t => {
      totalNotasEscolaLancadas += t.totalNotasLancadas;
      totalNotasEscolaEsperadas += t.totalNotasEsperadas;
    });

    const taxaGeralEscola = totalNotasEscolaEsperadas > 0 
      ? Math.round((totalNotasEscolaLancadas / totalNotasEscolaEsperadas) * 100) 
      : 0;

    return {
      totalAlunosAtivos,
      alunosComPendenciaCount,
      totalFurosGeral,
      turmasIniciadasCount,
      turmasTotalCount,
      taxaGeralEscola,
      turmasList,
      turmasAudit: Array.from(turmasAudit.values()),
      alunosAuditList,
      discAgregadaList
    };
  }, [allStudents, selectedBimestre, bimestreLabel]);

  // ── Filtragem de Alunos com Pendência ───────────────────────────────────────
  const filteredAlunos = useMemo(() => {
    let list = [...auditData.alunosAuditList];

    // Filtro por turma
    if (selectedTurma !== 'Todas') {
      list = list.filter(a => a.turma === selectedTurma);
    }

    // Filtro por tipo de pendência
    if (pendingTypeFilter === 'furos') {
      list = list.filter(a => a.furosDeDigitacao.length > 0);
    } else if (pendingTypeFilter === 'parciais') {
      list = list.filter(a => !a.isTurmaNaoIniciada && (a.furosDeDigitacao.length > 0 || a.materiasNaoLancadasNaTurma.length > 0));
    } else if (pendingTypeFilter === 'nao_iniciadas') {
      list = list.filter(a => a.isTurmaNaoIniciada);
    }

    // Filtro textual
    if (searchTerm.trim()) {
      const st = searchTerm.trim().toLowerCase();
      list = list.filter(a => 
        a.nome.toLowerCase().includes(st) ||
        a.turma.toLowerCase().includes(st) ||
        a.tutor.toLowerCase().includes(st) ||
        a.furosDeDigitacao.some(f => f.disciplina.toLowerCase().includes(st)) ||
        a.materiasNaoLancadasNaTurma.some(m => m.toLowerCase().includes(st))
      );
    }

    // Ordenação
    list.sort((a, b) => {
      if (sortField === 'furos') {
        const diff = b.totalFuros - a.totalFuros;
        if (diff !== 0) return sortDirection === 'desc' ? diff : -diff;
      } else if (sortField === 'pendencias') {
        const diff = b.totalPendencias - a.totalPendencias;
        if (diff !== 0) return sortDirection === 'desc' ? diff : -diff;
      } else if (sortField === 'turma') {
        const diff = a.turma.localeCompare(b.turma, undefined, { numeric: true });
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
      }
      return sortDirection === 'asc' 
        ? a.nome.localeCompare(b.nome, 'pt-BR') 
        : b.nome.localeCompare(a.nome, 'pt-BR');
    });

    return list;
  }, [auditData.alunosAuditList, selectedTurma, pendingTypeFilter, searchTerm, sortField, sortDirection]);

  // ── Exportação para Excel ──────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      const XLSX = await getXLSX();
      const wb = XLSX.utils.book_new();

      // Aba 1: Alunos com Notas a Preencher e Pendências
      const alunosRows = filteredAlunos.map(a => ({
        'Nome do Aluno': a.nome,
        'Turma': a.turma,
        'Tutor': a.tutor,
        'Notas a Lançar (Turma com notas)': a.furosDeDigitacao.map(f => f.disciplina).join(', ') || 'Nenhum',
        'Disciplinas Pendentes na Turma': a.materiasNaoLancadasNaTurma.join(', ') || 'Nenhuma',
        'Notas Já Lançadas': a.materiasComNota.map(m => `${m.disciplina} (${m.nota})`).join(', ') || 'Nenhuma',
        'Total a Lançar': a.totalFuros,
        'Total Pendências': a.totalPendencias,
        'Status da Turma': a.isTurmaNaoIniciada ? 'Não Iniciada' : 'Em Lançamento'
      }));

      const wsAlunos = XLSX.utils.json_to_sheet(alunosRows);
      XLSX.utils.book_append_sheet(wb, wsAlunos, 'Alunos com Pendência');

      // Aba 2: Resumo por Turma
      const turmasRows = auditData.turmasAudit.map(t => ({
        'Turma': t.turma,
        'Total Alunos Ativos': t.totalAtivos,
        'Notas Lançadas': t.totalNotasLancadas,
        'Notas Esperadas': t.totalNotasEsperadas,
        'Progresso (%)': `${t.porcentagemConcluida}%`,
        'Status': t.status === 'concluida' ? 'Concluída' : (t.status === 'em_andamento' ? 'Em Andamento' : 'Não Iniciada')
      }));
      const wsTurmas = XLSX.utils.json_to_sheet(turmasRows);
      XLSX.utils.book_append_sheet(wb, wsTurmas, 'Resumo por Turma');

      // Aba 3: Resumo por Disciplina
      const discRows = auditData.discAgregadaList.map(d => ({
        'Disciplina': d.disciplina,
        'Turmas com Notas': `${d.turmasIniciadas} de ${d.turmasTotal}`,
        'Alunos Avaliados': `${d.alunosComNotaTotal} de ${d.alunosEsperadosTotal}`,
        'Alunos a Lançar': d.furosTotal,
        'Progresso Geral': `${d.alunosEsperadosTotal > 0 ? Math.round((d.alunosComNotaTotal / d.alunosEsperadosTotal) * 100) : 0}%`
      }));
      const wsDisc = XLSX.utils.json_to_sheet(discRows);
      XLSX.utils.book_append_sheet(wb, wsDisc, 'Resumo por Disciplina');

      const fileName = `Rastreabilidade_Lancamentos_${bimestreLabel.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Erro ao exportar planilha:', err);
    }
  };

  // ── Copiar Resumo para WhatsApp / Memorando ───────────────────────────────
  const handleCopySummary = () => {
    const furosAlunos = auditData.alunosAuditList.filter(a => a.totalFuros > 0);
    let texto = `📊 *ACOMPANHAMENTO DE LANÇAMENTOS — ${bimestreLabel.toUpperCase()}*\n`;
    texto += `🏫 Progresso Geral: ${auditData.taxaGeralEscola}% concluído\n`;
    texto += `👥 Alunos Ativos: ${auditData.totalAlunosAtivos} | Pendentes: ${auditData.alunosComPendenciaCount}\n`;
    texto += `📝 Alunos aguardando nota em turmas iniciadas: ${auditData.totalFurosGeral} em ${furosAlunos.length} alunos\n\n`;

    if (furosAlunos.length > 0) {
      texto += `📋 *ALUNOS AGUARDANDO DIGITAÇÃO DE NOTAS:*\n`;
      furosAlunos.slice(0, 20).forEach(a => {
        const mats = a.furosDeDigitacao.map(f => f.disciplina).join(', ');
        texto += `• *${a.nome}* (${a.turma}): aguardando em *${mats}*\n`;
      });
      if (furosAlunos.length > 20) {
        texto += `... e mais ${furosAlunos.length - 20} alunos com pendência.\n`;
      }
    } else {
      texto += `✅ Todos os alunos das turmas em lançamento estão com as notas em dia!\n`;
    }

    navigator.clipboard.writeText(texto).then(() => {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 3000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-[98vw] max-w-[1680px] h-[95vh] max-h-[96vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">
        
        {/* ── 1. Topo / Cabeçalho do Modal ────────────────────────────────────── */}
        <div className="px-5 sm:px-7 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Rastreabilidade e Auditoria de Lançamentos
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {bimestreLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detecção automática de turmas iniciadas, disciplinas lançadas e alunos ativos com notas faltantes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="Fechar"
            aria-label="Fechar modal de rastreabilidade"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Cards de KPIs Rápidos (Centralizados e Harmoniosos) ────────── */}
        <div className="px-5 sm:px-7 py-3 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-2xs text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Alunos Ativos</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight my-0.5">
              {auditData.totalAlunosAtivos}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {auditData.alunosComPendenciaCount} com notas a lançar
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-2xs text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${auditData.totalFurosGeral > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
              <span>Pendências no Grupo</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${auditData.totalFurosGeral > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
            </div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight my-0.5 ${auditData.totalFurosGeral > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {auditData.totalFurosGeral}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {auditData.totalFurosGeral > 0 ? 'Alunos aguardando nota nesta matéria' : 'Turmas em dia com as notas'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-2xs text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <School className="w-3.5 h-3.5 text-slate-400" />
              <span>Turmas com Dados</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight my-0.5">
              {auditData.turmasIniciadasCount} <span className="text-sm sm:text-base font-semibold text-slate-400">/ {auditData.turmasTotalCount}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {auditData.turmasTotalCount - auditData.turmasIniciadasCount} turmas ainda não iniciadas
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-2xs text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Conclusão Global</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight my-0.5">
              {auditData.taxaGeralEscola}%
            </div>
            <div className="w-full max-w-[140px] bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden mx-auto">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${auditData.taxaGeralEscola}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 3. Barra de Seletores e Filtros (Posicionada Acima das Abas) ──── */}
        <div className="px-5 sm:px-7 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Busca */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar aluno, turma, tutor ou matéria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filtro por Turma */}
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              aria-label="Filtrar por Turma"
              className="text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:bg-white focus:outline-none cursor-pointer transition-all"
            >
              <option value="Todas">Todas as Turmas ({auditData.turmasTotalCount})</option>
              {auditData.turmasList.map(t => (
                <option key={t} value={t}>Turma {t}</option>
              ))}
            </select>

            {/* Filtro por Tipo de Pendência */}
            <select
              value={pendingTypeFilter}
              onChange={(e) => setPendingTypeFilter(e.target.value)}
              aria-label="Filtrar por Tipo de Pendência"
              className="text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:bg-white focus:outline-none cursor-pointer transition-all"
            >
              <option value="todos">Todas as Pendências ({auditData.alunosComPendenciaCount})</option>
              <option value="furos">Apenas Notas a Preencher no Grupo ({auditData.totalFurosGeral})</option>
              <option value="parciais">⏳ Turmas em Lançamento</option>
              <option value="nao_iniciadas">📋 Turmas Não Iniciadas</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 shrink-0 font-medium self-end sm:self-center">
            Mostrando <strong className="text-slate-800">{filteredAlunos.length}</strong> alunos ativos
          </div>
        </div>

        {/* ── 4. Barra de Abas de Navegação (Clean & Minimalista) ────────────── */}
        <div className="px-5 sm:px-7 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('alunos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'alunos'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Alunos com Pendência
            </button>

            <button
              onClick={() => setActiveTab('turmas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'turmas'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              Visão por Turma ({auditData.turmasTotalCount})
            </button>

            <button
              onClick={() => setActiveTab('disciplinas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'disciplinas'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Disciplinas ({auditData.discAgregadaList.length})
            </button>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
              title="Copiar texto com resumo para WhatsApp"
            >
              {copiedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Resumo</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs transition-all cursor-pointer"
              title="Exportar planilha completa (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* ── 5. Conteúdo das Abas ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">

          {/* ════ ABA 1: ALUNOS COM PENDÊNCIA ════ */}
          {activeTab === 'alunos' && (
            <div className="space-y-4">
              {/* Tabela de Alunos */}
              <div className="bg-white rounded-xl border border-slate-200/70 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">
                          <button 
                            onClick={() => { setSortField('nome'); setSortDirection(p => p === 'asc' ? 'desc' : 'asc'); }}
                            className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                          >
                            Aluno
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-3">
                          <button 
                            onClick={() => { setSortField('turma'); setSortDirection(p => p === 'asc' ? 'desc' : 'asc'); }}
                            className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                          >
                            Turma
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-3">Tutor</th>
                        <th className="py-3 px-3">
                          <button 
                            onClick={() => { setSortField('furos'); setSortDirection(p => p === 'asc' ? 'desc' : 'asc'); }}
                            className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer text-amber-700"
                          >
                            Notas a Preencher na Turma
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-3">Matérias Pendentes na Turma</th>
                        <th className="py-3 px-3 text-right">Progresso</th>
                        {onSelectStudent && <th className="py-3 px-3 text-center">Perfil</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAlunos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                            <p className="font-bold text-slate-700 text-sm">Nenhuma pendência encontrada com os filtros selecionados.</p>
                            <p className="text-xs text-slate-400 mt-1">Todos os alunos ativos atendem aos critérios ou já foram 100% lançados.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAlunos.map((aluno) => {
                          const temFuros = aluno.furosDeDigitacao.length > 0;
                          return (
                            <tr 
                              key={aluno.id}
                              className={`transition-colors hover:bg-slate-50/60 ${
                                temFuros ? 'bg-amber-50/20' : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                <div className="flex items-center gap-2">
                                  {temFuros && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Aluno aguardando nota nesta matéria" />
                                  )}
                                  <span>{aluno.nome}</span>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                                  {aluno.turma}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-slate-500 font-medium">
                                {aluno.tutor}
                              </td>

                              <td className="py-3 px-3">
                                {temFuros ? (
                                  <div className="flex flex-wrap gap-1">
                                    {aluno.furosDeDigitacao.map((f, i) => (
                                      <span 
                                        key={i}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70"
                                        title={`Outros ${f.colegasComNota} alunos da turma ${aluno.turma} já têm nota nessa matéria`}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        {f.disciplina}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs">Nenhum</span>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                {aluno.materiasNaoLancadasNaTurma.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-2xl">
                                    {aluno.materiasNaoLancadasNaTurma.map((m, i) => (
                                      <span 
                                        key={i}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-600 font-medium border border-slate-200/50"
                                      >
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Todas as matérias entregues
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right font-mono font-semibold">
                                <span className={aluno.porcentagemConcluida === 100 ? 'text-emerald-600' : aluno.porcentagemConcluida > 0 ? 'text-blue-600' : 'text-slate-300'}>
                                  {aluno.porcentagemConcluida}%
                                </span>
                              </td>

                              {onSelectStudent && (
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => {
                                      onSelectStudent(aluno.nome);
                                      onClose();
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Ver ficha do aluno"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ ABA 2: VISÃO POR TURMA ════ */}
          {activeTab === 'turmas' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {(selectedTurma === 'Todas' 
                  ? auditData.turmasAudit 
                  : auditData.turmasAudit.filter(t => t.turma === selectedTurma)
                ).map((t) => {
                  const isEmAndamento = t.status === 'em_andamento';
                  const isConcluida = t.status === 'concluida';
                  return (
                    <div 
                      key={t.turma}
                      className={`p-4 rounded-2xl border transition-all bg-white shadow-2xs ${
                        isConcluida 
                          ? 'border-emerald-200/80 hover:border-emerald-300' 
                          : isEmAndamento 
                            ? 'border-blue-200/80 hover:border-blue-300' 
                            : 'border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900">
                            Turma {t.turma}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">
                            ({t.totalAtivos} ativos)
                          </span>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isConcluida 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : isEmAndamento 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isConcluida ? 'Concluída' : isEmAndamento ? 'Em Lançamento' : 'Não Iniciada'}
                        </span>
                      </div>

                      {/* Barra de progresso */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Completude:</span>
                          <strong className="text-slate-800 font-mono">{t.porcentagemConcluida}%</strong>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isConcluida ? 'bg-emerald-500' : isEmAndamento ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                            style={{ width: `${t.porcentagemConcluida}%` }}
                          />
                        </div>
                      </div>

                      {/* Lista resumida de disciplinas da turma */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Disciplinas ({t.discList.length}):
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {t.discList.map(disc => {
                            const dStats = t.disciplinas[disc];
                            const discConcluida = dStats.comNota.length === t.totalAtivos;
                            const discParcial = dStats.comNota.length > 0 && dStats.semNota.length > 0;
                            return (
                              <span
                                key={disc}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  discConcluida
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : discParcial
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                      : 'bg-slate-50 text-slate-400 border border-slate-200/40'
                                }`}
                                title={`${disc}: ${dStats.comNota.length} de ${t.totalAtivos} alunos`}
                              >
                                {disc}
                                <span className="opacity-70 font-mono">
                                  {dStats.comNota.length}/{t.totalAtivos}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════ ABA 3: VISÃO POR DISCIPLINA (Clean & Agrupada) ════ */}
          {activeTab === 'disciplinas' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/70 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-5">Disciplina</th>
                        <th className="py-3.5 px-4">Turmas com Lançamento</th>
                        <th className="py-3.5 px-4">Alunos Avaliados</th>
                        <th className="py-3.5 px-4 text-center">Alunos a Preencher</th>
                        <th className="py-3.5 px-4 text-right">Progresso Global</th>
                        <th className="py-3.5 px-5">Detalhamento por Turma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditData.discAgregadaList.map((discObj) => {
                        const pct = discObj.alunosEsperadosTotal > 0 
                          ? Math.round((discObj.alunosComNotaTotal / discObj.alunosEsperadosTotal) * 100) 
                          : 0;
                        const turmasComNotas = discObj.turmasDetalhes.filter(td => td.comNota > 0);
                        const turmasPendentesCount = discObj.turmasDetalhes.filter(td => td.comNota === 0).length;

                        return (
                          <tr key={discObj.disciplina} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-5 font-semibold text-slate-800 text-sm">
                              {discObj.disciplina}
                            </td>

                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              <span className={discObj.turmasIniciadas > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                                {discObj.turmasIniciadas}
                              </span>
                              <span className="text-slate-400"> / {discObj.turmasTotal} turmas</span>
                            </td>

                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              <strong className={discObj.alunosComNotaTotal > 0 ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                                {discObj.alunosComNotaTotal}
                              </strong>
                              <span className="text-slate-400"> / {discObj.alunosEsperadosTotal} ativos</span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {discObj.furosTotal > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/70">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  {discObj.furosTotal} a lançar
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">Nenhum</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-semibold">
                              <span className={pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-slate-300'}>
                                {pct}%
                              </span>
                            </td>

                            <td className="py-3.5 px-5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {turmasComNotas.map(td => (
                                  <span
                                    key={td.turma}
                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                                      td.status === 'concluida' 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70' 
                                        : 'bg-amber-50 text-amber-900 border-amber-200/80'
                                    }`}
                                    title={`Turma ${td.turma}: ${td.comNota} de ${td.total} alunos avaliados`}
                                  >
                                    Turma {td.turma} ({td.comNota}/{td.total})
                                  </span>
                                ))}
                                {turmasPendentesCount > 0 && (
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/50">
                                    {turmasComNotas.length === 0
                                      ? 'Nenhuma turma iniciada'
                                      : `+${turmasPendentesCount} turma${turmasPendentesCount > 1 ? 's' : ''} pendente${turmasPendentesCount > 1 ? 's' : ''}`}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── 5. Rodapé do Modal (Clean & Minimalista) ─────────────────────── */}
        <div className="p-3 sm:px-7 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Auditoria estrita para alunos com status Ativo. Inativos e transferidos são ignorados.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            Fechar Auditoria
          </button>
        </div>

      </div>
    </div>
  );
};

export default LaunchTraceabilityModal;

