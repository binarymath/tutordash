// ─────────────────────────────────────────────────────────────
// components/Dashboard.jsx — Vista principal de tutores/turmas
// Design Clean, Minimalista e Executivo • Acompanhamento 3º Bimestre
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, X, UserCheck, ArrowUpDown, ArrowUp, ArrowDown,
  Users, GraduationCap, Filter, FileSpreadsheet,
  AlertTriangle, Sparkles, ChevronRight, BookOpen,
  TrendingUp, TrendingDown, Minus, Calendar, CheckCircle2,
  Clock, Compass, Info, ChevronDown, ClipboardList
} from 'lucide-react';
import { checkIsTutor, parseGrade, toScale10, formatDisciplina, isNonSubjectHeader, checkIsMissing } from '../utils/helpers';
import { getXLSX } from '../services/api';
import RankingPanel from './RankingPanel';

const SortIcon = ({ columnKey, sortConfig }) => {
  if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
  return sortConfig.direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-blue-600" />
    : <ArrowDown className="w-3 h-3 text-blue-600" />;
};

const ColumnSortIndicator = ({ active, direction }) => {
  if (!active) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 shrink-0" />;
  return direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-blue-600 ml-1 shrink-0" />
    : <ArrowDown className="w-3 h-3 text-blue-600 ml-1 shrink-0" />;
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-blue-50 text-blue-700 border-blue-200/70',
    'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    'bg-slate-50 text-slate-800 border-slate-200',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const renderScoreBadge = (scoreStr, isCurrentBim = false, isProminent = false) => {
  if (!scoreStr || scoreStr === 'S/D' || scoreStr === 'S/N' || scoreStr === '-' || scoreStr === '—') {
    return (
      <span className={`font-semibold text-slate-400 bg-slate-100/80 rounded-lg border border-slate-200/80 inline-flex items-center justify-center gap-1 ${
        isProminent ? 'text-xs min-w-[72px] px-3.5 py-1.5' : 'text-[11px] px-2 py-0.5'
      }`}>
        {isCurrentBim ? 'Em lançamento' : 'S/D'}
      </span>
    );
  }
  const num = parseFloat(String(scoreStr).replace(',', '.'));
  let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200 font-semibold';
  if (!isNaN(num)) {
    if (num < 5.0) {
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    } else if (num < 7.0) {
      badgeStyle = 'bg-amber-50/80 text-amber-800 border-amber-200 font-semibold';
    } else {
      badgeStyle = 'bg-blue-50/90 text-blue-700 border-blue-200/80 font-bold';
    }
  }
  return (
    <span className={`inline-flex items-center justify-center rounded-lg border ${badgeStyle} ${
      isProminent ? 'text-sm font-black min-w-[76px] px-4 py-1 shadow-2xs' : 'text-xs font-semibold px-2.5 py-0.5'
    } ${isCurrentBim ? 'ring-1 ring-blue-500/30' : ''}`}>
      {scoreStr}
    </span>
  );
};

// ── Utilitários de Inteligência Bimestral ───────────────────────
const matchesBimestre = (bimName, selectedBim) => {
  if (!bimName) return false;
  const raw = String(bimName).toLowerCase();
  if (selectedBim === '1') return raw.includes('1º') || raw.includes('1o') || raw.includes('1 bim') || raw.includes('1bim') || raw.includes('primeiro');
  if (selectedBim === '2') return raw.includes('2º') || raw.includes('2o') || raw.includes('2 bim') || raw.includes('2bim') || raw.includes('segundo');
  if (selectedBim === '3') return raw.includes('3º') || raw.includes('3o') || raw.includes('3 bim') || raw.includes('3bim') || raw.includes('terceiro');
  if (selectedBim === '4') return raw.includes('4º') || raw.includes('4o') || raw.includes('4 bim') || raw.includes('4bim') || raw.includes('quarto');
  if (selectedBim === 'geral') return true;
  return false;
};

const hasValidTypedGrade = (raw) => {
  if (raw === undefined || raw === null) return false;
  const str = String(raw).trim();
  if (!str || str === '-' || str === '—' || str === 'S/D' || str === 'S/N') return false;
  const lower = str.toLowerCase();
  if (lower === 'sem nota' || lower === 'pendente' || lower === 'ausente' || lower === 'null' || lower === 'undefined') {
    return false;
  }
  const scaled = toScale10(str);
  if (scaled !== null) return true;
  const parsed = parseFloat(str.replace(',', '.'));
  return !isNaN(parsed);
};

const extractBimestreGrade = (student, targetBimNum) => {
  const hist = student.historicoConceitos || [];
  const bim = hist.find(b => matchesBimestre(b.bimestre, String(targetBimNum)));

  if (!bim || !bim.notas) return null;
  const validNotas = Object.entries(bim.notas)
    .filter(([k]) => !isNonSubjectHeader(k))
    .map(([, v]) => parseGrade(v))
    .filter(n => n > 0);

  if (validNotas.length === 0) return null;
  return validNotas.reduce((s, n) => s + n, 0) / validNotas.length;
};

