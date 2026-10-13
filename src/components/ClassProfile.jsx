// ─────────────────────────────────────────────────────────────
// components/ClassProfile.jsx — Painel Executivo e Narrativo de Turma
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Users, TrendingUp, BookOpen,
  Maximize2, Minimize2, Award, Trophy, Medal, Star,
  AlertCircle, Sparkles, Filter, Search, ArrowUpRight,
  ArrowDownRight, Minus, Sliders, Zap, Check, ArrowRight,
  Compass, HelpCircle, Layers, SlidersHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, LabelList
} from 'recharts';
import { parseGrade, toScale10, formatDisciplina, getSerieFromTurma } from '../utils/helpers';
import SpeedometerGauge from './SpeedometerGauge';

// Tooltip estilizado e claro para os gráficos Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-xl text-slate-800 text-xs z-50">
      <p className="font-black border-b border-slate-100 pb-2 mb-2 text-blue-600 uppercase tracking-wider">
        {payload[0]?.payload?.fullSubject || label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-black text-slate-900 text-sm">
              {entry.value !== null && entry.value !== undefined
                ? Number(entry.value).toFixed(
                    entry.dataKey?.includes('pp') || entry.name?.includes('PP') || entry.name?.includes('Prova') ? 2 : 1
                  )
                : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClassProfile = ({
  selectedTurma,
  setSelectedTurma,
  allStudents = [],
  conceitoData = [],
  provaData = [],
  onSelectStudent
}) => {
  // ── 1. Estados e Configurações ──────────────────────────────────────
  // 'PP' (Prova Paulista) ou 'CC' (Conselho de Classe)
  const [activeAvaliacao, setActiveAvaliacao] = useState('PP');
  // Disciplina selecionada ('Geral' ou nome formatado)
  const [selectedDisc, setSelectedDisc] = useState('Geral');
  // Modo de controle do slice: 'geral' (unificado) ou 'individual' (por bimestre)
  const [sliceMode, setSliceMode] = useState('geral');
  // Slice geral (unificado)
  const [globalSlice, setGlobalSlice] = useState(null);
  // Slices individuais por card ({ 'Geral': N, '1º Bimestre': N, ... })
  const [individualSlices, setIndividualSlices] = useState({});
  // Metas do velocímetro
  const [metaOuroVal, setMetaOuroVal] = useState(7.5);
  const [metaDiamanteVal, setMetaDiamanteVal] = useState(8.5);
  // Busca na lista de alunos
  const [searchTerm, setSearchTerm] = useState('');
  // Visualizar todos na lista de alunos
  const [showAllInTable, setShowAllInTable] = useState(true);
  // Modal maximizado
  const [maximizedChart, setMaximizedChart] = useState(null);

  // Referências para âncoras de navegação suave
  const ato1Ref = useRef(null);
  const ato2Ref = useRef(null);
  const ato3Ref = useRef(null);

  const serieLabel = useMemo(() => getSerieFromTurma(selectedTurma), [selectedTurma]);

  // Lista ordenada de todas as turmas para navegação anterior/próximo
  const allTurmasSorted = useMemo(() => {
    const s = new Set(allStudents.map(st => st.turma).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents]);

  const { prevTurma, nextTurma } = useMemo(() => {
    const idx = allTurmasSorted.indexOf(selectedTurma);
    if (idx === -1) return { prevTurma: null, nextTurma: null };
    return {
      prevTurma: idx > 0 ? allTurmasSorted[idx - 1] : null,
      nextTurma: idx < allTurmasSorted.length - 1 ? allTurmasSorted[idx + 1] : null,
    };
  }, [allTurmasSorted, selectedTurma]);

  // Alunos desta turma
  const studentsInTurma = useMemo(() => {
    return allStudents.filter(s => s.turma === selectedTurma);
  }, [allStudents, selectedTurma]);

  // Inicializa e sincroniza globalSlice e individualSlices com o total da turma
  useEffect(() => {
    const total = studentsInTurma.length || 1;
    setGlobalSlice(total);
    setIndividualSlices({
      'Geral': total,
      '1º Bimestre': total,
      '2º Bimestre': total,
      '3º Bimestre': total,
      '4º Bimestre': total
    });
  }, [selectedTurma, studentsInTurma.length]);

  // Bimestres disponíveis ordenados (ex: ['1º Bimestre', '2º Bimestre', ...])
  const bimestresDisponiveis = useMemo(() => {
    const setBim = new Set([
      ...conceitoData.map(c => c.bimestre),
      ...provaData.map(p => p.bimestre)
    ]);
    return Array.from(setBim).filter(Boolean).sort();
  }, [conceitoData, provaData]);

  // Mapa rápido de nome normalizado -> turma
  const studentTurmaMap = useMemo(() => {
    const map = new Map();
    allStudents.forEach(s => {
      if (s.normalizedName && s.turma) map.set(s.normalizedName, s.turma);
    });
    return map;
  }, [allStudents]);

  // Lista de todas as disciplinas disponíveis para esta turma na avaliação ativa
  const availableDisciplines = useMemo(() => {
    const set = new Set();
    const studentsInSerie = allStudents.filter(s => getSerieFromTurma(s.turma) === serieLabel);
    const normNamesSerieSet = new Set(studentsInSerie.map(s => s.normalizedName));

    if (activeAvaliacao === 'PP') {
      provaData.forEach(reg => {
        const isSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === serieLabel;
        if (!isSerie || !reg.notas) return;
        Object.entries(reg.notas).forEach(([k, valRaw]) => {
          const n = toScale10(valRaw);
          if ((n !== null && n >= 0) || (valRaw && valRaw !== '-')) {
            const d = formatDisciplina(k);
            if (d) set.add(d);
          }
        });
      });
    } else {
      conceitoData.forEach(reg => {
        const isSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === serieLabel;
        if (!isSerie || !reg.notas) return;
        Object.entries(reg.notas).forEach(([k, valRaw]) => {
          const n = parseGrade(valRaw);
          if (n > 0 || (valRaw && valRaw !== '-')) {
            const d = formatDisciplina(k);
            if (d) set.add(d);
          }
        });
      });
    }
    return ['Geral', ...Array.from(set).sort()];
  }, [activeAvaliacao, provaData, conceitoData, allStudents, serieLabel]);

  useEffect(() => {
    if (selectedDisc !== 'Geral' && !availableDisciplines.includes(selectedDisc)) {
      setSelectedDisc('Geral');
    }
  }, [availableDisciplines, selectedDisc]);

  // ── 2. Função de Obtenção de Notas de Aluno ─────────────────────────
  const getStudentGrade = useMemo(() => {
    return (student, avaliacao, disc, targetBimestre = null) => {
      if (!student) return null;
      const isPP = avaliacao === 'PP';
      const hist = isPP ? student.historicoProvas || [] : student.historicoConceitos || [];

      const filteredHist = targetBimestre
        ? hist.filter(h => {
            if (!h || !h.bimestre) return false;
            const normA = h.bimestre.replace('º Bimestre', 'º Bi').trim();
            const normB = targetBimestre.replace('º Bimestre', 'º Bi').trim();
            return normA === normB || h.bimestre === targetBimestre;
          })
        : hist;

      if (!filteredHist.length) {
        if (!targetBimestre && disc === 'Geral') {
          const raw = isPP ? student.provaPaulista : student.consilhoBimestral;
          const val = parseFloat(String(raw || '').replace(',', '.'));
          return !isNaN(val) && val >= 0 ? val : null;
        }
        return null;
      }

      let sum = 0;
      let count = 0;

      filteredHist.forEach(reg => {
        if (!reg?.notas) return;
        Object.entries(reg.notas).forEach(([key, valRaw]) => {
          const formatted = formatDisciplina(key);
          const match = disc === 'Geral' || formatted === disc || (formatted.length > 12 && `${formatted.substring(0, 10)}.` === disc);
          if (match) {
            const nota = isPP ? toScale10(valRaw) : parseGrade(valRaw);
            if (nota !== null && (isPP ? nota >= 0 : nota > 0)) {
              sum += nota;
              count++;
            }
          }
        });
      });

      if (count === 0) return null;
      const res = sum / count;
      return isPP ? Number(res.toFixed(2)) : Number(res.toFixed(1));
    };
  }, []);

  // ── 3. ATO 1: Métricas e Rankings Oficiais da Turma Completa ────────
  const officialClassMetrics = useMemo(() => {
    const total = studentsInTurma.length;
    let ccSum = 0, ccCnt = 0;
    let ppSum = 0, ppCnt = 0;
    studentsInTurma.forEach(s => {
      const nCC = parseFloat(String(s.consilhoBimestral || '').replace(',', '.'));
      if (!isNaN(nCC) && nCC >= 0) { ccSum += nCC; ccCnt++; }
      const nPP = parseFloat(String(s.provaPaulista || '').replace(',', '.'));
      if (!isNaN(nPP) && nPP >= 0) { ppSum += nPP; ppCnt++; }
    });

    const mediaOficialCC = ccCnt > 0 ? Number((ccSum / ccCnt).toFixed(1)) : null;
    const mediaOficialPP = ppCnt > 0 ? Number((ppSum / ppCnt).toFixed(2)) : null;

    // Calcular rankings da turma entre todas as turmas da escola
    const turmaScoresPP = new Map();
    const turmaScoresCC = new Map();
    allTurmasSorted.forEach(t => {
      turmaScoresPP.set(t, { sum: 0, cnt: 0 });
      turmaScoresCC.set(t, { sum: 0, cnt: 0 });
    });

    allStudents.forEach(s => {
      if (s.situacao !== 'Ativo' || !s.turma) return;
      const nPP = parseFloat(String(s.provaPaulista || '').replace(',', '.'));
      if (!isNaN(nPP) && nPP >= 0 && turmaScoresPP.has(s.turma)) {
        const item = turmaScoresPP.get(s.turma);
        item.sum += nPP; item.cnt++;
      }
      const nCC = parseFloat(String(s.consilhoBimestral || '').replace(',', '.'));
      if (!isNaN(nCC) && nCC >= 0 && turmaScoresCC.has(s.turma)) {
        const item = turmaScoresCC.get(s.turma);
        item.sum += nCC; item.cnt++;
      }
    });

    const rankListPP = allTurmasSorted
      .map(t => {
        const d = turmaScoresPP.get(t);
        return { turma: t, serie: getSerieFromTurma(t), media: d && d.cnt > 0 ? d.sum / d.cnt : null };
      })
      .filter(x => x.media !== null)
      .sort((a, b) => b.media - a.media);

    const rankListCC = allTurmasSorted
      .map(t => {
        const d = turmaScoresCC.get(t);
        return { turma: t, serie: getSerieFromTurma(t), media: d && d.cnt > 0 ? d.sum / d.cnt : null };
      })
      .filter(x => x.media !== null)
      .sort((a, b) => b.media - a.media);

    const posPP = rankListPP.findIndex(x => x.turma === selectedTurma);
    const posCC = rankListCC.findIndex(x => x.turma === selectedTurma);

    const rankListPPSerie = rankListPP.filter(x => x.serie === serieLabel);
    const rankListCCSerie = rankListCC.filter(x => x.serie === serieLabel);
    const posPPSerie = rankListPPSerie.findIndex(x => x.turma === selectedTurma);
    const posCCSerie = rankListCCSerie.findIndex(x => x.turma === selectedTurma);

    const mediaNivelPP = rankListPPSerie.length > 0 ? Number((rankListPPSerie.reduce((a, b) => a + b.media, 0) / rankListPPSerie.length).toFixed(2)) : null;
    const mediaNivelCC = rankListCCSerie.length > 0 ? Number((rankListCCSerie.reduce((a, b) => a + b.media, 0) / rankListCCSerie.length).toFixed(1)) : null;

    return {
      total,
      mediaOficialPP: mediaOficialPP !== null ? mediaOficialPP.toFixed(2) : '-',
      mediaOficialCC: mediaOficialCC !== null ? mediaOficialCC.toFixed(1) : '-',
      rankPP: posPP !== -1 ? posPP + 1 : '-',
      totalPP: rankListPP.length,
      rankPPSerie: posPPSerie !== -1 ? posPPSerie + 1 : '-',
      totalPPSerie: rankListPPSerie.length,
      rankCC: posCC !== -1 ? posCC + 1 : '-',
      totalCC: rankListCC.length,
      rankCCSerie: posCCSerie !== -1 ? posCCSerie + 1 : '-',
      totalCCSerie: rankListCCSerie.length,
      mediaNivelPP, mediaNivelCC
    };
  }, [studentsInTurma, allStudents, allTurmasSorted, selectedTurma, serieLabel]);

  // Colunas Oficiais Bimestre a Bimestre (Turma Inteira vs Nível e Escola)
  const officialBimestralData = useMemo(() => {
    const isPP = activeAvaliacao === 'PP';
    const targetSerie = serieLabel;
    const studentsInSerie = allStudents.filter(s => getSerieFromTurma(s.turma) === targetSerie);
    const normNamesSerieSet = new Set(studentsInSerie.map(s => s.normalizedName));
    const normNamesTurmaSet = new Set(studentsInTurma.map(s => s.normalizedName));
    const normNamesSchoolSet = new Set(allStudents.map(s => s.normalizedName));

    const dataSet = isPP ? provaData : conceitoData;

    return bimestresDisponiveis.map(bim => {
      const bimLabel = bim.replace('º Bimestre', 'º Bi');
      const regsBim = dataSet.filter(r => r.bimestre === bim && r.notas);

      let turmaSum = 0, turmaCnt = 0;
      let serieSum = 0, serieCnt = 0;
      let escolaSum = 0, escolaCnt = 0;

      regsBim.forEach(reg => {
        const isMinhaTurma = normNamesTurmaSet.has(reg.normalizedName) || reg.turmaPlanilha === selectedTurma;
        const isMinhaSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === targetSerie;
        const isMinhaEscola = normNamesSchoolSet.has(reg.normalizedName) || Boolean(reg.turmaPlanilha);
        if (!isMinhaEscola) return;

        Object.entries(reg.notas || {}).forEach(([k, valRaw]) => {
          const formatted = formatDisciplina(k);
          const match = selectedDisc === 'Geral' || formatted === selectedDisc || (formatted.length > 12 && `${formatted.substring(0, 10)}.` === selectedDisc);
          if (match) {
            const nota = isPP ? toScale10(valRaw) : parseGrade(valRaw);
            if (nota !== null && (isPP ? nota >= 0 : nota > 0)) {
              escolaSum += nota; escolaCnt++;
              if (isMinhaSerie) {
                serieSum += nota; serieCnt++;
              }
              if (isMinhaTurma) {
                turmaSum += nota; turmaCnt++;
              }
            }
          }
        });
      });

      const turmaMedia = turmaCnt > 0 ? Number((turmaSum / turmaCnt).toFixed(isPP ? 2 : 1)) : 0;
      const serieMedia = serieCnt > 0 ? Number((serieSum / serieCnt).toFixed(isPP ? 2 : 1)) : 0;
      const escolaMedia = escolaCnt > 0 ? Number((escolaSum / escolaCnt).toFixed(isPP ? 2 : 1)) : 0;

      return {
        bimestre: bimLabel,
        fullBimestre: bim,
        turmaMedia,
        serieMedia,
        escolaMedia,
        diferenca: Number((turmaMedia - serieMedia).toFixed(isPP ? 2 : 1))
      };
    });
  }, [activeAvaliacao, bimestresDisponiveis, selectedDisc, provaData, conceitoData, allStudents, studentsInTurma, selectedTurma, serieLabel]);

  // ── 4. Classificação dos Alunos da Turma ───────────────────────────
  const rankingAnalysis = useMemo(() => {
    const allStudentsEvaluated = allStudents
      .filter(s => s.situacao === 'Ativo')
      .map(s => ({
        student: s,
        score: getStudentGrade(s, activeAvaliacao, selectedDisc, null)
      }))
      .filter(x => x.score !== null);

    const schoolScoresSorted = allStudentsEvaluated
      .map(x => x.score)
      .sort((a, b) => b - a);

    const levelScoresSorted = allStudentsEvaluated
      .filter(x => getSerieFromTurma(x.student.turma || studentTurmaMap.get(x.student.normalizedName)) === serieLabel)
      .map(x => x.score)
      .sort((a, b) => b - a);

    const getSchoolRank = (val) => {
      if (val === null || val === undefined) return '-';
      const idx = schoolScoresSorted.findIndex(s => s <= val);
      return idx !== -1 ? idx + 1 : schoolScoresSorted.length;
    };

    const getLevelRank = (val) => {
      if (val === null || val === undefined) return '-';
      const idx = levelScoresSorted.findIndex(s => s <= val);
      return idx !== -1 ? idx + 1 : levelScoresSorted.length;
    };

    // Alunos da turma ordenados por nota decrescente
    const turmaEvaluated = studentsInTurma
      .filter(s => s.situacao === 'Ativo')
      .map(s => {
        const scoreGeral = getStudentGrade(s, activeAvaliacao, selectedDisc, null);
        const bimGrades = {};
        bimestresDisponiveis.forEach(bim => {
          bimGrades[bim] = getStudentGrade(s, activeAvaliacao, selectedDisc, bim);
        });

        return {
          student: s,
          nome: s.nome,
          tutor: s.tutor || 'Sem Tutor',
          score: scoreGeral,
          bimGrades
        };
      })
      .filter(x => x.score !== null)
      .sort((a, b) => b.score - a.score);

    // Identificação do degrau de quebra
    let maxDrop = 0;
    let breakRank = -1;

    const rankedList = turmaEvaluated.map((item, idx) => {
      const turmaRank = idx + 1;
      const schoolRank = getSchoolRank(item.score);
      const levelRank = getLevelRank(item.score);

      let dropFromPrev = 0;
      if (idx > 0) {
        dropFromPrev = Number((turmaEvaluated[idx - 1].score - item.score).toFixed(2));
        if (dropFromPrev > maxDrop) {
          maxDrop = dropFromPrev;
          breakRank = idx;
        }
      }

      return {
        ...item,
        turmaRank,
        schoolRank,
        levelRank,
        dropFromPrev
      };
    });

    return {
      rankedList,
      maxDrop,
      breakRank: breakRank > 0 ? breakRank : Math.round(rankedList.length * 0.5) || 1,
      totalTurma: rankedList.length,
      totalEscola: schoolScoresSorted.length,
      totalNivel: levelScoresSorted.length
    };
  }, [allStudents, studentsInTurma, activeAvaliacao, selectedDisc, getStudentGrade, studentTurmaMap, serieLabel, bimestresDisponiveis]);

  // Manipuladores de ajuste de slice (unitário ou via input)
  const handleUpdateSlice = (key, delta) => {
    const total = rankingAnalysis.totalTurma || 1;
    if (sliceMode === 'geral' || key === 'global') {
      setGlobalSlice(prev => Math.min(Math.max((prev ?? total) + delta, 1), total));
    } else {
      setIndividualSlices(prev => {
        const curr = prev[key] ?? total;
        return {
          ...prev,
          [key]: Math.min(Math.max(curr + delta, 1), total)
        };
      });
    }
  };

  const handleSetSlice = (key, val) => {
    const total = rankingAnalysis.totalTurma || 1;
    const num = Math.min(Math.max(Number(val) || 1, 1), total);
    if (sliceMode === 'geral' || key === 'global') {
      setGlobalSlice(num);
    } else {
      setIndividualSlices(prev => ({ ...prev, [key]: num }));
    }
  };

  // ── 5. ATO 2: Fileira de Velocímetros (Média Geral + Todos os Bimestres Lado a Lado) ──
  const speedometerCards = useMemo(() => {
    const totalTurma = rankingAnalysis.totalTurma || 1;
    const isPP = activeAvaliacao === 'PP';
    const cards = [];

    // 1. Velocímetro Principal: Média Geral (Consolidada)
    const sliceGeral = sliceMode === 'geral'
      ? (globalSlice ?? totalTurma)
      : (individualSlices['Geral'] ?? totalTurma);
    const clampedGeral = Math.min(Math.max(sliceGeral, 1), totalTurma);
    const topGeral = rankingAnalysis.rankedList.slice(0, clampedGeral);
    const scoreGeral = topGeral.length > 0
      ? Number((topGeral.reduce((acc, c) => acc + c.score, 0) / topGeral.length).toFixed(isPP ? 2 : 1))
      : 0;

    cards.push({
      key: 'Geral',
      label: 'Média Consolidada',
      title: selectedDisc === 'Geral' ? '🌟 Média Geral' : selectedDisc,
      subtitle: 'Média dos Anteriores',
      value: scoreGeral,
      slice: clampedGeral,
      total: totalTurma,
      isHighlight: true
    });

    // 2. Velocímetros Individuais para Cada Bimestre Disponível
    bimestresDisponiveis.forEach(bim => {
      const sliceBim = sliceMode === 'geral'
        ? (globalSlice ?? totalTurma)
        : (individualSlices[bim] ?? totalTurma);

      const studentsWithBim = rankingAnalysis.rankedList
        .filter(item => item.bimGrades[bim] !== null && item.bimGrades[bim] !== undefined)
        .map(item => ({
          ...item,
          bimScore: item.bimGrades[bim]
        }))
        .sort((a, b) => b.bimScore - a.bimScore);

      const totalBim = studentsWithBim.length || totalTurma;
      const clampedBim = Math.min(Math.max(sliceBim, 1), totalBim);
      const topBim = studentsWithBim.slice(0, clampedBim);

      const scoreBim = topBim.length > 0
        ? Number((topBim.reduce((acc, c) => acc + c.bimScore, 0) / topBim.length).toFixed(isPP ? 2 : 1))
        : 0;

      cards.push({
        key: bim,
        label: bim,
        title: bim.replace('º Bimestre', 'º Bi'),
        subtitle: `${selectedDisc === 'Geral' ? 'Média Geral' : selectedDisc} (${activeAvaliacao})`,
        value: scoreBim,
        slice: clampedBim,
        total: totalBim,
        isHighlight: false
      });
    });

    return cards;
  }, [sliceMode, globalSlice, individualSlices, rankingAnalysis, bimestresDisponiveis, selectedDisc, activeAvaliacao]);

  // Sincroniza todos os slices individuais para um mesmo número
  const syncAllSlices = (count) => {
    const total = rankingAnalysis.totalTurma || 1;
    const num = Math.min(Math.max(Number(count) || 1, 1), total);
    const updated = { 'Geral': num };
    bimestresDisponiveis.forEach(b => { updated[b] = num; });
    setIndividualSlices(updated);
  };

  // Grid responsivo dinâmico que mantém todos os velocímetros lado a lado em 1 linha no desktop
  const gridColsClass = useMemo(() => {
    const count = speedometerCards.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
  }, [speedometerCards.length]);

  // Alunos para a Tabela do Ato 3
  const tableStudents = useMemo(() => {
    const sliceGeral = sliceMode === 'geral'
      ? (globalSlice ?? rankingAnalysis.totalTurma)
      : (individualSlices['Geral'] ?? rankingAnalysis.totalTurma);
    const clampedGeral = Math.min(Math.max(sliceGeral, 1), rankingAnalysis.totalTurma || 1);

    let list = showAllInTable ? rankingAnalysis.rankedList : rankingAnalysis.rankedList.slice(0, clampedGeral);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(item =>
        item.nome.toLowerCase().includes(term) ||
        (item.tutor && item.tutor.toLowerCase().includes(term))
      );
    }
    return list;
  }, [showAllInTable, rankingAnalysis, sliceMode, globalSlice, individualSlices, searchTerm]);

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-20">
      
      {/* ─────────────────────────────────────────────────────────────
          BARRA DE TOPO & NAVEGAÇÃO ENTRE TURMAS (LARGURA 100%)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          onClick={() => setSelectedTurma(null)}
          className="flex items-center justify-center gap-2 text-xs font-black text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-widest bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-200"
        >
          <ChevronLeft className="w-4 h-4 text-blue-600" /> Voltar para Lista Geral
        </button>

        {/* Pílulas de Navegação Rápida entre os 3 Atos */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
          <button
            onClick={() => ato1Ref.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 rounded-xl hover:bg-white hover:text-blue-600 transition-all"
          >
            1. Retrato Oficial
          </button>
          <button
            onClick={() => ato2Ref.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 rounded-xl hover:bg-white hover:text-blue-600 transition-all"
          >
            2. Velocímetros & Slices
          </button>
          <button
            onClick={() => ato3Ref.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3.5 py-1.5 rounded-xl hover:bg-white hover:text-blue-600 transition-all"
          >
            3. Raio-X dos Alunos
          </button>
        </div>

        {/* Seletor de Turma Anterior / Próximo */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => prevTurma && setSelectedTurma(prevTurma)}
            disabled={!prevTurma}
            className={`flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${
              !prevTurma
                ? 'text-slate-300 bg-white/50 border-slate-100 cursor-not-allowed shadow-none'
                : 'text-slate-700 bg-white border-slate-200 shadow-sm hover:text-blue-600 hover:border-blue-300 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-blue-600" /> {prevTurma ? `Turma ${prevTurma}` : 'Anterior'}
          </button>
          <button
            onClick={() => nextTurma && setSelectedTurma(nextTurma)}
            disabled={!nextTurma}
            className={`flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${
              !nextTurma
                ? 'text-slate-300 bg-white/50 border-slate-100 cursor-not-allowed shadow-none'
                : 'text-slate-700 bg-white border-slate-200 shadow-sm hover:text-blue-600 hover:border-blue-300 active:scale-95'
            }`}
          >
            {nextTurma ? `Turma ${nextTurma}` : 'Próximo'} <ChevronRight className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ATO 1: O RETRATO OFICIAL DA TURMA (LUMINOSO & 100% CLARO)
      ───────────────────────────────────────────────────────────── */}
      <section ref={ato1Ref} className="space-y-6">
        
        {/* Banner Claro e Luminoso da Turma */}
        <div className="bg-gradient-to-r from-white via-sky-50/60 to-indigo-50/40 rounded-3xl p-8 md:p-10 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-extrabold text-[10px] uppercase tracking-widest bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                  Inteligência Coletiva Oficial
                </span>
                <span className="text-indigo-700 font-black text-[10px] uppercase tracking-widest bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                  {serieLabel}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mt-3">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                  Turma {selectedTurma}
                </h1>
              </div>
              <p className="text-slate-600 text-sm font-medium mt-2 max-w-3xl">
                Diagnóstico acadêmico integral da turma. Os números deste bloco representam a verdade oficial de 100% da sala em relação ao nível e à escola.
              </p>
            </div>

            {/* Cards Oficiais de Ranking e Médias */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center min-w-[110px]">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alunos Ativos</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{officialClassMetrics.total}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">matrículas</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs text-center min-w-[110px]">
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Prova Paulista</p>
                <p className="text-2xl font-black text-sky-700 mt-1">{officialClassMetrics.mediaOficialPP}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Nível: {officialClassMetrics.mediaNivelPP}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs text-center min-w-[110px]">
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Conselho (CC)</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{officialClassMetrics.mediaOficialCC}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Nível: {officialClassMetrics.mediaNivelCC}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs text-center min-w-[110px]">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Posição no Nível</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {officialClassMetrics.rankPPSerie}º <span className="text-xs font-bold text-slate-400">/ {officialClassMetrics.totalPPSerie}</span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">entre as turmas de {serieLabel}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs text-center min-w-[110px]">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Posição na Escola</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {officialClassMetrics.rankPP}º <span className="text-xs font-bold text-slate-400">/ {officialClassMetrics.totalPP}</span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">ranking geral das turmas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Colunas Oficiais Bimestre a Bimestre */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Evolução Histórica Bimestral
                </span>
                <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md uppercase">
                  Turma Inteira vs Nível ({serieLabel}) e Escola
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">
                Como a turma performou em cada bimestre em relação ao nível?
              </h3>
            </div>

            {/* Alternador de Prova Paulista vs Conselho */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                onClick={() => setActiveAvaliacao('PP')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeAvaliacao === 'PP' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Prova Paulista
              </button>
              <button
                onClick={() => setActiveAvaliacao('CC')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeAvaliacao === 'CC' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Conselho (CC)
              </button>
            </div>
          </div>

          {/* Barra de Disciplinas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 max-w-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 ml-1">
              Matéria Analisada:
            </span>
            {availableDisciplines.map(disc => (
              <button
                key={disc}
                onClick={() => setSelectedDisc(disc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                  selectedDisc === disc
                    ? 'bg-blue-600 text-white shadow-sm scale-[1.02]'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {disc === 'Geral' ? '🌟 Média Geral' : disc}
              </button>
            ))}
          </div>

          {/* Gráfico de Colunas */}
          <div style={{ position: 'relative', width: '100%', height: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={officialBimestralData} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bimestre" tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingBottom: '15px' }} />
                <Bar
                  name="Média da Turma (Completa)"
                  dataKey="turmaMedia"
                  fill={activeAvaliacao === 'PP' ? '#0ea5e9' : '#6366f1'}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={55}
                >
                  <LabelList
                    dataKey="turmaMedia"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 800, fill: activeAvaliacao === 'PP' ? '#0284c7' : '#4f46e5' }}
                    formatter={(v) => v > 0 ? Number(v).toFixed(activeAvaliacao === 'PP' ? 2 : 1) : '-'}
                  />
                </Bar>
                <Bar
                  name={`Média Nível (${serieLabel})`}
                  dataKey="serieMedia"
                  fill="#cbd5e1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={55}
                >
                  <LabelList
                    dataKey="serieMedia"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    formatter={(v) => v > 0 ? Number(v).toFixed(activeAvaliacao === 'PP' ? 2 : 1) : '-'}
                  />
                </Bar>
                <Bar
                  name="Média da Escola"
                  dataKey="escolaMedia"
                  fill="#94a3b8"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={55}
                >
                  <LabelList
                    dataKey="escolaMedia"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    formatter={(v) => v > 0 ? Number(v).toFixed(activeAvaliacao === 'PP' ? 2 : 1) : '-'}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          ATO 2: TODOS OS VELOCÍMETROS DOS BIMESTRES LADO A LADO
          (COM SLICE GERAL OU INDIVIDUAL POR BIMESTRE)
      ───────────────────────────────────────────────────────────── */}
      <section ref={ato2Ref} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
        
        {/* Cabeçalho de Controle de Velocímetros & Slices */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                Painel de Velocímetros Bimestrais
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                Lado a Lado
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              Velocímetros dos Bimestres & Média Consolidada
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-3xl mt-0.5">
              Quantos alunos sustentam o rendimento da turma? Visualize simultaneamente o velocímetro consolidado e de cada bimestre. Escolha entre um <strong>Slice Geral sincronizado</strong> ou <strong>Slices Individuais independentes</strong> para cada bimestre.
            </p>
          </div>

          {/* Controles de Topo: Alternador de Modo de Slice & Metas */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Seletor de Modo de Slice */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setSliceMode('geral')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  sliceMode === 'geral' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Um controle deslizante unificado para todos os velocímetros"
              >
                <Layers className="w-3.5 h-3.5" /> Slice Geral
              </button>
              <button
                onClick={() => setSliceMode('individual')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  sliceMode === 'individual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Um controle deslizante independente para cada velocímetro"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Slices Individuais
              </button>
            </div>

            {/* Meta Única Definida pelo Professor */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50/70 to-cyan-50/70 p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2">
                Meta Única da Turma:
              </span>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs">
                <span className="font-extrabold text-amber-700 text-xs">🥇 Ouro:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={metaOuroVal}
                  onChange={(e) => setMetaOuroVal(parseFloat(e.target.value) || 0)}
                  className="w-12 bg-amber-50/40 border border-amber-300 rounded-lg px-1 py-0.5 text-center font-black text-amber-900 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  title="Meta Ouro definida pelo professor"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-cyan-200 shadow-2xs">
                <span className="font-extrabold text-cyan-700 text-xs">💎 Diamante:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={metaDiamanteVal}
                  onChange={(e) => setMetaDiamanteVal(parseFloat(e.target.value) || 0)}
                  className="w-12 bg-cyan-50/40 border border-cyan-300 rounded-lg px-1 py-0.5 text-center font-black text-cyan-900 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                  title="Meta Diamante definida pelo professor"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SE MODO SLICE GERAL: PAINEL DE CONTROLE MESTRE SINCRONIZADO */}
        {sliceMode === 'geral' && (
          <div className="bg-gradient-to-r from-slate-50 via-sky-50/40 to-indigo-50/30 p-5 rounded-3xl border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">
                  Controle Unificado (Aplica a Todos os Velocímetros)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">
                    Top {globalSlice ?? rankingAnalysis.totalTurma}
                  </span>
                  <span className="text-slate-500 font-bold text-xs">
                    de {rankingAnalysis.totalTurma} alunos ({Math.round(((globalSlice ?? rankingAnalysis.totalTurma) / (rankingAnalysis.totalTurma || 1)) * 100)}% da sala)
                  </span>
                </div>
              </div>

              {/* Atalhos Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Atalhos:</span>
                <button
                  onClick={() => handleSetSlice('global', 5)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    globalSlice === 5 ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Top 5
                </button>
                <button
                  onClick={() => handleSetSlice('global', Math.round(rankingAnalysis.totalTurma / 2) || 1)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    globalSlice === Math.round(rankingAnalysis.totalTurma / 2) ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  50% da Turma
                </button>
                {rankingAnalysis.breakRank > 0 && (
                  <button
                    onClick={() => handleSetSlice('global', rankingAnalysis.breakRank)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 ${
                      globalSlice === rankingAnalysis.breakRank ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Ponto de Quebra ({rankingAnalysis.breakRank})
                  </button>
                )}
                <button
                  onClick={() => handleSetSlice('global', rankingAnalysis.totalTurma)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    globalSlice === rankingAnalysis.totalTurma ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Toda a Turma ({rankingAnalysis.totalTurma})
                </button>
              </div>
            </div>

            {/* Slider Deslizante Geral */}
            <div className="flex items-center gap-3">
              <button
                title="Diminuir 1 aluno"
                onClick={() => handleUpdateSlice('global', -1)}
                disabled={(globalSlice ?? rankingAnalysis.totalTurma) <= 1}
                className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1 shrink-0"
              >
                <Minus className="w-3.5 h-3.5" /> 1
              </button>

              <div className="flex-1 relative flex items-center">
                <input
                  type="range"
                  min="1"
                  max={rankingAnalysis.totalTurma || 1}
                  step="1"
                  value={globalSlice ?? rankingAnalysis.totalTurma}
                  onChange={(e) => handleSetSlice('global', e.target.value)}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <button
                title="Aumentar 1 aluno"
                onClick={() => handleUpdateSlice('global', 1)}
                disabled={(globalSlice ?? rankingAnalysis.totalTurma) >= rankingAnalysis.totalTurma}
                className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs flex items-center gap-1 shrink-0"
              >
                + 1
              </button>
            </div>
          </div>
        )}

        {/* SE MODO SLICE INDIVIDUAL: BARRA DE STATUS & SINCRONIZAÇÃO RÁPIDA */}
        {sliceMode === 'individual' && (
          <div className="bg-gradient-to-r from-slate-50 via-indigo-50/30 to-sky-50/30 p-4 rounded-3xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                  Slices Individuais Ativos
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Controle deslizante independente em cada velocímetro
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Ajuste o recorte de alunos diretamente em cada cartão abaixo para comparar diferentes cenários por bimestre.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Sincronizar:</span>
              <button
                onClick={() => syncAllSlices(5)}
                className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 transition-all"
                title="Ajusta todos os velocímetros para Top 5"
              >
                Todos Top 5
              </button>
              <button
                onClick={() => syncAllSlices(Math.round(rankingAnalysis.totalTurma / 2) || 1)}
                className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 transition-all"
                title="Ajusta todos os velocímetros para 50% da turma"
              >
                Todos 50%
              </button>
              <button
                onClick={() => syncAllSlices(rankingAnalysis.totalTurma)}
                className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 transition-all"
                title="Ajusta todos os velocímetros para 100% da turma"
              >
                Toda a Turma
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            FILEIRA DE VELOCÍMETROS CENTRALIZADOS LADO A LADO
        ───────────────────────────────────────────────────────────── */}
        <div className="w-full flex justify-center items-center">
          <div className="flex flex-wrap justify-center items-stretch gap-4 w-full">
            {speedometerCards.map((card) => {
              return (
                <div
                  key={card.key}
                  className="flex-1 min-w-[210px] max-w-[290px] xl:max-w-[320px] flex flex-col justify-center"
                >
                  <SpeedometerGauge
                    value={card.value}
                    metaOuro={metaOuroVal}
                    metaDiamante={metaDiamanteVal}
                    title={card.title}
                    subtitle={card.subtitle}
                    isHighlight={card.isHighlight}
                    theme="light"
                    className="h-full w-full"
                  >
                    {/* SE MODO INDIVIDUAL: MINI-SLIDER EMBUTIDO NO PRÓPRIO CARD */}
                    {sliceMode === 'individual' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">
                            Top <strong className="text-blue-600 font-black">{card.slice}</strong> de {card.total}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {Math.round((card.slice / card.total) * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateSlice(card.key, -1)}
                            disabled={card.slice <= 1}
                            className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-black text-[10px] hover:bg-slate-200 disabled:opacity-30"
                            title="Diminuir 1 aluno"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="range"
                            min="1"
                            max={card.total}
                            step="1"
                            value={card.slice}
                            onChange={(e) => handleSetSlice(card.key, e.target.value)}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />

                          <button
                            onClick={() => handleUpdateSlice(card.key, 1)}
                            disabled={card.slice >= card.total}
                            className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-black text-[10px] hover:bg-slate-200 disabled:opacity-30"
                            title="Aumentar 1 aluno"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-[11px] font-bold text-slate-600 bg-slate-50/80 py-1.5 px-3 rounded-xl border border-slate-200/70">
                        Top <strong className="text-blue-600 font-black">{card.slice}</strong> de {card.total} ({Math.round((card.slice / card.total) * 100)}%)
                      </div>
                    )}
                  </SpeedometerGauge>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          ATO 3: O RAIO-X INDIVIDUAL DOS ALUNOS & COLOCAÇÕES
      ───────────────────────────────────────────────────────────── */}
      <section ref={ato3Ref} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
        
        {/* Cabeçalho da Lista com Busca e Explicação */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                Raio-X dos Alunos
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                {selectedDisc === 'Geral' ? '🌟 Média Geral' : selectedDisc} ({activeAvaliacao})
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              Posicionamento Individual & Notas Bimestrais
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Alunos classificados por nota, com histórico bimestral e médias consolidadas.
            </p>
          </div>

          {/* Busca e Filtro de Visualização */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar aluno na turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <button
              onClick={() => setShowAllInTable(prev => !prev)}
              className={`px-3 py-2 rounded-2xl text-xs font-black transition-all border shrink-0 ${
                showAllInTable
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {showAllInTable ? 'Vendo Toda a Turma' : 'Vendo Apenas Recorte'}
            </button>
          </div>
        </div>

        {/* Tabela de Alunos Clara e Sem Tons Escuros */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3.5 px-4 rounded-l-2xl"># Turma</th>
                <th className="py-3.5 px-4">Estudante</th>
                <th className="py-3.5 px-3 text-center">Escola</th>
                <th className="py-3.5 px-3 text-center">Nível ({serieLabel})</th>
                {bimestresDisponiveis.map(b => (
                  <th key={b} className="py-3.5 px-3 text-center">
                    {b.replace('º Bimestre', 'º Bi')}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right rounded-r-2xl">Média Consolidada</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-slate-700">
              {tableStudents.map((item, idx) => {
                const badgeClass =
                  item.turmaRank === 1
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : item.turmaRank === 2
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : item.turmaRank === 3
                    ? 'bg-amber-700/20 text-amber-900 border-amber-700/30'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                const badgeLabel =
                  item.turmaRank === 1 ? '🥇 1º' : item.turmaRank === 2 ? '🥈 2º' : item.turmaRank === 3 ? '🥉 3º' : `${item.turmaRank}º`;

                return (
                  <React.Fragment key={item.nome || idx}>
                    <tr
                      onClick={() => onSelectStudent && onSelectStudent(item.nome)}
                      className={`border-b border-slate-200/80 transition-colors cursor-pointer group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      } hover:bg-blue-50/50`}
                      title={`Clique para abrir o perfil individual de ${item.nome}`}
                    >
                      {/* Posição na Turma */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-xl border ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      </td>

                      {/* Nome do Aluno e Tutor */}
                      <td className="py-3.5 px-4">
                        <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                          {item.nome}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.tutor}
                        </span>
                      </td>

                      {/* Posição na Escola */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-black">
                          #{item.schoolRank}
                        </span>
                      </td>

                      {/* Posição no Nível */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg text-[10px] font-black">
                          #{item.levelRank}
                        </span>
                      </td>

                      {/* Notas de Cada Bimestre */}
                      {bimestresDisponiveis.map(b => {
                        const val = item.bimGrades[b];
                        return (
                          <td key={b} className="py-3.5 px-3 text-center">
                            {val !== null && val !== undefined ? (
                              <span className="font-bold text-slate-700">
                                {Number(val).toFixed(activeAvaliacao === 'PP' ? 2 : 1)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Média Consolidada */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block font-black text-xs px-3 py-1 rounded-xl border ${
                          activeAvaliacao === 'PP'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {item.score !== null ? Number(item.score).toFixed(activeAvaliacao === 'PP' ? 2 : 1) : '-'}
                        </span>
                      </td>
                    </tr>

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {tableStudents.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-bold text-xs">
              Nenhum aluno encontrado para os filtros selecionados.
            </div>
          )}
        </div>

        {/* Rodapé Didático */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <span>
            💡 Clique em qualquer aluno para abrir sua ficha individual completa com histórico de avaliações.
          </span>
          <span>
            Exibindo <strong>{tableStudents.length}</strong> de {rankingAnalysis.totalTurma} alunos.
          </span>
        </div>
      </section>

    </div>
  );
};

export default ClassProfile;
