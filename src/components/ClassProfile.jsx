// ─────────────────────────────────────────────────────────────
// components/ClassProfile.jsx — Painel Executivo e Comparativo de Turma
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Users, TrendingUp, BookOpen, Printer,
  Maximize2, Minimize2, X, BarChart2, Award, PieChart, ShieldCheck,
  Trophy, Medal, Star
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, LabelList
} from 'recharts';
import {
  buildTurmaChartDataMapao,
  buildTurmaChartDataProva,
  buildTurmaEvolucaoData
} from '../utils/buildChartData';
import { parseGrade, toScale10, formatDisciplina, getSerieFromTurma } from '../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-xl text-white text-xs z-50">
      <p className="font-black border-b border-slate-700/80 pb-2 mb-2 text-sky-300 uppercase tracking-wider">{payload[0]?.payload?.fullSubject || label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-bold text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-black text-white text-sm">
              {entry.value !== null && entry.value !== undefined ? Number(entry.value).toFixed(entry.dataKey?.includes('pp') || entry.name?.includes('PP') || entry.name?.includes('Prova') ? 2 : 1) : '-'}
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
  const [selectedBimestre, setSelectedBimestre] = useState('ultimo');
  const [maximizedChart, setMaximizedChart] = useState(null);
  const [selectedDiscPP, setSelectedDiscPP] = useState('Geral');
  const [selectedDiscCC, setSelectedDiscCC] = useState('Geral');

  const serieLabel = useMemo(() => getSerieFromTurma(selectedTurma), [selectedTurma]);

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

  const studentsInTurma = useMemo(() => {
    return allStudents.filter(s => s.turma === selectedTurma);
  }, [allStudents, selectedTurma]);

  // Bimestres disponíveis
  const bimestresDisponiveis = useMemo(() => {
    const setBim = new Set([
      ...conceitoData.map(c => c.bimestre),
      ...provaData.map(p => p.bimestre)
    ]);
    return Array.from(setBim).filter(Boolean).sort();
  }, [conceitoData, provaData]);

  const evolucaoDados = useMemo(() => {
    return buildTurmaEvolucaoData(selectedTurma, conceitoData, provaData, allStudents);
  }, [selectedTurma, conceitoData, provaData, allStudents]);

  // Métricas Consolidadas da Turma (Dinâmicas por Bimestre)
  const heroMetrics = useMemo(() => {
    const total = studentsInTurma.length;
    if (!total) return { total: 0, mediaCC: '-', mediaPP: '-' };

    let targetBim = selectedBimestre;
    if (targetBim === 'ultimo') {
      targetBim = bimestresDisponiveis[bimestresDisponiveis.length - 1] || '';
    }

    if (targetBim === 'evolucao' || !targetBim) {
      let ccSum = 0, ccCnt = 0;
      let ppSum = 0, ppCnt = 0;
      studentsInTurma.forEach(s => {
        const nCC = parseFloat(String(s.consilhoBimestral || '').replace(',', '.'));
        if (!isNaN(nCC) && nCC >= 0) { ccSum += nCC; ccCnt++; }
        const nPP = parseFloat(String(s.provaPaulista || '').replace(',', '.'));
        if (!isNaN(nPP) && nPP >= 0) { ppSum += nPP; ppCnt++; }
      });
      return {
        total,
        mediaCC: ccCnt > 0 ? (ccSum / ccCnt).toFixed(1) : '-',
        mediaPP: ppCnt > 0 ? (ppSum / ppCnt).toFixed(2) : '-'
      };
    }

    const bimLabel = targetBim.replace('º Bimestre', 'º Bi');
    const bData = evolucaoDados.find(e => e.bimestre === bimLabel);

    return {
      total,
      mediaCC: bData && bData.ccTurma > 0 ? Number(bData.ccTurma).toFixed(1) : '-',
      mediaPP: bData && bData.ppTurma > 0 ? Number(bData.ppTurma).toFixed(2) : '-'
    };
  }, [studentsInTurma, selectedBimestre, bimestresDisponiveis, evolucaoDados]);

  const rankingMetrics = useMemo(() => {
    let targetBim = selectedBimestre;
    if (targetBim === 'ultimo') {
      targetBim = bimestresDisponiveis[bimestresDisponiveis.length - 1] || '';
    }

    const mapCC = new Map();
    const mapPP = new Map();
    allTurmasSorted.forEach(t => {
      mapCC.set(t, { sum: 0, count: 0 });
      mapPP.set(t, { sum: 0, count: 0 });
    });

    if (targetBim === 'evolucao' || !targetBim) {
      allStudents.forEach(s => {
        if (!s.turma || !mapCC.has(s.turma)) return;
        const nCC = parseFloat(String(s.consilhoBimestral || '').replace(',', '.'));
        if (!isNaN(nCC) && nCC >= 0) {
          const item = mapCC.get(s.turma);
          item.sum += nCC; item.count++;
        }
        const nPP = parseFloat(String(s.provaPaulista || '').replace(',', '.'));
        if (!isNaN(nPP) && nPP >= 0) {
          const item = mapPP.get(s.turma);
          item.sum += nPP; item.count++;
        }
      });
    } else {
      const bimLabel = targetBim.replace('º Bimestre', 'º Bi');
      const studentTurmaMap = new Map();
      allStudents.forEach(s => {
        if (s.normalizedName && s.turma) studentTurmaMap.set(s.normalizedName, s.turma);
      });

      conceitoData.forEach(reg => {
        if (reg.bimestre !== bimLabel && reg.bimestre !== targetBim) return;
        const turma = reg.turmaPlanilha || studentTurmaMap.get(reg.normalizedName);
        if (!turma || !mapCC.has(turma)) return;
        const item = mapCC.get(turma);

        Object.values(reg.notas || {}).forEach(valRaw => {
          const n = parseGrade(valRaw);
          if (n > 0) { item.sum += n; item.count++; }
        });
      });

      provaData.forEach(reg => {
        if (reg.bimestre !== bimLabel && reg.bimestre !== targetBim) return;
        const turma = reg.turmaPlanilha || studentTurmaMap.get(reg.normalizedName);
        if (!turma || !mapPP.has(turma)) return;
        const item = mapPP.get(turma);

        Object.values(reg.notas || {}).forEach(valRaw => {
          const n = toScale10(valRaw);
          if (n !== null) { item.sum += n; item.count++; }
        });
      });
    }

    const rankingCC = allTurmasSorted
      .map(t => {
        const d = mapCC.get(t);
        return { turma: t, serie: getSerieFromTurma(t), media: d && d.count > 0 ? d.sum / d.count : null };
      })
      .filter(x => x.media !== null)
      .sort((a, b) => b.media - a.media);

    const rankingPP = allTurmasSorted
      .map(t => {
        const d = mapPP.get(t);
        return { turma: t, serie: getSerieFromTurma(t), media: d && d.count > 0 ? d.sum / d.count : null };
      })
      .filter(x => x.media !== null)
      .sort((a, b) => b.media - a.media);

    const posCC = rankingCC.findIndex(x => x.turma === selectedTurma);
    const posPP = rankingPP.findIndex(x => x.turma === selectedTurma);

    const rankingCCSerie = rankingCC.filter(x => x.serie === serieLabel);
    const rankingPPSerie = rankingPP.filter(x => x.serie === serieLabel);
    const posCCSerie = rankingCCSerie.findIndex(x => x.turma === selectedTurma);
    const posPPSerie = rankingPPSerie.findIndex(x => x.turma === selectedTurma);

    const mediaTurmaCC = posCC !== -1 ? rankingCC[posCC].media : null;
    const mediaTurmaPP = posPP !== -1 ? rankingPP[posPP].media : null;
    const mediaEscolaCC = rankingCC.length > 0 ? rankingCC.reduce((acc, c) => acc + c.media, 0) / rankingCC.length : null;
    const mediaEscolaPP = rankingPP.length > 0 ? rankingPP.reduce((acc, c) => acc + c.media, 0) / rankingPP.length : null;
    const mediaSerieCC = rankingCCSerie.length > 0 ? rankingCCSerie.reduce((acc, c) => acc + c.media, 0) / rankingCCSerie.length : null;
    const mediaSeriePP = rankingPPSerie.length > 0 ? rankingPPSerie.reduce((acc, c) => acc + c.media, 0) / rankingPPSerie.length : null;

    return {
      rankCC: posCC !== -1 ? posCC + 1 : '-',
      totalCC: rankingCC.length || allTurmasSorted.length,
      rankPP: posPP !== -1 ? posPP + 1 : '-',
      totalPP: rankingPP.length || allTurmasSorted.length,
      rankCCSerie: posCCSerie !== -1 ? posCCSerie + 1 : '-',
      totalCCSerie: rankingCCSerie.length || 1,
      rankPPSerie: posPPSerie !== -1 ? posPPSerie + 1 : '-',
      totalPPSerie: rankingPPSerie.length || 1,
      mediaTurmaCC, mediaTurmaPP, mediaEscolaCC, mediaEscolaPP, mediaSerieCC, mediaSeriePP
    };
  }, [allTurmasSorted, allStudents, conceitoData, provaData, selectedBimestre, bimestresDisponiveis, selectedTurma, serieLabel]);

  const chartDataMapao = useMemo(() => {
    return buildTurmaChartDataMapao(selectedTurma, conceitoData, allStudents, selectedBimestre);
  }, [selectedTurma, conceitoData, allStudents, selectedBimestre]);

  const chartDataProva = useMemo(() => {
    return buildTurmaChartDataProva(selectedTurma, provaData, allStudents, selectedBimestre);
  }, [selectedTurma, provaData, allStudents, selectedBimestre]);

  const disciplineRankingData = useMemo(() => {
    const discSetPP = new Set();
    chartDataProva.forEach(item => discSetPP.add(item.fullSubject || item.subject));
    const listDiscsPP = ['Geral', ...Array.from(discSetPP).sort()];
    const currentDiscPP = listDiscsPP.includes(selectedDiscPP) ? selectedDiscPP : 'Geral';

    const discSetCC = new Set();
    chartDataMapao.forEach(item => discSetCC.add(item.fullSubject || item.subject));
    const listDiscsCC = ['Geral', ...Array.from(discSetCC).sort()];
    const currentDiscCC = listDiscsCC.includes(selectedDiscCC) ? selectedDiscCC : 'Geral';

    const getSchoolRank = (val, list) => {
      if (val === null) return '-';
      const idx = list.findIndex(n => n <= val);
      return idx !== -1 ? idx + 1 : list.length;
    };

    let targetBim = selectedBimestre;
    if (targetBim === 'ultimo') {
      targetBim = bimestresDisponiveis[bimestresDisponiveis.length - 1] || '';
    }
    const bimLabel = targetBim.replace('º Bimestre', 'º Bi');

    const studentTurmaMap = new Map();
    allStudents.forEach(s => {
      if (s.normalizedName && s.turma) studentTurmaMap.set(s.normalizedName, s.turma);
    });

    // --- PROVA PAULISTA ---
    let turmaMediaPP = '-', escolaMediaPP = '-', rankPP = '-', totalPP = 1, rankSeriePP = '-', totalSeriePP = 1, topPP = [];
    if (currentDiscPP === 'Geral') {
      const listPP = studentsInTurma
        .map(s => {
          const val = parseFloat(String(s.provaPaulista || '').replace(',', '.'));
          return { ...s, val: isNaN(val) ? null : val };
        })
        .filter(s => s.val !== null && s.situacao === 'Ativo')
        .sort((a, b) => b.val - a.val);

      const schoolPP = allStudents
        .map(s => parseFloat(String(s.provaPaulista || '').replace(',', '.')))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a);

      const levelPP = allStudents
        .filter(s => getSerieFromTurma(s.turma || studentTurmaMap.get(s.normalizedName)) === serieLabel)
        .map(s => parseFloat(String(s.provaPaulista || '').replace(',', '.')))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a);

      turmaMediaPP = rankingMetrics.mediaTurmaPP !== null ? rankingMetrics.mediaTurmaPP.toFixed(2) : '-';
      escolaMediaPP = rankingMetrics.mediaEscolaPP !== null ? rankingMetrics.mediaEscolaPP.toFixed(2) : '-';
      rankPP = rankingMetrics.rankPP;
      totalPP = rankingMetrics.totalPP;
      rankSeriePP = rankingMetrics.rankPPSerie;
      totalSeriePP = rankingMetrics.totalPPSerie;
      topPP = listPP.map(s => ({ ...s, schoolRank: getSchoolRank(s.val, schoolPP), levelRank: getSchoolRank(s.val, levelPP) })).slice(0, 10);
    } else {
      const turmaSumPP = new Map(), turmaCntPP = new Map();
      allTurmasSorted.forEach(t => { turmaSumPP.set(t, 0); turmaCntPP.set(t, 0); });

      provaData.forEach(reg => {
        if (targetBim !== 'evolucao' && reg.bimestre !== bimLabel && reg.bimestre !== targetBim) return;
        const turma = reg.turmaPlanilha || studentTurmaMap.get(reg.normalizedName);
        if (!turma || !turmaSumPP.has(turma)) return;

        Object.entries(reg.notas || {}).forEach(([disc, valRaw]) => {
          const disp = formatDisciplina(disc);
          if (disp === currentDiscPP || (disp.length > 12 && `${disp.substring(0, 10)}.` === currentDiscPP)) {
            const n = toScale10(valRaw);
            if (n !== null) {
              turmaSumPP.set(turma, turmaSumPP.get(turma) + n);
              turmaCntPP.set(turma, turmaCntPP.get(turma) + 1);
            }
          }
        });
      });

      const rankListPP = allTurmasSorted
        .map(t => {
          const cnt = turmaCntPP.get(t);
          return { turma: t, serie: getSerieFromTurma(t), media: cnt > 0 ? turmaSumPP.get(t) / cnt : null };
        })
        .filter(x => x.media !== null)
        .sort((a, b) => b.media - a.media);

      const posPP = rankListPP.findIndex(x => x.turma === selectedTurma);
      turmaMediaPP = posPP !== -1 ? rankListPP[posPP].media.toFixed(2) : '-';
      escolaMediaPP = rankListPP.length > 0 ? (rankListPP.reduce((s, x) => s + x.media, 0) / rankListPP.length).toFixed(2) : '-';
      rankPP = posPP !== -1 ? posPP + 1 : '-';
      totalPP = rankListPP.length || 1;

      const rankListPPSerie = rankListPP.filter(x => x.serie === serieLabel);
      const posPPSerie = rankListPPSerie.findIndex(x => x.turma === selectedTurma);
      rankSeriePP = posPPSerie !== -1 ? posPPSerie + 1 : '-';
      totalSeriePP = rankListPPSerie.length || 1;

      const getStudentDiscGradePP = (student) => {
        let nota = null;
        const hist = student.historicoProvas || [];
        const bimObj = targetBim === 'evolucao' || !targetBim
          ? hist[hist.length - 1]
          : hist.find(h => h.bimestre === bimLabel || h.bimestre === targetBim) || hist[hist.length - 1];
        if (bimObj?.notas) {
          Object.entries(bimObj.notas).forEach(([disc, valRaw]) => {
            const disp = formatDisciplina(disc);
            if (disp === currentDiscPP || (disp.length > 12 && `${disp.substring(0, 10)}.` === currentDiscPP)) {
              const n = toScale10(valRaw);
              if (n !== null) nota = n;
            }
          });
        }
        return nota;
      };

      const listPP = studentsInTurma
        .map(s => ({ ...s, val: getStudentDiscGradePP(s) }))
        .filter(s => s.val !== null && s.situacao === 'Ativo')
        .sort((a, b) => b.val - a.val);

      const schoolPP = allStudents
        .map(s => getStudentDiscGradePP(s))
        .filter(n => n !== null)
        .sort((a, b) => b - a);

      const levelPP = allStudents
        .filter(s => getSerieFromTurma(s.turma || studentTurmaMap.get(s.normalizedName)) === serieLabel)
        .map(s => getStudentDiscGradePP(s))
        .filter(n => n !== null)
        .sort((a, b) => b - a);

      topPP = listPP.map(s => ({ ...s, schoolRank: getSchoolRank(s.val, schoolPP), levelRank: getSchoolRank(s.val, levelPP) })).slice(0, 10);
    }

    // --- CONSELHO DE CLASSE ---
    let turmaMediaCC = '-', escolaMediaCC = '-', rankCC = '-', totalCC = 1, rankSerieCC = '-', totalSerieCC = 1, topCC = [];
    if (currentDiscCC === 'Geral') {
      const listCC = studentsInTurma
        .map(s => {
          const val = parseFloat(String(s.consilhoBimestral || '').replace(',', '.'));
          return { ...s, val: isNaN(val) ? null : val };
        })
        .filter(s => s.val !== null && s.situacao === 'Ativo')
        .sort((a, b) => b.val - a.val);

      const schoolCC = allStudents
        .map(s => parseFloat(String(s.consilhoBimestral || '').replace(',', '.')))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a);

      const levelCC = allStudents
        .filter(s => getSerieFromTurma(s.turma || studentTurmaMap.get(s.normalizedName)) === serieLabel)
        .map(s => parseFloat(String(s.consilhoBimestral || '').replace(',', '.')))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a);

      turmaMediaCC = rankingMetrics.mediaTurmaCC !== null ? rankingMetrics.mediaTurmaCC.toFixed(1) : '-';
      escolaMediaCC = rankingMetrics.mediaEscolaCC !== null ? rankingMetrics.mediaEscolaCC.toFixed(1) : '-';
      rankCC = rankingMetrics.rankCC;
      totalCC = rankingMetrics.totalCC;
      rankSerieCC = rankingMetrics.rankCCSerie;
      totalSerieCC = rankingMetrics.totalCCSerie;
      topCC = listCC.map(s => ({ ...s, schoolRank: getSchoolRank(s.val, schoolCC), levelRank: getSchoolRank(s.val, levelCC) })).slice(0, 10);
    } else {
      const turmaSumCC = new Map(), turmaCntCC = new Map();
      allTurmasSorted.forEach(t => { turmaSumCC.set(t, 0); turmaCntCC.set(t, 0); });

      conceitoData.forEach(reg => {
        if (targetBim !== 'evolucao' && reg.bimestre !== bimLabel && reg.bimestre !== targetBim) return;
        const turma = reg.turmaPlanilha || studentTurmaMap.get(reg.normalizedName);
        if (!turma || !turmaSumCC.has(turma)) return;

        Object.entries(reg.notas || {}).forEach(([disc, valRaw]) => {
          const disp = formatDisciplina(disc);
          if (disp === currentDiscCC || (disp.length > 12 && `${disp.substring(0, 10)}.` === currentDiscCC)) {
            const n = parseGrade(valRaw);
            if (n > 0) {
              turmaSumCC.set(turma, turmaSumCC.get(turma) + n);
              turmaCntCC.set(turma, turmaCntCC.get(turma) + 1);
            }
          }
        });
      });

      const rankListCC = allTurmasSorted
        .map(t => {
          const cnt = turmaCntCC.get(t);
          return { turma: t, serie: getSerieFromTurma(t), media: cnt > 0 ? turmaSumCC.get(t) / cnt : null };
        })
        .filter(x => x.media !== null)
        .sort((a, b) => b.media - a.media);

      const posCC = rankListCC.findIndex(x => x.turma === selectedTurma);
      turmaMediaCC = posCC !== -1 ? rankListCC[posCC].media.toFixed(1) : '-';
      escolaMediaCC = rankListCC.length > 0 ? (rankListCC.reduce((s, x) => s + x.media, 0) / rankListCC.length).toFixed(1) : '-';
      rankCC = posCC !== -1 ? posCC + 1 : '-';
      totalCC = rankListCC.length || 1;

      const rankListCCSerie = rankListCC.filter(x => x.serie === serieLabel);
      const posCCSerie = rankListCCSerie.findIndex(x => x.turma === selectedTurma);
      rankSerieCC = posCCSerie !== -1 ? posCCSerie + 1 : '-';
      totalSerieCC = rankListCCSerie.length || 1;

      const getStudentDiscGradeCC = (student) => {
        let nota = null;
        const hist = student.historicoConceitos || [];
        const bimObj = targetBim === 'evolucao' || !targetBim
          ? hist[hist.length - 1]
          : hist.find(h => h.bimestre === bimLabel || h.bimestre === targetBim) || hist[hist.length - 1];
        if (bimObj?.notas) {
          Object.entries(bimObj.notas).forEach(([disc, valRaw]) => {
            const disp = formatDisciplina(disc);
            if (disp === currentDiscCC || (disp.length > 12 && `${disp.substring(0, 10)}.` === currentDiscCC)) {
              const n = parseGrade(valRaw);
              if (n > 0) nota = n;
            }
          });
        }
        return nota;
      };

      const listCC = studentsInTurma
        .map(s => ({ ...s, val: getStudentDiscGradeCC(s) }))
        .filter(s => s.val !== null && s.situacao === 'Ativo')
        .sort((a, b) => b.val - a.val);

      const schoolCC = allStudents
        .map(s => getStudentDiscGradeCC(s))
        .filter(n => n !== null)
        .sort((a, b) => b - a);

      const levelCC = allStudents
        .filter(s => getSerieFromTurma(s.turma || studentTurmaMap.get(s.normalizedName)) === serieLabel)
        .map(s => getStudentDiscGradeCC(s))
        .filter(n => n !== null)
        .sort((a, b) => b - a);

      topCC = listCC.map(s => ({ ...s, schoolRank: getSchoolRank(s.val, schoolCC), levelRank: getSchoolRank(s.val, levelCC) })).slice(0, 10);
    }

    return {
      pp: { listDiscs: listDiscsPP, currentDisc: currentDiscPP, turmaMedia: turmaMediaPP, escolaMedia: escolaMediaPP, rank: rankPP, total: totalPP, rankSerie: rankSeriePP, totalSerie: totalSeriePP, top: topPP },
      cc: { listDiscs: listDiscsCC, currentDisc: currentDiscCC, turmaMedia: turmaMediaCC, escolaMedia: escolaMediaCC, rank: rankCC, total: totalCC, rankSerie: rankSerieCC, totalSerie: totalSerieCC, top: topCC }
    };
  }, [chartDataMapao, chartDataProva, selectedDiscPP, selectedDiscCC, studentsInTurma, allStudents, selectedBimestre, bimestresDisponiveis, allTurmasSorted, conceitoData, provaData, selectedTurma, rankingMetrics, serieLabel]);

  const evolucaoDisciplinas = useMemo(() => {
    if (!selectedTurma) return { cc: [], pp: [] };
    const stTurma = allStudents.filter(s => s.turma === selectedTurma);
    const normSet = new Set(stTurma.map(s => s.normalizedName));

    const mapCC = new Map();
    const mapPP = new Map();

    conceitoData.forEach(reg => {
      const isTurma = normSet.has(reg.normalizedName) || reg.turmaPlanilha === selectedTurma;
      if (!isTurma || !reg.notas || !reg.bimestre) return;

      Object.entries(reg.notas).forEach(([disc, valRaw]) => {
        const n = parseGrade(valRaw);
        if (n > 0 || (valRaw && valRaw !== '-')) {
          const val = n > 0 ? n : 0;
          if (!mapCC.has(disc)) {
            const disp = formatDisciplina(disc);
            mapCC.set(disc, { fullSubject: disp, subject: disp.length > 12 ? `${disp.substring(0,10)}.` : disp });
          }
          const item = mapCC.get(disc);
          if (!item[reg.bimestre]) item[reg.bimestre] = { sum: 0, cnt: 0 };
          item[reg.bimestre].sum += val;
          item[reg.bimestre].cnt += 1;
        }
      });
    });

    provaData.forEach(reg => {
      const isTurma = normSet.has(reg.normalizedName) || reg.turmaPlanilha === selectedTurma;
      if (!isTurma || !reg.notas || !reg.bimestre) return;

      Object.entries(reg.notas).forEach(([disc, valRaw]) => {
        const n = toScale10(valRaw);
        if (n !== null) {
          if (!mapPP.has(disc)) {
            const disp = formatDisciplina(disc);
            mapPP.set(disc, { fullSubject: disp, subject: disp.length > 12 ? `${disp.substring(0,10)}.` : disp });
          }
          const item = mapPP.get(disc);
          if (!item[reg.bimestre]) item[reg.bimestre] = { sum: 0, cnt: 0 };
          item[reg.bimestre].sum += n;
          item[reg.bimestre].cnt += 1;
        }
      });
    });

    const cc = Array.from(mapCC.values()).map(item => {
      const res = { subject: item.subject, fullSubject: item.fullSubject };
      bimestresDisponiveis.forEach(b => {
        if (item[b] && item[b].cnt > 0) {
          res[b] = parseFloat((item[b].sum / item[b].cnt).toFixed(1));
        } else {
          res[b] = null;
        }
      });
      return res;
    });

    const pp = Array.from(mapPP.values()).map(item => {
      const res = { subject: item.subject, fullSubject: item.fullSubject };
      bimestresDisponiveis.forEach(b => {
        if (item[b] && item[b].cnt > 0) {
          res[b] = parseFloat((item[b].sum / item[b].cnt).toFixed(2));
        } else {
          res[b] = null;
        }
      });
      return res;
    });

    return { cc, pp };
  }, [selectedTurma, conceitoData, provaData, allStudents, bimestresDisponiveis]);

  const activeBimestreLabel = useMemo(() => {
    if (selectedBimestre === 'evolucao') return 'Evolução Comparativa Histórica';
    if (selectedBimestre === 'ultimo') {
      return bimestresDisponiveis[bimestresDisponiveis.length - 1] || 'Período Atual';
    }
    return selectedBimestre;
  }, [selectedBimestre, bimestresDisponiveis]);

  const printChart = (chartNode, title) => {
    window.print();
  };

  const renderChartContent = (chartConfig) => {
    if (!chartConfig) return null;
    switch (chartConfig.type) {
      case 'evolucaoCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Média da Turma" dataKey="ccTurma" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ccTurma" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="ccEscola" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ccEscola" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'evolucaoDiscCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDisciplinas.cc} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              {bimestresDisponiveis.map((bim, idx) => (
                <Bar key={bim} name={bim} dataKey={bim} fill={['#93c5fd', '#3b82f6', '#1d4ed8', '#172554'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={45}>
                  <LabelList dataKey={bim} position="top" style={{ fontSize: 10, fontWeight: 700, fill: ['#60a5fa', '#2563eb', '#1e40af', '#172554'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'evolucaoPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Média da Turma" dataKey="ppTurma" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ppTurma" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="ppEscola" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ppEscola" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'evolucaoDiscPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDisciplinas.pp} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              {bimestresDisponiveis.map((bim, idx) => (
                <Bar key={bim} name={bim} dataKey={bim} fill={['#7dd3fc', '#0ea5e9', '#0369a1', '#082f49'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={45}>
                  <LabelList dataKey={bim} position="top" style={{ fontSize: 10, fontWeight: 700, fill: ['#38bdf8', '#0284c7', '#075985', '#082f49'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'radarCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataMapao}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
              <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
              <Radar name="Média da Turma" dataKey="Turma" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'barrasCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataMapao} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Média da Turma" dataKey="Turma" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'radarPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataProva}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
              <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
              <Radar name="Média da Turma" dataKey="Turma" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'barrasPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataProva} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Média da Turma" dataKey="Turma" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (!selectedTurma) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Botão de Retorno e Navegação Rápida entre Turmas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          onClick={() => setSelectedTurma(null)}
          className="flex items-center justify-center gap-2 text-sm font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200"
        >
          <ChevronLeft className="w-5 h-5" /> Voltar para Lista Geral
        </button>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={() => prevTurma && setSelectedTurma(prevTurma)}
            disabled={!prevTurma}
            className={`flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${!prevTurma ? 'text-slate-300 bg-white/50 border-slate-100 cursor-not-allowed shadow-none' : 'text-slate-700 bg-white border-slate-200 shadow-sm hover:text-blue-600 hover:border-blue-300 active:scale-95'}`}
            title={prevTurma ? `Ir para Turma ${prevTurma}` : 'Não há turma anterior'}
          >
            <ChevronLeft className="w-4 h-4 text-blue-600" /> {prevTurma ? `Turma ${prevTurma}` : 'Anterior'}
          </button>
          <button
            onClick={() => nextTurma && setSelectedTurma(nextTurma)}
            disabled={!nextTurma}
            className={`flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${!nextTurma ? 'text-slate-300 bg-white/50 border-slate-100 cursor-not-allowed shadow-none' : 'text-slate-700 bg-white border-slate-200 shadow-sm hover:text-blue-600 hover:border-blue-300 active:scale-95'}`}
            title={nextTurma ? `Ir para Turma ${nextTurma}` : 'Não há próxima turma'}
          >
            {nextTurma ? `Turma ${nextTurma}` : 'Próximo'} <ChevronRight className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Hero Banner da Turma */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Users className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <span className="text-sky-400 font-extrabold text-xs uppercase tracking-widest bg-sky-950/80 border border-sky-800/50 px-3.5 py-1.5 rounded-xl">Inteligência Coletiva</span>
            
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => prevTurma && setSelectedTurma(prevTurma)}
                disabled={!prevTurma}
                className={`p-2 rounded-2xl border transition-all ${!prevTurma ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-white/10 hover:bg-white/20 text-white border-white/20 active:scale-90'}`}
                title={prevTurma ? `Ir para Turma ${prevTurma}` : 'Não há turma anterior'}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">Turma {selectedTurma}</h1>
              <button
                onClick={() => nextTurma && setSelectedTurma(nextTurma)}
                disabled={!nextTurma}
                className={`p-2 rounded-2xl border transition-all ${!nextTurma ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-white/10 hover:bg-white/20 text-white border-white/20 active:scale-90'}`}
                title={nextTurma ? `Ir para Turma ${nextTurma}` : 'Não há próxima turma'}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <p className="text-slate-300 text-sm font-medium mt-2 max-w-xl">
              Análise comparativa de desempenho acadêmico, equilíbrio por componente curricular e evolução bimestral em relação à média de seu nível.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativos</p>
              <p className="text-2xl font-black text-white mt-1">{heroMetrics.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Média CC</p>
              <p className="text-2xl font-black text-purple-200 mt-1">{heroMetrics.mediaCC}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">Média PP</p>
              <p className="text-2xl font-black text-sky-200 mt-1">{heroMetrics.mediaPP}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Bimestre / Visão */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 shrink-0">Período Analisado:</span>
        <button
          onClick={() => setSelectedBimestre('evolucao')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${selectedBimestre === 'evolucao' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <TrendingUp className="w-4 h-4" /> Evolução Comparativa
        </button>
        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />
        {bimestresDisponiveis.map(bim => (
          <button
            key={bim}
            onClick={() => setSelectedBimestre(bim)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${selectedBimestre === bim ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {bim}
          </button>
        ))}
        <button
          onClick={() => setSelectedBimestre('ultimo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${selectedBimestre === 'ultimo' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Último Disponível
        </button>
      </div>

      {/* Bloco 1: Cards de Ranking Coletivo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Prova Paulista */}
        <div className="bg-gradient-to-br from-sky-900 via-slate-900 to-sky-950 p-6 rounded-3xl border border-sky-800/50 shadow-lg text-white relative overflow-hidden group hover:border-sky-500/50 transition-all">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 bg-sky-500/20 rounded-2xl border border-sky-500/30 text-sky-400 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Ranking da Turma — Média Geral</span>
                <h3 className="text-xl font-black text-white tracking-tight">Prova Paulista (PP)</h3>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1.5 bg-sky-500/20 text-sky-300 rounded-xl border border-sky-500/30 whitespace-nowrap">
              {serieLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
            <div className="text-center border-r border-white/10 pr-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Na Escola</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-black text-white">{rankingMetrics.rankPP}º</span>
                <span className="text-xs font-bold text-sky-300">/ {rankingMetrics.totalPP}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">entre todas as turmas</p>
            </div>
            <div className="text-center pl-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Nível ({serieLabel})</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Medal className="w-4 h-4 text-sky-400" />
                <span className="text-2xl font-black text-white">{rankingMetrics.rankPPSerie}º</span>
                <span className="text-xs font-bold text-sky-300">/ {rankingMetrics.totalPPSerie}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">entre turmas do mesmo ano</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-2">
            <span>Média Turma: <strong className="text-white text-sm">{heroMetrics.mediaPP}</strong></span>
            <span>•</span>
            <span>Média Nível: <strong className="text-sky-300">{rankingMetrics.mediaSeriePP !== null ? rankingMetrics.mediaSeriePP.toFixed(2) : '-'}</strong></span>
            <span>•</span>
            <span>Média Escola: <strong className="text-slate-400">{rankingMetrics.mediaEscolaPP !== null ? rankingMetrics.mediaEscolaPP.toFixed(2) : '-'}</strong></span>
          </div>
        </div>

        {/* Card Conselho de Classe */}
        <div className="bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-purple-800/50 shadow-lg text-white relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Ranking da Turma — Média Geral</span>
                <h3 className="text-xl font-black text-white tracking-tight">Conselho de Classe (CC)</h3>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 whitespace-nowrap">
              {serieLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
            <div className="text-center border-r border-white/10 pr-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Na Escola</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-black text-white">{rankingMetrics.rankCC}º</span>
                <span className="text-xs font-bold text-purple-300">/ {rankingMetrics.totalCC}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">entre todas as turmas</p>
            </div>
            <div className="text-center pl-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Nível ({serieLabel})</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Medal className="w-4 h-4 text-purple-400" />
                <span className="text-2xl font-black text-white">{rankingMetrics.rankCCSerie}º</span>
                <span className="text-xs font-bold text-purple-300">/ {rankingMetrics.totalCCSerie}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5">entre turmas do mesmo ano</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-2">
            <span>Média Turma: <strong className="text-white text-sm">{heroMetrics.mediaCC}</strong></span>
            <span>•</span>
            <span>Média Nível: <strong className="text-purple-300">{rankingMetrics.mediaSerieCC !== null ? rankingMetrics.mediaSerieCC.toFixed(1) : '-'}</strong></span>
            <span>•</span>
            <span>Média Escola: <strong className="text-slate-400">{rankingMetrics.mediaEscolaCC !== null ? rankingMetrics.mediaEscolaCC.toFixed(1) : '-'}</strong></span>
          </div>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {selectedBimestre === 'evolucao' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Evolução CC Turma */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[380px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoCC', title: `Evolução Média Geral — Conselho (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Evolução Média Geral — Conselho</h4>
              <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '15px' }} />
                    <Bar name="Média da Turma" dataKey="ccTurma" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ccTurma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
                    </Bar>
                    <Bar name={`Média (${serieLabel})`} dataKey="ccEscola" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ccEscola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução PP Turma */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[380px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoPP', title: `Evolução Média Geral — Prova Paulista (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Evolução Média Geral — Prova Paulista</h4>
              <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '15px' }} />
                    <Bar name="Média da Turma" dataKey="ppTurma" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ppTurma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
                    </Bar>
                    <Bar name={`Média (${serieLabel})`} dataKey="ppEscola" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ppEscola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Evolução por Disciplina - Conselho */}
          {evolucaoDisciplinas.cc.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[420px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoDiscCC', title: `Evolução por Disciplina — Conselho (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Conselho — Evolução Comparativa por Disciplina</h4>
              <div style={{ position: 'relative', width: '100%', height: '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDisciplinas.cc} margin={{ top: 25, right: 10, left: -20, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                    {bimestresDisponiveis.map((bim, idx) => (
                      <Bar key={bim} name={bim} dataKey={bim} fill={['#93c5fd', '#3b82f6', '#1d4ed8', '#172554'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={35}>
                        <LabelList dataKey={bim} position="top" style={{ fontSize: 9, fontWeight: 700, fill: ['#60a5fa', '#2563eb', '#1e40af', '#172554'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Evolução por Disciplina - Prova Paulista */}
          {evolucaoDisciplinas.pp.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[420px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoDiscPP', title: `Evolução por Disciplina — Prova Paulista (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Prova Paulista — Evolução Comparativa por Disciplina</h4>
              <div style={{ position: 'relative', width: '100%', height: '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDisciplinas.pp} margin={{ top: 25, right: 10, left: -20, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                    {bimestresDisponiveis.map((bim, idx) => (
                      <Bar key={bim} name={bim} dataKey={bim} fill={['#7dd3fc', '#0ea5e9', '#0369a1', '#082f49'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={35}>
                        <LabelList dataKey={bim} position="top" style={{ fontSize: 9, fontWeight: 700, fill: ['#38bdf8', '#0284c7', '#075985', '#082f49'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs font-bold">
            💡 Dica pedagógica: Compare a evolução da Média da Turma em relação à Média ({serieLabel}) para identificar em quais bimestres a turma obteve saltos de aprendizagem ou necessitou de intervenção pedagógica coletiva.
          </div>
        </div>
      ) : (
        /* Visão por Bimestre Específico */
        <div className="space-y-12">
          
          {/* Seção 1: Conselho Bimestral */}
          {chartDataMapao.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Conselho Bimestral (Notas Escolares)</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeBimestreLabel}</p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl">Componentes Curriculares</span>
              </div>

              <div className="space-y-8">
                {/* Radar Conselho */}
                <div className="w-full bg-slate-50/80 p-6 md:p-8 rounded-3xl border border-slate-100 flex flex-col items-center relative min-h-[380px]" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'radarCC', title: `Radar de Equilíbrio — Conselho (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shadow-sm"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-widest text-center">Radar de Equilíbrio Coletivo</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataMapao}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                        <Radar name="Média da Turma" dataKey="Turma" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Barras Conselho */}
                <div className="w-full bg-white p-6 md:p-8 rounded-3xl relative min-h-[400px] border border-slate-100 shadow-sm" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'barrasCC', title: `Comparativo de Notas — Conselho (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center">Comparativo de Média por Disciplina</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataMapao} margin={{ top: 20, right: 10, left: -20, bottom: 65 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                        <Bar name="Média da Turma" dataKey="Turma" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                        </Bar>
                        <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seção 2: Prova Paulista */}
          {chartDataProva.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Prova Paulista (Avaliação Estadual)</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeBimestreLabel}</p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase px-3.5 py-1.5 bg-sky-50 text-sky-700 rounded-xl">Desempenho por Componente</span>
              </div>

              <div className="space-y-8">
                {/* Radar Prova Paulista */}
                <div className="w-full bg-sky-50/50 p-6 md:p-8 rounded-3xl border border-sky-100 flex flex-col items-center relative min-h-[380px]" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'radarPP', title: `Desempenho por Área — Prova Paulista (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-white transition-colors shadow-sm"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-sky-600 uppercase mb-4 tracking-widest text-center">Desempenho por Área Coletivo</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataProva}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                        <Radar name="Média da Turma" dataKey="Turma" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Barras Prova Paulista */}
                <div className="w-full bg-white p-6 md:p-8 rounded-3xl relative min-h-[400px] border border-slate-100 shadow-sm" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'barrasPP', title: `Comparativo de Notas — Prova Paulista (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center">Comparativo de Média Estadual</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataProva} margin={{ top: 20, right: 10, left: -20, bottom: 65 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                        <Bar name="Média da Turma" dataKey="Turma" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                        </Bar>
                        <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartDataMapao.length === 0 && chartDataProva.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 p-20 rounded-3xl text-center shadow-sm">
              <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-700 tracking-tight">Nenhuma avaliação registrada para a Turma {selectedTurma} neste período</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium">Esta turma não possui consolidados cadastrados no período selecionado.<br/>Escolha outro bimestre ou acesse a visão de Evolução Comparativa Histórica no topo.</p>
            </div>
          )}

        </div>
      )}

      {/* Bloco 2 & 3: Central de Ranking por Disciplina & Destaques da Turma */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Inteligência Coletiva</span>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Ranking por Disciplina & Destaques da Turma</h3>
            </div>
          </div>
        </div>

        {/* Grid Duplo de Cards: Prova Paulista vs Conselho de Classe */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          {/* Card 1: Prova Paulista */}
          <div className="bg-sky-50/30 p-6 rounded-3xl border border-sky-200/80 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-100 mb-4">
              <div>
                <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest bg-sky-100/80 px-2.5 py-1 rounded-full">Prova Paulista</span>
                <h4 className="text-lg font-black text-slate-800 mt-1">{disciplineRankingData.pp.currentDisc === 'Geral' ? '🌟 Média Geral' : disciplineRankingData.pp.currentDisc}</h4>
                <span className="text-xs font-bold text-sky-700 block mt-1">Média da Turma: <strong className="font-black">{disciplineRankingData.pp.turmaMedia}</strong></span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="text-right bg-white px-3.5 py-2 rounded-2xl border border-sky-100 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Na Escola</span>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-lg font-black text-sky-600">{disciplineRankingData.pp.rank}º</span>
                    <span className="text-[11px] font-bold text-slate-400">/ {disciplineRankingData.pp.total}</span>
                  </div>
                </div>
                <div className="text-right bg-white px-3.5 py-2 rounded-2xl border border-sky-100 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">No Nível ({serieLabel})</span>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-lg font-black text-sky-600">{disciplineRankingData.pp.rankSerie}º</span>
                    <span className="text-[11px] font-bold text-slate-400">/ {disciplineRankingData.pp.totalSerie}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor Embutido PP */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-sky-100 max-w-full">
              {disciplineRankingData.pp.listDiscs.map(disc => (
                <button
                  key={disc}
                  onClick={() => setSelectedDiscPP(disc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                    disciplineRankingData.pp.currentDisc === disc
                      ? 'bg-sky-600 text-white shadow-sm scale-[1.02]'
                      : 'bg-white/90 text-slate-500 hover:text-slate-800 hover:bg-white border border-sky-100/80'
                  }`}
                >
                  {disc === 'Geral' ? '🌟 Média Geral' : disc}
                </button>
              ))}
            </div>

            <h5 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Destaques da Turma — Prova Paulista
            </h5>

            <div className="space-y-2.5 flex-1">
              {disciplineRankingData.pp.top.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-sky-100 text-slate-400 font-bold text-xs">
                  Nenhum dado disponível para este recorte.
                </div>
              ) : (
                disciplineRankingData.pp.top.map((s, idx) => {
                  const medals = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º', '9º', '10º'];
                  return (
                    <div
                      key={s.nome || idx}
                      onClick={() => onSelectStudent && onSelectStudent(s.nome)}
                      role="button"
                      tabIndex={0}
                      title={`Abrir perfil individual de ${s.nome}`}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white hover:shadow-md hover:border-sky-300 hover:scale-[1.01] cursor-pointer group ${idx < 3 ? 'border-sky-200 bg-sky-50/20' : 'border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : idx === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                          {medals[idx]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate group-hover:text-sky-600 transition-colors">
                            {s.nome}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                              {s.tutor || 'Sem Tutor'}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                              🏫 #{s.schoolRank} Geral
                            </span>
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                              🎯 #{s.levelRank} Nível
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 bg-sky-50 text-sky-700 border-sky-100">
                        {s.val !== null && s.val !== undefined ? Number(s.val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Conselho de Classe */}
          <div className="bg-purple-50/30 p-6 rounded-3xl border border-purple-200/80 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-100 mb-4">
              <div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-100/80 px-2.5 py-1 rounded-full">Conselho de Classe</span>
                <h4 className="text-lg font-black text-slate-800 mt-1">{disciplineRankingData.cc.currentDisc === 'Geral' ? '🌟 Média Geral' : disciplineRankingData.cc.currentDisc}</h4>
                <span className="text-xs font-bold text-purple-700 block mt-1">Média da Turma: <strong className="font-black">{disciplineRankingData.cc.turmaMedia}</strong></span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="text-right bg-white px-3.5 py-2 rounded-2xl border border-purple-100 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Na Escola</span>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-lg font-black text-purple-600">{disciplineRankingData.cc.rank}º</span>
                    <span className="text-[11px] font-bold text-slate-400">/ {disciplineRankingData.cc.total}</span>
                  </div>
                </div>
                <div className="text-right bg-white px-3.5 py-2 rounded-2xl border border-purple-100 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">No Nível ({serieLabel})</span>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-lg font-black text-purple-600">{disciplineRankingData.cc.rankSerie}º</span>
                    <span className="text-[11px] font-bold text-slate-400">/ {disciplineRankingData.cc.totalSerie}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor Embutido CC */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-purple-100 max-w-full">
              {disciplineRankingData.cc.listDiscs.map(disc => (
                <button
                  key={disc}
                  onClick={() => setSelectedDiscCC(disc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                    disciplineRankingData.cc.currentDisc === disc
                      ? 'bg-purple-600 text-white shadow-sm scale-[1.02]'
                      : 'bg-white/90 text-slate-500 hover:text-slate-800 hover:bg-white border border-purple-100/80'
                  }`}
                >
                  {disc === 'Geral' ? '🌟 Média Geral' : disc}
                </button>
              ))}
            </div>

            <h5 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Destaques da Turma — Conselho
            </h5>

            <div className="space-y-2.5 flex-1">
              {disciplineRankingData.cc.top.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-purple-100 text-slate-400 font-bold text-xs">
                  Nenhum dado disponível para este recorte.
                </div>
              ) : (
                disciplineRankingData.cc.top.map((s, idx) => {
                  const medals = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º', '9º', '10º'];
                  return (
                    <div
                      key={s.nome || idx}
                      onClick={() => onSelectStudent && onSelectStudent(s.nome)}
                      role="button"
                      tabIndex={0}
                      title={`Abrir perfil individual de ${s.nome}`}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-white hover:shadow-md hover:border-purple-300 hover:scale-[1.01] cursor-pointer group ${idx < 3 ? 'border-purple-200 bg-purple-50/20' : 'border-slate-200'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : idx === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                          {medals[idx]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate group-hover:text-purple-600 transition-colors">
                            {s.nome}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                              {s.tutor || 'Sem Tutor'}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                              🏫 #{s.schoolRank} Geral
                            </span>
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                              🎯 #{s.levelRank} Nível
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 bg-purple-50 text-purple-700 border-purple-100">
                        {s.val !== null && s.val !== undefined ? Number(s.val).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Maximizado */}
      {maximizedChart && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col p-4 md:p-10 animate-fade-in">
          <div className="flex items-center justify-between text-white mb-6 max-w-7xl mx-auto w-full">
            <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">
              <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Maximize2 className="w-6 h-6"/></span>
              {maximizedChart.title}
            </h3>
            <button
              onClick={() => setMaximizedChart(null)}
              className="px-4 py-2.5 bg-white/10 hover:bg-rose-500 hover:text-white rounded-2xl text-slate-200 transition-all flex items-center gap-2 font-bold text-xs shadow-lg"
            >
              <Minimize2 className="w-4 h-4" /> Fechar Tela Cheia
            </button>
          </div>
          <div className="flex-1 w-full max-w-7xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-2xl relative flex flex-col justify-center min-h-0 border border-slate-100 overflow-hidden">
            <div className="w-full h-full min-h-[450px]">
              {renderChartContent(maximizedChart)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClassProfile;