const extractMediaGeral = (student) => {
  const b1 = extractBimestreGrade(student, 1);
  const b2 = extractBimestreGrade(student, 2);
  const b3 = extractBimestreGrade(student, 3);
  const validBims = [b1, b2, b3].filter(v => v !== null && !isNaN(v) && v > 0);
  if (validBims.length > 0) {
    return validBims.reduce((acc, v) => acc + v, 0) / validBims.length;
  }
  if (student.consilhoBimestral && student.consilhoBimestral !== 'S/D' && student.consilhoBimestral !== '-') {
    const parsed = parseFloat(String(student.consilhoBimestral).replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const calculateTrend = (b1, b2, b3) => {
  if (b3 !== null && b2 !== null) {
    const diff = b3 - b2;
    if (diff >= 0.25) return { icon: <TrendingUp className="w-3.5 h-3.5 text-blue-600 inline" />, text: '↗️', label: 'Evoluindo', style: 'text-blue-700 bg-blue-50 border-blue-200/70' };
    if (diff <= -0.25) return { icon: <TrendingDown className="w-3.5 h-3.5 text-rose-600 inline" />, text: '↘️', label: 'Em Queda', style: 'text-rose-700 bg-rose-50 border-rose-200/70' };
    return { icon: <Minus className="w-3.5 h-3.5 text-slate-400 inline" />, text: '➡️', label: 'Estável', style: 'text-slate-600 bg-slate-50 border-slate-200' };
  }
  if (b2 !== null && b1 !== null) {
    const diff = b2 - b1;
    if (diff >= 0.25) return { icon: <TrendingUp className="w-3.5 h-3.5 text-blue-600 inline" />, text: '↗️', label: 'Evoluindo', style: 'text-blue-700 bg-blue-50 border-blue-200/70' };
    if (diff <= -0.25) return { icon: <TrendingDown className="w-3.5 h-3.5 text-rose-600 inline" />, text: '↘️', label: 'Em Queda', style: 'text-rose-700 bg-rose-50 border-rose-200/70' };
  }
  return { icon: <Clock className="w-3 h-3 text-slate-400 inline" />, text: '⏳', label: 'Em lançamento', style: 'text-slate-500 bg-slate-50 border-slate-200/60' };
};

const Dashboard = ({
  allStudents = [], sortedData = [], filterMode, setFilterMode,
  selectedValue, setSelectedValue, optionsList = [], stats = {},
  searchTerm, setSearchTerm, setSelectedStudent, setSelectedTurma, sortConfig, handleSort,
  showOnlyActive, setShowOnlyActive, rankingStudents, filterLabel, onOpenLowGradesReport,
  onOpenTraceability
}) => {
  const [selectedBimestre, setSelectedBimestre] = useState('3');
  const [showRanking, setShowRanking] = useState(false);
  
  // Modos de Visão das Notas:
  // - isMediasOnly: Somente as médias gerais consolidadas (Conselho de Classe e Prova Paulista)
  // - showProvaPaulista: Todas as disciplinas da Prova Paulista + Média da Prova Paulista
  // - showConselhoClasse: Todas as disciplinas do Conselho de Classe + Média do Conselho de Classe
  const [isMediasOnly, setIsMediasOnly] = useState(true);
  const [showProvaPaulista, setShowProvaPaulista] = useState(false);
  const [showConselhoClasse, setShowConselhoClasse] = useState(false);
  const [discSort, setDiscSort] = useState({ key: null, direction: 'asc' });

  // ── Deduplicação Preventiva ────────────────────────────────────
  const uniqueStudents = useMemo(() => {
    const seen = new Set();
    const result = [];
    sortedData.forEach(student => {
      const key = `${student.nome}__${student.turma}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(student);
      }
    });
    return result;
  }, [sortedData]);

  // ── Enriquecimento Pedagógico dos Alunos ───────────────────────
  const enrichedStudents = useMemo(() => {
    return uniqueStudents.map(student => {
      const b1 = extractBimestreGrade(student, 1);
      const b2 = extractBimestreGrade(student, 2);
      const b3 = extractBimestreGrade(student, 3);
      const mediaGeralVal = extractMediaGeral(student);
      const trend = calculateTrend(b1, b2, b3);

      return {
        ...student,
        b1Val: b1,
        b2Val: b2,
        b3Val: b3,
        mediaGeralVal,
        b1Str: b1 !== null ? b1.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
        b2Str: b2 !== null ? b2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
        b3Str: b3 !== null ? b3.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
        mediaGeralStr: mediaGeralVal !== null ? mediaGeralVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (student.consilhoBimestral || '-'),
        trend,
      };
    });
  }, [uniqueStudents]);

  // ── Controles de Visão das Notas ──────────────────────────────
  const handleSelectMediasOnly = () => {
    setIsMediasOnly(true);
    setShowProvaPaulista(false);
    setShowConselhoClasse(false);
  };

  const handleToggleProvaPaulista = () => {
    if (isMediasOnly) {
      setIsMediasOnly(false);
      setShowProvaPaulista(true);
    } else if (showProvaPaulista) {
      if (showConselhoClasse) {
        setShowProvaPaulista(false);
      } else {
        setIsMediasOnly(true);
        setShowProvaPaulista(false);
      }
    } else {
      setShowProvaPaulista(true);
    }
  };

  const handleToggleConselhoClasse = () => {
    if (isMediasOnly) {
      setIsMediasOnly(false);
      setShowConselhoClasse(true);
    } else if (showConselhoClasse) {
      if (showProvaPaulista) {
        setShowConselhoClasse(false);
      } else {
        setIsMediasOnly(true);
        setShowConselhoClasse(false);
      }
    } else {
      setShowConselhoClasse(true);
    }
  };

  // ── Extração Dinâmica de Disciplinas por Bimestre ──────────────
  const ccDisciplinasList = useMemo(() => {
    const map = new Map();
    enrichedStudents.forEach(s => {
      const hist = s.historicoConceitos || [];
      hist.forEach(b => {
        if (matchesBimestre(b.bimestre, selectedBimestre)) {
          Object.keys(b.notas || {}).forEach(k => {
            const trimmed = String(k || '').trim();
            if (trimmed && !isNonSubjectHeader(trimmed) && !map.has(trimmed)) {
              map.set(trimmed, formatDisciplina(trimmed));
            }
          });
        }
      });
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [enrichedStudents, selectedBimestre]);

  // Disciplinas da Prova Paulista para o bimestre selecionado que REALMENTE possuem notas digitadas
  const ppDisciplinasList = useMemo(() => {
    const map = new Map();
    enrichedStudents.forEach(s => {
      const hist = s.historicoProvas || [];
      hist.forEach(p => {
        if (matchesBimestre(p.bimestre, selectedBimestre)) {
          Object.entries(p.notas || {}).forEach(([k, rawVal]) => {
            const trimmed = String(k || '').trim();
            if (trimmed && !isNonSubjectHeader(trimmed) && hasValidTypedGrade(rawVal)) {
              if (!map.has(trimmed)) {
                map.set(trimmed, formatDisciplina(trimmed));
              }
            }
          });
        }
      });
    });

    // Se o histórico não detalhar p.notas por disciplina, checa notas específicas em s.ppMat / s.ppPort
    if (map.size === 0) {
      const hasMat = enrichedStudents.some(s => hasValidTypedGrade(s.ppMat));
      const hasPort = enrichedStudents.some(s => hasValidTypedGrade(s.ppPort));
      if (hasMat) map.set('MATEMÁTICA', 'Matemática');
      if (hasPort) map.set('LÍNGUA PORTUGUESA', 'Língua Portuguesa');
    }

    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [enrichedStudents, selectedBimestre]);

  const getStudentCCSubject = useCallback((student, discKey) => {
    const hist = student.historicoConceitos || [];
    if (selectedBimestre === 'geral') {
      const vals = [];
      hist.forEach(b => {
        if (b.notas && b.notas[discKey] !== undefined) {
          const n = parseGrade(b.notas[discKey]);
          if (n > 0) vals.push(n);
        }
      });
      if (vals.length === 0) return '-';
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    const bim = hist.find(b => matchesBimestre(b.bimestre, selectedBimestre));
    if (!bim || !bim.notas || bim.notas[discKey] === undefined) {
      const normK = formatDisciplina(discKey).toUpperCase();
      if (normK.includes('MATEM') && student.ccMat && student.ccMat !== '-') return student.ccMat;
      if (normK.includes('PORTUG') && student.ccPort && student.ccPort !== '-') return student.ccPort;
      return '-';
    }
    const val = bim.notas[discKey];
    if (val === '' || val === null || val === undefined) return '-';
    const n = parseGrade(val);
    return n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : String(val);
  }, [selectedBimestre]);

  const getStudentPPSubject = useCallback((student, discKey) => {
    const hist = student.historicoProvas || [];
    if (selectedBimestre === 'geral') {
      const vals = [];
      hist.forEach(p => {
        if (p.notas && p.notas[discKey] !== undefined) {
          const n = toScale10(p.notas[discKey]);
          if (n !== null && n > 0) vals.push(n);
        }
      });
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return avg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      }
      const normK = formatDisciplina(discKey).toUpperCase();
      if (normK.includes('MATEM') && student.ppMat && student.ppMat !== '-' && student.ppMat !== 'S/D') return student.ppMat;
      if (normK.includes('PORTUG') && student.ppPort && student.ppPort !== '-' && student.ppPort !== 'S/D') return student.ppPort;
      return '-';
    }
    const prova = hist.find(p => matchesBimestre(p.bimestre, selectedBimestre));
    if (prova && prova.notas && prova.notas[discKey] !== undefined) {
      const val = prova.notas[discKey];
      const n = toScale10(val);
      return n !== null ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : (val || '-');
    }
    const normK = formatDisciplina(discKey).toUpperCase();
    if (normK.includes('MATEM') && student.ppMat && student.ppMat !== '-' && student.ppMat !== 'S/D') return student.ppMat;
    if (normK.includes('PORTUG') && student.ppPort && student.ppPort !== '-' && student.ppPort !== 'S/D') return student.ppPort;
    return '-';
  }, [selectedBimestre]);

  const getCCMedia = useCallback((student) => {
    if (selectedBimestre === '1') return student.b1Str;
    if (selectedBimestre === '2') return student.b2Str;
    if (selectedBimestre === '3') return student.b3Str;
    return student.mediaGeralStr;
  }, [selectedBimestre]);

  // A coluna de frequência é a última coluna com dados da planilha do conselho de classe (mapão)
  const getStudentCCFrequencia = useCallback((student) => {
    const hist = student.historicoConceitos || [];
    let bimObj = null;
    if (selectedBimestre !== 'geral') {
      bimObj = hist.find(b => matchesBimestre(b.bimestre, selectedBimestre));
    }
    if (!bimObj && hist.length > 0) {
      bimObj = hist[hist.length - 1];
    }
    
    const rawVal = bimObj?.freqBimestre || bimObj?.frequencia || student.frequenciaGeralRaw || null;
    if (!rawVal || rawVal === '-' || rawVal === 'S/D' || rawVal === 'S/N') {
      if (student.frequenciaMedia != null) {
        return {
          num: student.frequenciaMedia,
          display: `${student.frequenciaMedia.toFixed(1).replace(/\.0$/, '')}%`
        };
      }
      return { num: null, display: '-' };
    }

    const str = String(rawVal).trim();
    const num = parseFloat(str.replace('%', '').replace(',', '.'));
    if (isNaN(num)) {
      return { num: null, display: str };
    }
    const finalNum = (num <= 1 && !str.includes('%')) ? num * 100 : num;
    return {
      num: finalNum,
      display: `${finalNum.toFixed(1).replace(/\.0$/, '')}%`
    };
  }, [selectedBimestre]);

  const getPPMedia = useCallback((student) => {
    if (selectedBimestre === 'geral') {
      return student.provaPaulista;
    }
    const hist = student.historicoProvas || [];
    const prova = hist.find(p => matchesBimestre(p.bimestre, selectedBimestre));
    if (prova && prova.resultado && prova.resultado !== 'S/D' && prova.resultado !== 'S/N' && prova.resultado !== '-') {
      const scaled = toScale10(prova.resultado);
      return scaled !== null
        ? scaled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : prova.resultado;
    }
    return '-';
  }, [selectedBimestre]);

  const handleDiscSort = (key) => {
    setDiscSort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const handleHeaderSort = (key) => {
    setDiscSort({ key: null, direction: 'asc' });
    handleSort(key);
  };

  const displayedStudents = useMemo(() => {
    if (!discSort.key) return enrichedStudents;
    const { key, direction } = discSort;
    return [...enrichedStudents].sort((a, b) => {
      let valA = -1;
      let valB = -1;
      if (key === 'cc_media') {
        valA = parseGrade(getCCMedia(a));
        valB = parseGrade(getCCMedia(b));
      } else if (key === 'pp_media') {
        valA = parseGrade(getPPMedia(a));
        valB = parseGrade(getPPMedia(b));
      } else if (key === 'frequencia') {
        valA = getStudentCCFrequencia(a).num ?? -1;
        valB = getStudentCCFrequencia(b).num ?? -1;
      } else if (key.startsWith('cc_disc_')) {
        const dKey = key.replace('cc_disc_', '');
        valA = parseGrade(getStudentCCSubject(a, dKey));
        valB = parseGrade(getStudentCCSubject(b, dKey));
      } else if (key.startsWith('pp_disc_')) {
        const dKey = key.replace('pp_disc_', '');
        valA = parseGrade(getStudentPPSubject(a, dKey));
        valB = parseGrade(getStudentPPSubject(b, dKey));
      }
      return direction === 'asc' ? valA - valB : valB - valA;
    });
  }, [enrichedStudents, discSort, getCCMedia, getPPMedia, getStudentCCFrequencia, getStudentCCSubject, getStudentPPSubject]);

  // ── Diagnóstico Contextual Limpo e Dinâmico por Bimestre ──────
  const pedagogicalStats = useMemo(() => {
    const list = enrichedStudents;
    const total = list.length;
    if (total === 0) {
      return {
        total: 0,
        totalAvaliados: 0,
        consolidados: 0,
        emApoio: 0,
        emRisco: 0,
        evoluindo: 0,
        emLancamento: 0,
        semTutor: 0,
        turmasCount: 0,
        ccMedia: '-',
        ppMedia: '-',
        card1Badge: selectedBimestre === 'geral' ? 'Matriculados' : selectedBimestre === '3' ? '3º Bi (Atual)' : `${selectedBimestre}º Bimestre`,
        card1Subtitle: 'Sem alunos matriculados',
        card2Badge: selectedBimestre === 'geral' ? 'Grupos' : `${selectedBimestre}º Bi`,
        card2Subtitle: 'Classes organizadas no sistema',
        cardCCBadge: selectedBimestre === 'geral' ? 'Geral' : `${selectedBimestre}º Bi`,
        cardCCSubtitle: 'Sem notas disponíveis',
        card3Badge: null,
        card3Subtitle: 'Média diagnóstica do grupo',
        card4Badge: selectedBimestre === 'geral' ? 'Conselho' : selectedBimestre === '3' ? '3º Bi (Parcial)' : `${selectedBimestre}º Bi`,
        card4Subtitle: 'Médias consolidadas abaixo de 5,0',
      };
    }

    let consolidados = 0;
    let emApoio = 0;
    let emRisco = 0;
    let totalNotasEmRisco = 0;
    let evoluindo = 0;
    let emLancamento = 0;
    let semTutor = 0;
    let totalAvaliados = 0;
    let ccSoma = 0;
    let ccQtd = 0;
    let ppSoma = 0;
    let ppQtd = 0;
    let geralPPSoma = 0;
    let geralPPQtd = 0;
    const turmasNoPeriodo = new Set();

    list.forEach(s => {
      if (s.tutor === 'Sem Tutor') semTutor++;
      if (s.trend?.text === '↗️') evoluindo++;

      // Prova Paulista Geral (acumulada da escola)
      const generalPP = parseFloat(String(s.provaPaulista).replace(',', '.'));
      if (!isNaN(generalPP)) {
        geralPPSoma += generalPP;
        geralPPQtd++;
      }

      // Prova Paulista específica por bimestre se disponível
      if (selectedBimestre !== 'geral') {
        const targetNum = parseInt(selectedBimestre, 10);
        const histProvas = s.historicoProvas || [];
        const provaItem = histProvas.find(p => {
          const raw = String(p.bimestre || '').toLowerCase();
          if (targetNum === 1) return raw.includes('1º') || raw.includes('1o') || raw.includes('1 bim') || raw.includes('1bim') || raw.includes('primeiro');
          if (targetNum === 2) return raw.includes('2º') || raw.includes('2o') || raw.includes('2 bim') || raw.includes('2bim') || raw.includes('segundo');
          if (targetNum === 3) return raw.includes('3º') || raw.includes('3o') || raw.includes('3 bim') || raw.includes('3bim') || raw.includes('terceiro');
          return false;
        });
        if (provaItem && provaItem.resultado && provaItem.resultado !== 'S/D' && provaItem.resultado !== 'S/N' && provaItem.resultado !== '-') {
          const scaled = toScale10(provaItem.resultado);
          const num = scaled !== null ? scaled : parseFloat(String(provaItem.resultado).replace(',', '.'));
          if (!isNaN(num)) {
            ppSoma += num;
            ppQtd++;
          }
        }
      }

      // Nota do período selecionado
      let grade = null;
      if (selectedBimestre === '1') {
        grade = s.b1Val;
      } else if (selectedBimestre === '2') {
        grade = s.b2Val;
      } else if (selectedBimestre === '3') {
        grade = s.b3Val;
      } else {
        grade = s.mediaGeralVal;
      }

      if (grade !== null) {
        totalAvaliados++;
        if (!isNaN(grade) && grade > 0) {
          ccSoma += grade;
          ccQtd++;
        }
        if (s.turma) turmasNoPeriodo.add(s.turma);
        if (grade >= 7.0) consolidados++;
        else if (grade >= 5.0) emApoio++;
      } else {
        if (selectedBimestre === '3') {
          emLancamento++;
        }
      }

      // ── Análise Alinhada ao Conselho de Classe (Notas < 5,0) ────
      let alunoEmRiscoCC = false;
      let qtdNotasRiscoCC = 0;

      if (selectedBimestre !== 'geral') {
        const hist = s.historicoConceitos || [];
        const bimObj = hist.find(b => matchesBimestre(b.bimestre, selectedBimestre));
        if (bimObj && bimObj.notas) {
          Object.entries(bimObj.notas).forEach(([k, rawVal]) => {
            if (isNonSubjectHeader(k)) return;
            if (checkIsMissing(rawVal)) return;
            const n = parseGrade(rawVal);
            if (!isNaN(n) && n > 0 && n < 5.0) {
              alunoEmRiscoCC = true;
              qtdNotasRiscoCC++;
            }
          });
        }
        // Fallback: se a média geral do bimestre for < 5.0
        if (!alunoEmRiscoCC && grade !== null && grade > 0 && grade < 5.0) {
          alunoEmRiscoCC = true;
          qtdNotasRiscoCC = 1;
        }
      } else {
        // Média Geral
        if (grade !== null && grade > 0 && grade < 5.0) {
          alunoEmRiscoCC = true;
          qtdNotasRiscoCC = 1;
        } else if (grade === null && !isNaN(generalPP) && generalPP < 5.0) {
          alunoEmRiscoCC = true;
          qtdNotasRiscoCC = 1;
        }
      }

      if (alunoEmRiscoCC) {
        emRisco++;
        totalNotasEmRisco += qtdNotasRiscoCC;
      }
    });

    // Média do Conselho de Classe
    let ccMediaCalc = '-';
    if (ccQtd > 0) {
      ccMediaCalc = (ccSoma / ccQtd).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (stats.performanceStats?.ccAvg && stats.performanceStats.ccAvg !== 'S/D') {
      ccMediaCalc = stats.performanceStats.ccAvg;
    }

    // Média de Prova Paulista (específica do bimestre se houver, ou geral diagnóstica)
    let ppMediaCalc = '-';
    if (ppQtd > 0) {
      ppMediaCalc = (ppSoma / ppQtd).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (geralPPQtd > 0) {
      ppMediaCalc = (geralPPSoma / geralPPQtd).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const turmasCount = turmasNoPeriodo.size > 0 ? turmasNoPeriodo.size : (stats.totalGroups || 1);

    // Textos e Badges dinâmicos para cada Card
    let card1Badge = 'Matriculados';
    let card1Subtitle = semTutor > 0 ? `${semTutor} sem tutor designado` : '100% sob tutoria ativa';
    let card2Badge = 'Grupos';
    let card2Subtitle = 'Classes organizadas no sistema';
    let cardCCBadge = selectedBimestre === 'geral' ? 'Geral' : `${selectedBimestre}º Bi`;
    let cardCCSubtitle = 'Média consolidada do Conselho';
    let card3Badge = null;
    let card3Subtitle = 'Média diagnóstica geral da escola';
    let card4Badge = 'Conselho';
    let card4Subtitle = 'Médias consolidadas abaixo de 5,0';

    if (selectedBimestre === '1') {
      card1Badge = '1º Bimestre';
      card1Subtitle = totalAvaliados > 0 ? `${totalAvaliados} avaliados no 1º Bimestre` : (semTutor > 0 ? `${semTutor} sem tutor designado` : '100% sob tutoria ativa');
      card2Badge = '1º Bi';
      card2Subtitle = turmasNoPeriodo.size > 0 ? `${turmasNoPeriodo.size} classes com registros no 1º Bi` : 'Classes com registros no 1º Bi';
      cardCCBadge = '1º Bi';
      cardCCSubtitle = ccQtd > 0 ? 'Média Conselho (1º Bi)' : 'Notas do 1º Bimestre';
      card3Badge = '1º Bi';
      card3Subtitle = ppQtd > 0 ? 'Média Prova Paulista (1º Bi)' : 'Média diagnóstica (1º Bi)';
      card4Badge = '1º Bi';
      card4Subtitle = emRisco > 0 ? `${emRisco} aluno${emRisco > 1 ? 's' : ''} < 5,0 no 1º Bi` : 'Nenhum aluno < 5,0 no 1º Bi';
    } else if (selectedBimestre === '2') {
      card1Badge = '2º Bimestre';
      card1Subtitle = totalAvaliados > 0 ? `${totalAvaliados} avaliados no 2º Bimestre` : (semTutor > 0 ? `${semTutor} sem tutor designado` : '100% sob tutoria ativa');
      card2Badge = '2º Bi';
      card2Subtitle = turmasNoPeriodo.size > 0 ? `${turmasNoPeriodo.size} classes com registros no 2º Bi` : 'Classes com registros no 2º Bi';
      cardCCBadge = '2º Bi';
      cardCCSubtitle = ccQtd > 0 ? 'Média Conselho (2º Bi)' : 'Notas do 2º Bimestre';
      card3Badge = '2º Bi';
      card3Subtitle = ppQtd > 0 ? 'Média Prova Paulista (2º Bi)' : 'Média diagnóstica (2º Bi)';
      card4Badge = '2º Bi';
      card4Subtitle = emRisco > 0 ? `${emRisco} aluno${emRisco > 1 ? 's' : ''} < 5,0 no 2º Bi` : 'Nenhum aluno < 5,0 no 2º Bi';
    } else if (selectedBimestre === '3') {
      card1Badge = '3º Bi (Atual)';
      card1Subtitle = totalAvaliados > 0 
        ? `${totalAvaliados} avaliado • ${emLancamento} a lançar` 
        : `${emLancamento} com notas a lançar`;
      card2Badge = '3º Bi';
      card2Subtitle = turmasNoPeriodo.size > 0 ? `${turmasNoPeriodo.size} turma${turmasNoPeriodo.size > 1 ? 's' : ''} com notas lançadas` : 'Classes com notas em lançamento';
      cardCCBadge = '3º Bi';
      cardCCSubtitle = ccQtd > 0 ? 'Média Conselho (3º Bi)' : 'Notas em lançamento';
      card3Badge = '3º Bi';
      card3Subtitle = ppQtd > 0 ? 'Média Prova Paulista (3º Bi)' : 'Média diagnóstica do grupo';
      card4Badge = '3º Bi (Parcial)';
      card4Subtitle = (totalAvaliados > 0 || emRisco > 0)
        ? (emRisco > 0 
            ? (totalNotasEmRisco > emRisco 
                ? `${totalNotasEmRisco} notas < 5,0 (${emRisco} aluno${emRisco > 1 ? 's' : ''})` 
                : `${emRisco} nota${emRisco > 1 ? 's' : ''} < 5,0 no 3º Bi`)
            : 'Nenhum aluno < 5,0 no 3º Bi')
        : 'Nenhuma nota lançada no 3º Bi';
    } else if (selectedBimestre === 'geral') {
      cardCCBadge = 'Geral';
      cardCCSubtitle = ccQtd > 0 ? 'Média Geral consolidada' : 'Média das notas';
    }

    return {
      total,
      totalAvaliados,
      consolidados,
      emApoio,
      emRisco,
      totalNotasEmRisco,
      evoluindo,
      emLancamento,
      semTutor,
      turmasCount,
      ccMedia: ccMediaCalc,
      ppMedia: ppMediaCalc,
      card1Badge,
      card1Subtitle,
      card2Badge,
      card2Subtitle,
      cardCCBadge,
      cardCCSubtitle,
      card3Badge,
      card3Subtitle,
      card4Badge,
      card4Subtitle,
    };
  }, [enrichedStudents, selectedBimestre, stats.totalGroups]);

  // Título limpo
  const currentTitle = useMemo(() => {
    if (selectedValue === 'Todos') return 'Panorama Geral da Turma';
    if (filterMode === 'turma') return `Turma ${selectedValue}`;
    if (filterMode === 'tutor') return `Tutorados de ${selectedValue}`;
    if (filterMode === 'serie') return `Nível Escolar: ${selectedValue}`;
    return selectedValue;
  }, [selectedValue, filterMode]);

  // Determina a turma/sala atualmente sendo analisada no Dashboard
  const currentAnalyzedTurma = useMemo(() => {
    if (filterMode === 'turma' && selectedValue && selectedValue !== 'Todos') {
      return selectedValue;
    }
    if (sortedData && sortedData.length > 0) {
      const distinctTurmas = [...new Set(sortedData.map(s => s.turma).filter(Boolean))];
      if (distinctTurmas.length === 1) {
        return distinctTurmas[0];
      }
    }
    return 'Todas';
  }, [filterMode, selectedValue, sortedData]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await getXLSX();
      
      const exportData = displayedStudents.map(s => {
        const row = {
          "Aluno": s.nome,
          "Turma": s.turma,
          "Tutor": s.tutor,
          "Situação": s.situacao,
        };

        if (isMediasOnly) {
          row["Conselho de Classe (Média)"] = getCCMedia(s);
          row["Prova Paulista (Média)"] = getPPMedia(s);
        }

        if (showConselhoClasse) {
          ccDisciplinasList.forEach(d => {
            row[`Conselho de Classe - ${d.label}`] = getStudentCCSubject(s, d.key);
          });
          row["Conselho de Classe (Média)"] = getCCMedia(s);
        }

        if (showProvaPaulista) {
          ppDisciplinasList.forEach(d => {
            row[`Prova Paulista - ${d.label}`] = getStudentPPSubject(s, d.key);
          });
          row["Prova Paulista (Média)"] = getPPMedia(s);
        }

        row["Evolução"] = s.trend.label;
        row["Faltas (total)"] = s.totalFaltas != null ? s.totalFaltas : '-';
        row["Frequência (%)"] = getStudentCCFrequencia(s).display;

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");

      const safeValue = String(selectedValue).replace(/[^a-z0-9]/gi, '_');
      const filename = `TutorDash_${filterMode}_${safeValue}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Erro ao exportar excel:", err);
      alert("Não foi possível gerar o arquivo Excel.");
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* ── 1. Barra de Busca Limpa e Discreta ─────────────────────────── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Pesquisar criança pelo nome..."
          className="flex-1 outline-none font-medium text-slate-800 placeholder:text-slate-400 bg-transparent text-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <div className="hidden sm:flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-xs font-mono font-medium">
          <span>/</span>
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── 2. Grid de Resultados da Busca ────────────────────────────── */}
      {searchTerm ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allStudents.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((s, i) => (
            <button
              key={i}
              onClick={() => { setSelectedStudent(s.nome); setSearchTerm(''); }}
              className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all duration-150 group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${getAvatarColor(s.nome)}`}>
                    {getInitials(s.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                      {s.nome}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        Turma {s.turma}
                      </span>
                      <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded border ${
                        s.tutor === 'Sem Tutor'
                          ? 'text-rose-600 bg-rose-50 border-rose-200'
                          : 'text-slate-600 bg-slate-50 border-slate-200'
                      }`}>
                        {s.tutor}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-slate-100">
                  {s.provaPaulista !== 'S/D' && (
                    <span className="text-[10px] font-bold bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      Prova Paulista: {s.provaPaulista}
                    </span>
                  )}
                  {s.consilhoBimestral !== 'S/D' && (
                    <span className="text-[10px] font-bold bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      Conselho de Classe: {s.consilhoBimestral}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ml-auto border ${
                    s.situacao === 'Ativo'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {s.situacao}
                  </span>
                </div>
              </div>

              {s.noteCount > 0 && (() => {
                const isTutorMatch = checkIsTutor(s.tutor, s.notes?.[0]?.teacher);
                return (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                      isTutorMatch ? 'bg-blue-50/70 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      📝 {s.notes?.[0]?.teacher} • Total: {s.noteCount} • Última: {s.lastNoteDate}
                    </span>
                  </div>
                );
              })()}
            </button>
          ))}
        </div>
      ) : (
        /* ── 3. Vista Principal: Clean, Fluida e Elegante ──────────────── */
        <div className="space-y-5">

          {/* ── 3.1 Painel Superior: Cards de Bimestre & Filtros de Alunos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            
            {/* Card 1: Seletor de Bimestre & Panorama Geral da Turma */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="relative inline-flex items-center">
                    <Calendar className="w-4 h-4 text-blue-600 absolute left-3 pointer-events-none" />
                    <select
                      id="bimestre-selector"
                      aria-label="Selecionar Bimestre ou Média Geral"
                      value={selectedBimestre}
                      onChange={(e) => setSelectedBimestre(e.target.value)}
                      className="appearance-none bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-800 text-sm sm:text-base font-bold pl-9 pr-8 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="3">3º Bimestre (Atual)</option>
                      <option value="2">2º Bimestre</option>
                      <option value="1">1º Bimestre</option>
                      <option value="geral">Média Geral</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none" />
                  </div>

                  {/* Badges sutis de status & Ações Rápidas */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/70">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {selectedBimestre === 'geral' ? pedagogicalStats.total : (pedagogicalStats.totalAvaliados || pedagogicalStats.total)} alunos
                    </span>

                    {onOpenTraceability && (
                      <button
                        type="button"
                        onClick={() => onOpenTraceability(selectedBimestre, currentAnalyzedTurma)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all cursor-pointer group"
                        title="Auditoria dos lançamentos de notas do conselho bimestral"
                        aria-label="Abrir auditoria de lançamentos de notas"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span>Lançamentos</span>
                        {selectedBimestre === '3' && pedagogicalStats.emLancamento > 0 && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 ml-0.5">
                            {pedagogicalStats.emLancamento}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
                  {currentTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedBimestre === '3' 
                    ? 'Acompanhamento do ano letivo com histórico do 1º e 2º Bimestres, notas em digitação do 3º Bi e Prova Paulista.'
                    : selectedBimestre === 'geral'
                    ? 'Visão consolidada da média geral acumulada do ano letivo e desempenho global dos alunos.'
                    : `Visualização e histórico das notas consolidadas do ${selectedBimestre}º Bimestre.`}
                </p>
              </div>
            </div>

            {/* Card 2: Abas TUTOR, NÍVEL, TURMA e RANKING + Seletor de Opções & Ativos Abaixo */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs flex flex-col justify-between gap-3">
              
              {/* Linha 1: Botões Segmentados TUTOR / NÍVEL / TURMA / RANKING */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex p-0.5 bg-slate-100 rounded-xl gap-0.5 border border-slate-200/60 shrink-0">
                  <button
                    onClick={() => { setFilterMode('tutor'); setSelectedValue('Todos'); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      filterMode === 'tutor'
                        ? 'bg-white shadow-2xs text-blue-700 border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    TUTOR
                  </button>
                  <button
                    onClick={() => { setFilterMode('serie'); setSelectedValue('Todos'); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      filterMode === 'serie'
                        ? 'bg-white shadow-2xs text-blue-700 border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    NÍVEL
                  </button>
                  <button
                    onClick={() => { setFilterMode('turma'); setSelectedValue('Todos'); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      filterMode === 'turma'
                        ? 'bg-white shadow-2xs text-blue-700 border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    TURMA
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRanking(v => !v)}
                    title="Alternar exibição do Ranking Top 5"
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      showRanking
                        ? 'bg-amber-500 text-white shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🏆</span>
                    <span>RANKING</span>
                  </button>
                </div>
              </div>

              {/* Linha 2 (Abaixo das abas): Seletor de Opções e Checkbox Apenas alunos Ativos */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Dropdown de Opções */}
                <select
                  aria-label="Filtrar por tutor ou turma"
                  className="bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-xl py-1.5 px-3 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs cursor-pointer min-w-[160px] flex-1 sm:flex-initial"
                  value={selectedValue}
                  onChange={e => setSelectedValue(e.target.value)}
                >
                  {optionsList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                {/* Checkbox Apenas alunos Ativos */}
                <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors group select-none shrink-0">
                  <input 
                    type="checkbox" 
                    checked={showOnlyActive} 
                    onChange={(e) => setShowOnlyActive(e.target.checked)} 
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                  />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    Apenas alunos Ativos
                  </span>
                </label>
              </div>

            </div>

          </div>

          {/* ── 3.2 Cartões de Resumo (Dados Centralizados e Harmoniosos) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            
            {/* Card 1: Tutorados */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all text-center flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Tutorados</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 ml-1">
                  {pedagogicalStats.card1Badge}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-0.5">
                {pedagogicalStats.total}
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center">
                {pedagogicalStats.card1Subtitle}
              </p>
              {onOpenTraceability && pedagogicalStats.emLancamento > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenTraceability(selectedBimestre, currentAnalyzedTurma)}
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                  title="Auditar lançamentos do bimestre"
                >
                  <Search className="w-3 h-3" />
                  Auditar lançamentos ↗
                </button>
              )}
            </div>

            {/* Card 2: Turmas */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all text-center flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Turmas</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 ml-1">
                  {pedagogicalStats.card2Badge}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-0.5">
                {pedagogicalStats.turmasCount ?? stats.totalGroups ?? '1'}
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center">
                {pedagogicalStats.card2Subtitle}
              </p>
            </div>

            {/* Card 3: Conselho de Classe */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all text-center flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Conselho de Classe</span>
                {pedagogicalStats.cardCCBadge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 ml-1">
                    {pedagogicalStats.cardCCBadge}
                  </span>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-0.5">
                {pedagogicalStats.ccMedia !== '-' ? pedagogicalStats.ccMedia : (stats.performanceStats?.ccAvg || '-')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center">
                {pedagogicalStats.cardCCSubtitle}
              </p>
            </div>

            {/* Card 4: Prova Paulista */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all text-center flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Prova Paulista</span>
                {pedagogicalStats.card3Badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 ml-1">
                    {pedagogicalStats.card3Badge}
                  </span>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-0.5">
                {pedagogicalStats.ppMedia !== '-' ? pedagogicalStats.ppMedia : (stats.performanceStats?.ppAvg || '4,83')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center">
                {pedagogicalStats.card3Subtitle}
              </p>
            </div>

            {/* Card 5: Alunos em Atenção (< 5,0) */}
            {/* Card 4: Foco de Atenção (Conselho de Classe) */}
            <div 
              onClick={() => onOpenLowGradesReport && onOpenLowGradesReport(selectedBimestre, currentAnalyzedTurma)}
              className={`rounded-2xl p-5 border shadow-2xs transition-all text-center flex flex-col items-center justify-center ${
                onOpenLowGradesReport 
                  ? 'bg-white border-slate-200/90 hover:border-amber-300 hover:shadow-xs cursor-pointer group' 
                  : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Foco de Atenção</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 ml-1">
                  {pedagogicalStats.card4Badge}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-0.5">
                {pedagogicalStats.emRisco}
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center">
                {pedagogicalStats.card4Subtitle}
              </p>
              {onOpenLowGradesReport && (
                <div className="mt-2.5 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800 pt-2 border-t border-slate-100 w-full">
                  <span>Abrir Relatório</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </div>

          </div>

          {/* ── 3.3 Leaderboard Top 5 Prova Paulista (RankingPanel) ───── */}
          {showRanking && (
            <RankingPanel
              students={rankingStudents}
              filterLabel={filterLabel}
              onSelectStudent={setSelectedStudent}
              show={showRanking}
              onToggle={() => setShowRanking(v => !v)}
            />
          )}

          {/* ── 3.4 Barra de Visão de Notas & Exportação da Tabela ────── */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Bloco de Visão & Exportação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3 flex-wrap">
              
              {/* Botões de Visão: Prova Paulista, Conselho de Classe e Médias */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60 flex-wrap items-center">
                <button 
                  type="button"
                  onClick={handleToggleProvaPaulista}
                  title="Exibir disciplinas avaliadas na Prova Paulista para o bimestre selecionado e sua média"
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    showProvaPaulista 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${showProvaPaulista ? 'bg-white' : 'bg-blue-500'}`} />
                  <span>Prova Paulista</span>
                  {ppDisciplinasList.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      showProvaPaulista ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {ppDisciplinasList.length}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={handleToggleConselhoClasse}
                  title="Exibir disciplinas do Conselho de Classe (boletim) para o bimestre selecionado e sua média"
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    showConselhoClasse 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${showConselhoClasse ? 'bg-white' : 'bg-indigo-500'}`} />
                  <span>Conselho de Classe</span>
                  {ccDisciplinasList.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      showConselhoClasse ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {ccDisciplinasList.length}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={handleSelectMediasOnly}
                  title="Exibir somente as médias gerais consolidadas do Conselho de Classe e da Prova Paulista"
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    isMediasOnly 
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isMediasOnly ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>Médias</span>
                </button>
              </div>

              {/* Botão Baixar Excel */}
              <button
                onClick={handleExportExcel}
                title="Baixar Tabela com Linha do Tempo em Excel"
                className="px-3.5 py-1.5 text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 rounded-xl transition-all border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5 shadow-2xs text-xs font-semibold cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Baixar Excel</span>
              </button>

            </div>

          </div>

          {/* ── 3.5 Tabela Limpa, Fluida e Sem Caixas Rígidas ───────────── */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  {/* Linha 1: Colunas Fixas (rowSpan=2) e Super-Headers de Categorias */}
                  <tr>
                    <th 
                      rowSpan={2} 
                      className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-24 align-middle border-b border-slate-200/80 bg-slate-50" 
                      onClick={() => handleHeaderSort('turma')}
                    >
                      <div className="flex items-center gap-1.5">Turma <SortIcon columnKey="turma" sortConfig={sortConfig} /></div>
                    </th>
                    <th 
                      rowSpan={2} 
                      className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors w-44 align-middle border-b border-slate-200/80 bg-slate-50" 
                      onClick={() => handleHeaderSort('tutor')}
                    >
                      <div className="flex items-center gap-1.5">Tutor <SortIcon columnKey="tutor" sortConfig={sortConfig} /></div>
                    </th>
                    <th 
                      rowSpan={2} 
                      className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors align-middle border-b border-r border-slate-200/80 sticky left-0 z-20 bg-slate-50 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)] min-w-[240px] max-w-[320px]" 
                      onClick={() => handleHeaderSort('alunos')}
                    >
                      <div className="flex items-center gap-1.5">Alunos <SortIcon columnKey="alunos" sortConfig={sortConfig} /></div>
                    </th>

                    {/* Visão de Médias: Títulos de Grupo com largura ampla para leitura fluida */}
                    {isMediasOnly && (
                      <>
                        <th className="px-6 py-2.5 text-center bg-indigo-50/90 text-indigo-950 font-bold border-b border-indigo-200/80 text-xs tracking-wider w-64 min-w-[210px]">
                          Conselho de Classe
                        </th>
                        <th className="px-6 py-2.5 text-center bg-blue-50/90 text-blue-950 font-bold border-b border-blue-200/80 text-xs tracking-wider w-64 min-w-[210px]">
                          Prova Paulista
                        </th>
                      </>
                    )}

                    {/* Visão do Conselho de Classe: Título de Grupo Unificado acima das disciplinas */}
                    {showConselhoClasse && (
                      <th 
                        colSpan={ccDisciplinasList.length + 2} 
                        className="px-4 py-2 text-center bg-indigo-50/80 text-indigo-900 font-bold border-b border-indigo-200/80 text-xs tracking-wider"
                      >
                        Conselho de Classe
                      </th>
                    )}

                    {/* Visão da Prova Paulista: Título de Grupo Unificado acima das disciplinas */}
                    {showProvaPaulista && (
                      <th 
                        colSpan={ppDisciplinasList.length + 1} 
                        className="px-4 py-2 text-center bg-blue-50/80 text-blue-900 font-bold border-b border-blue-200/80 text-xs tracking-wider"
                      >
                        Prova Paulista
                      </th>
                    )}
                  </tr>

                  {/* Linha 2: Disciplinas e Médias individuais */}
                  <tr>
                    {/* Visão de Médias: Sub-colunas com largura ampla */}
                    {isMediasOnly && (
                      <>
                        <th 
                          className="px-6 py-2.5 cursor-pointer hover:bg-indigo-100/70 transition-colors text-center w-64 min-w-[210px] bg-indigo-50/40 border-r border-b border-indigo-100/60" 
                          onClick={() => handleDiscSort('cc_media')}
                          title="Média consolidada do Conselho de Classe"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-bold text-indigo-950">
                              {selectedBimestre === 'geral' ? 'Média Geral' : `Média ${selectedBimestre}º Bi`}
                            </span>
                            <ColumnSortIndicator active={discSort.key === 'cc_media'} direction={discSort.direction} />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-2.5 cursor-pointer hover:bg-blue-100/70 transition-colors text-center w-64 min-w-[210px] bg-blue-50/40 border-b border-blue-100/60" 
                          onClick={() => handleDiscSort('pp_media')}
                          title="Média consolidada da Prova Paulista"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-bold text-blue-950">
                              {selectedBimestre === 'geral' ? 'Média Geral' : `Média ${selectedBimestre}º Bi`}
                            </span>
                            <ColumnSortIndicator active={discSort.key === 'pp_media'} direction={discSort.direction} />
                          </div>
                        </th>
                      </>
                    )}

                    {/* Visão do Conselho de Classe: Sub-colunas de Disciplinas + Média + Frequência */}
                    {showConselhoClasse && (
                      <>
                        {ccDisciplinasList.map(disc => (
                          <th
                            key={`th-cc-${disc.key}`}
                            className="px-3.5 py-2 cursor-pointer hover:bg-indigo-50/60 transition-colors text-center whitespace-nowrap border-b border-slate-200/80 bg-slate-50"
                            onClick={() => handleDiscSort(`cc_disc_${disc.key}`)}
                            title={`Nota de ${disc.label} no Conselho de Classe`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs font-semibold text-slate-800">{disc.label}</span>
                              <ColumnSortIndicator active={discSort.key === `cc_disc_${disc.key}`} direction={discSort.direction} />
                            </div>
                          </th>
                        ))}
                        <th 
                          className="px-4 py-2 cursor-pointer hover:bg-indigo-100/70 transition-colors text-center w-36 bg-indigo-50/40 border-b border-slate-200/80" 
                          onClick={() => handleDiscSort('cc_media')}
                          title="Média consolidada do Conselho de Classe"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-bold text-indigo-950">Média Geral</span>
                            <ColumnSortIndicator active={discSort.key === 'cc_media'} direction={discSort.direction} />
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2 cursor-pointer hover:bg-indigo-100/70 transition-colors text-center w-32 bg-indigo-50/30 border-b border-slate-200/80" 
                          onClick={() => handleDiscSort('frequencia')}
                          title="Frequência geral consolidada do aluno"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-bold text-indigo-950">Frequência Geral</span>
                            <ColumnSortIndicator active={discSort.key === 'frequencia'} direction={discSort.direction} />
                          </div>
                        </th>
                      </>
                    )}

                    {/* Visão da Prova Paulista: Sub-colunas de Disciplinas + Média */}
                    {showProvaPaulista && (
                      <>
                        {ppDisciplinasList.map(disc => (
                          <th
                            key={`th-pp-${disc.key}`}
                            className="px-3.5 py-2 cursor-pointer hover:bg-blue-50/60 transition-colors text-center whitespace-nowrap border-b border-slate-200/80 bg-slate-50"
                            onClick={() => handleDiscSort(`pp_disc_${disc.key}`)}
                            title={`Nota de ${disc.label} na Prova Paulista`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs font-semibold text-slate-800">{disc.label}</span>
                              <ColumnSortIndicator active={discSort.key === `pp_disc_${disc.key}`} direction={discSort.direction} />
                            </div>
                          </th>
                        ))}
                        <th 
                          className="px-4 py-2 cursor-pointer hover:bg-blue-100/70 transition-colors text-center w-36 bg-blue-50/40 border-b border-slate-200/80" 
                          onClick={() => handleDiscSort('pp_media')}
                          title="Média consolidada da Prova Paulista"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-bold text-blue-950">Média Geral</span>
                            <ColumnSortIndicator active={discSort.key === 'pp_media'} direction={discSort.direction} />
                          </div>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((student, i) => {
                    const isEven = i % 2 === 0;
                    return (
                      <tr 
                        key={`${student.turma}-${student.nome}-${i}`} 
                        className={`transition-colors group ${
                          isEven 
                            ? 'bg-white hover:bg-blue-50/50' 
                            : 'bg-slate-100 hover:bg-blue-50/60'
                        }`}
                      >
                        {/* Turma */}
                        <td className="px-5 py-3.5 whitespace-nowrap border-b border-slate-200/70">
                          <button
                            onClick={() => setSelectedTurma && setSelectedTurma(student.turma)}
                            className="font-bold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-xs uppercase border border-blue-200/50 transition-all cursor-pointer"
                            title={`Abrir Dashboard Coletiva da Turma ${student.turma}`}
                          >
                            {student.turma}
                          </button>
                        </td>

                        {/* Tutor */}
                        <td className="px-5 py-3.5 whitespace-nowrap border-b border-slate-200/70">
                          <span className={`inline-block text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                            student.tutor === 'Sem Tutor' 
                              ? 'bg-rose-50 text-rose-600 border-rose-200' 
                              : 'text-slate-600 bg-slate-50 border-slate-200/60'
                          }`}>
                            {student.tutor}
                          </span>
                        </td>

                        {/* Aluno (Nome Limpo + Anotações) - Fixado com Sticky Left */}
                        <td className={`px-5 py-3.5 sticky left-0 z-10 min-w-[240px] max-w-[320px] border-b border-r border-slate-200/70 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors ${
                          isEven 
                            ? 'bg-white group-hover:bg-blue-50/70' 
                            : 'bg-slate-100 group-hover:bg-blue-50/70'
                        }`}>
                          <button
                            onClick={() => setSelectedStudent(student.nome)}
                            className="text-left w-full group/student block focus:outline-none cursor-pointer"
                          >
                            <span className="text-sm font-semibold text-slate-800 group-hover/student:text-blue-600 transition-colors block truncate">
                              {student.nome}
                            </span>
                            {student.noteCount > 0 && (() => {
                              const isTutorMatch = checkIsTutor(student.tutor, student.notes?.[0]?.teacher);
                              return (
                                <div className="flex gap-1.5 flex-wrap items-center mt-0.5">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                                    isTutorMatch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    📝 {student.notes?.[0]?.teacher} • Total: {student.noteCount} • Última: {student.lastNoteDate}
                                  </span>
                                </div>
                              );
                            })()}
                          </button>
                        </td>

                        {/* Visão de Médias: Somente as duas médias gerais consolidadas (aumentadas para leitura fluida) */}
                        {isMediasOnly && (
                          <>
                            <td className="px-6 py-3.5 whitespace-nowrap text-center bg-indigo-50/15 border-b border-slate-200/70">
                              {renderScoreBadge(getCCMedia(student), false, true)}
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap text-center bg-blue-50/15 border-b border-slate-200/70">
                              {renderScoreBadge(getPPMedia(student), false, true)}
                            </td>
                          </>
                        )}

                      {/* Visão do Conselho de Classe: Disciplinas + Média */}
                      {showConselhoClasse && (
                        <>
                          {ccDisciplinasList.map(disc => (
                            <td key={`td-cc-${disc.key}`} className="px-3.5 py-3 whitespace-nowrap text-center border-b border-slate-200/70">
                              {renderScoreBadge(getStudentCCSubject(student, disc.key))}
                            </td>
                          ))}
                          <td className="px-4 py-3 whitespace-nowrap text-center bg-indigo-50/20 font-bold border-b border-slate-200/70">
                            {renderScoreBadge(getCCMedia(student))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center bg-indigo-50/10 border-b border-slate-200/70">
                            {(() => {
                              const { num, display } = getStudentCCFrequencia(student);
                              return (
                                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md border ${
                                  num == null 
                                    ? 'text-slate-400 bg-slate-50 border-slate-200'
                                    : num >= 75
                                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                      : 'text-rose-700 bg-rose-50 border-rose-200'
                                }`}>
                                  {display}
                                </span>
                              );
                            })()}
                          </td>
                        </>
                      )}

                      {/* Visão da Prova Paulista: Disciplinas + Média */}
                      {showProvaPaulista && (
                        <>
                          {ppDisciplinasList.map(disc => (
                            <td key={`td-pp-${disc.key}`} className="px-3.5 py-3 whitespace-nowrap text-center border-b border-slate-200/70">
                              {renderScoreBadge(getStudentPPSubject(student, disc.key))}
                            </td>
                          ))}
                          <td className="px-4 py-3 whitespace-nowrap text-center bg-blue-50/20 font-bold border-b border-slate-200/70">
                            {renderScoreBadge(getPPMedia(student))}
                          </td>
                        </>
                      )}
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
  );
};

export default Dashboard;
