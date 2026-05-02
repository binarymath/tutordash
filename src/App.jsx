import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { normalizeName, parseGrade, formatDisciplina, toScale10 } from './utils/helpers';
import { buildChartDataMapao, buildChartDataProva } from './utils/buildChartData';
import { useStudents } from './hooks/useStudents';
import { useNotes } from './hooks/useNotes';
import { useProvas } from './hooks/useProvas';
import { useConceitos } from './hooks/useConceitos';

import ConfigModal    from './components/ConfigModal';
import Header         from './components/Header';
import EmptyState     from './components/EmptyState';
import Dashboard      from './components/Dashboard';
import StudentProfile from './components/StudentProfile';

const App = () => {
  const queryClient = useQueryClient();

  const [multiConfig, setMultiConfig] = useState(() => {
    const defaultProfileData = {
      studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: ''
    };
    const defaultData = {
      activeProfile: 'Principal',
      profiles: {
        'Principal': { ...defaultProfileData }
      }
    };

    try {
      const saved = localStorage.getItem('tutorDashConfig');
      if (!saved) return defaultData;

      const parsed = JSON.parse(saved);
      
      // Migração: se for um objeto antigo que não tem activeProfile
      if (parsed && !parsed.activeProfile) {
        return {
          activeProfile: 'Principal',
          profiles: {
            'Principal': { ...defaultProfileData, ...parsed }
          }
        };
      }
      return {
        ...defaultData,
        ...parsed,
        profiles: {
          ...defaultData.profiles,
          ...(parsed.profiles || {})
        }
      };
    } catch {
      return defaultData;
    }
  });

  useEffect(() => {
    localStorage.setItem('tutorDashConfig', JSON.stringify(multiConfig));
  }, [multiConfig]);

  const changeProfile = (nome) => {
    if (nome === multiConfig.activeProfile) return;
    
    // Prevenção de "Stale State": Limpa imediatamente o cache das queries
    // Isso forçará o estado "Carregando" puro até que novos dados cheguem
    queryClient.removeQueries();

    setMultiConfig(prev => {
      const profiles = { ...prev.profiles };
      if (!profiles[nome]) {
        // Se para algum motivo pedir perfil novo aqui
        profiles[nome] = { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' };
      }
      return { ...prev, activeProfile: nome, profiles };
    });
  };

  const saveProfile = (nome, configUrls) => {
    setMultiConfig(prev => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [nome]: configUrls
      }
    }));
  };

  const activeProfile = multiConfig.activeProfile;
  const config = multiConfig.profiles[activeProfile] || { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' };

  // ── Estado de navegação ────────────────────────────────────
  const [showSettings,          setShowSettings]          = useState(false);
  const [filterMode,            setFilterMode]            = useState('tutor');
  const [selectedValue,         setSelectedValue]         = useState('Todos');
  const [searchTerm,            setSearchTerm]            = useState('');
  const [selectedStudent,       setSelectedStudent]       = useState(null);
  const [selectedSessionFilters, setSelectedSessionFilters] = useState([]);
  const [sortConfig,            setSortConfig]            = useState({ key: 'turma', direction: 'asc' });
  const [showStickyName,        setShowStickyName]        = useState(false);
  const [showOnlyActive,        setShowOnlyActive]        = useState(true);

  // Resetar filtro de sessão ao trocar de aluno
  useEffect(() => { setSelectedSessionFilters([]); }, [selectedStudent]);

  // Controle de nome flutuante no header ao rolar
  useEffect(() => {
    const handleScroll = () => setShowStickyName(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Dados (TanStack Query) ─────────────────────────────────
  const { data: dataRaw = [], isLoading: isLoadingStudents, isFetching: isFetchingStudents, error: errorStudents } = useStudents(config.studentsUrl);
  const { data: annotations = [], isLoading: isLoadingNotes, isFetching: isFetchingNotes, error: errorNotes } = useNotes(config.notesUrl);
  const { data: provaData = [], isLoading: isLoadingProvas, isFetching: isFetchingProvas, error: errorProvas } = useProvas(config.provaUrl);
  const { data: conceitoData = [], isLoading: isLoadingConceitos, isFetching: isFetchingConceitos, error: errorConceitos } = useConceitos(config.conceitoUrl);

  const data = useMemo(() => {
    // 1. Set de nomes que já possuem tutor atribuído
    const tutoredSet = new Set();
    dataRaw.forEach(item =>
      item.tutorados.forEach(nome => tutoredSet.add(normalizeName(nome)))
    );

    // 2. Mapa de órfãos: normalizedName → { nomeOriginal, turma }
    //    Prioridade de turma: Mapão (conceitos) > Prova Paulista
    const orphanMap = new Map();

    // 2a. Varredura do Mapão (conceitos bimestrais)
    conceitoData.forEach(c => {
      if (!tutoredSet.has(c.normalizedName) && !orphanMap.has(c.normalizedName)) {
        orphanMap.set(c.normalizedName, {
          nomeOriginal: c.nomeOriginal || c.normalizedName,
          turma: c.turmaPlanilha || 'Sem Turma',
        });
      }
    });

    // 2b. Varredura da Prova Paulista (somente alunos ainda não mapeados)
    provaData.forEach(p => {
      if (!tutoredSet.has(p.normalizedName) && !orphanMap.has(p.normalizedName)) {
        orphanMap.set(p.normalizedName, {
          nomeOriginal: p.nomeOriginal || p.normalizedName,
          turma: p.turmaPlanilha || 'Sem Turma',
        });
      }
    });

    // 3. Agrupa órfãos por turma
    const byTurma = new Map();
    for (const { nomeOriginal, turma } of orphanMap.values()) {
      if (!byTurma.has(turma)) byTurma.set(turma, []);
      byTurma.get(turma).push(nomeOriginal);
    }

    // 4. Gera grupos "Sem Tutor" por turma
    const orphanGroups = [];
    let orphanIdx = 0;
    for (const [turma, tutorados] of byTurma.entries()) {
      orphanGroups.push({
        id: `orphan-${orphanIdx++}`,
        turma,
        tutor: 'Sem Tutor',
        tutorados,
      });
    }

    return [...dataRaw, ...orphanGroups];
  }, [dataRaw, conceitoData, provaData]);

  const isLoading = isLoadingStudents || isLoadingNotes || isLoadingProvas || isLoadingConceitos;
  const isSyncing = isFetchingStudents || isFetchingNotes || isFetchingProvas || isFetchingConceitos;
  
  const [manualError, setManualError] = useState(null);

  const queryError = errorStudents || errorNotes || errorProvas || errorConceitos;
  const error = manualError || (queryError ? queryError.message : null);
  const setError = setManualError;

  useEffect(() => {
    if (config.studentsUrl) {
      setManualError(null);
    }
  }, [config.studentsUrl]);

  const loadAllData = async (silent = false) => {
    if (!config.studentsUrl) {
      if (!silent) {
        setManualError("O URL da Planilha de Tutoria (Base) é obrigatória.");
        setShowSettings(true);
      }
      return;
    }
    await queryClient.invalidateQueries();
  };

  // ── Derivações computadas ──────────────────────────────────
  const allStudents = useMemo(() => {
    const list = [];
    data.forEach(item => {
      item.tutorados.forEach(nomeOriginal => {
        const normName       = normalizeName(nomeOriginal);
        const studentNotes   = annotations.filter(n => n.normalizedName === normName);
        const provaInfo      = provaData.find(p => p.normalizedName === normName);
        let conceitosDoAluno = conceitoData.filter(c => c.normalizedName === normName);
        conceitosDoAluno.sort((a, b) => a.bimestre.localeCompare(b.bimestre));
        const ultimoBimestre = conceitosDoAluno.length > 0 ? conceitosDoAluno[conceitosDoAluno.length - 1] : null;
        let quickMat = '-', quickPort = '-';
        // Calcula CC: média de todas as notas do último bimestre (Conselho Bimestral)
        let consilhoBimestral = 'S/D';
        if (ultimoBimestre?.notas) {
          const chaves  = Object.keys(ultimoBimestre.notas);
          const matKey  = chaves.find(k => k.toUpperCase().includes('MATEM'));
          const portKey = chaves.find(k => k.toUpperCase().includes('PORTUG'));
          if (matKey)  quickMat  = ultimoBimestre.notas[matKey];
          if (portKey) quickPort = ultimoBimestre.notas[portKey];
          // Média geral de todas as notas válidas (igual ao Mapão no perfil)
          const notasValidas = chaves
            .map(k => parseGrade(ultimoBimestre.notas[k]))
            .filter(n => n > 0);
          if (notasValidas.length > 0) {
            const media = notasValidas.reduce((s, n) => s + n, 0) / notasValidas.length;
            consilhoBimestral = media.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
        list.push({
          nome: nomeOriginal, normalizedName: normName,
          turma: item.turma, tutor: item.tutor,
          notes: studentNotes, noteCount: studentNotes.length,
          lastNoteDate: studentNotes.length > 0 ? studentNotes[0].displayDate : null,
          provaPaulista: (() => {
            const raw = provaInfo?.resultado;
            if (!raw || raw === 'S/D' || raw === 'S/N') return raw || 'S/D';
            const scaled = toScale10(raw);
            return scaled != null
              ? scaled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : raw;
          })(),
          provaPaulistaNotas: provaInfo ? provaInfo.notas : null,
          historicoConceitos: conceitosDoAluno,
          consilhoBimestral,
          ultimoBimNome: ultimoBimestre ? ultimoBimestre.bimestre : 'Sem Dados',
          situacao: ultimoBimestre?.situacao || 'Ativo'
        });
      });
    });
    return list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [data, annotations, provaData, conceitoData]);

  const studentProfile = useMemo(() => {
    if (!selectedStudent) return null;
    return allStudents.find(s => s.nome === selectedStudent) || null;
  }, [selectedStudent, allStudents]);

  const chartDataMapao = useMemo(
    () => buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents),
    [studentProfile, conceitoData, provaData, allStudents]
  );

  const chartDataProva = useMemo(
    () => buildChartDataProva(studentProfile, conceitoData, provaData, allStudents),
    [studentProfile, conceitoData, provaData, allStudents]
  );

  const optionsList = useMemo(() => {
    const field        = filterMode === 'tutor' ? 'tutor' : 'turma';
    const uniqueValues = [...new Set(data.map(item => item[field]))];
    const sorted = uniqueValues.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    
    if (field === 'tutor' && sorted.includes('Sem Tutor')) {
      return ['Todos', ...sorted.filter(t => t !== 'Sem Tutor'), 'Sem Tutor'];
    }
    
    return ['Todos', ...sorted];
  }, [data, filterMode]);

  const filteredData = useMemo(() => {
    let filteredGroups = data;
    if (selectedValue !== 'Todos') {
      const field = filterMode === 'tutor' ? 'tutor' : 'turma';
      filteredGroups = data.filter(item => item[field] === selectedValue);
    }
    
    if (showOnlyActive) {
      filteredGroups = filteredGroups.map(group => {
        const filteredTutorados = group.tutorados.filter(nome => {
          const norm = normalizeName(nome);
          const studentInfo = allStudents.find(s => s.normalizedName === norm);
          return studentInfo && studentInfo.situacao === 'Ativo';
        });
        return { ...group, tutorados: filteredTutorados };
      }).filter(group => group.tutorados.length > 0);
    }
    
    return filteredGroups;
  }, [data, selectedValue, filterMode, allStudents, showOnlyActive]);

  const filteredStudents = useMemo(() => {
    const names = new Set();
    filteredData.forEach(item => item.tutorados.forEach(nome => names.add(nome)));
    return allStudents
      .filter(student => names.has(student.nome))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [filteredData, allStudents]);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === 'alunos') {
        const aStudents = [...a.tutorados].sort((x, y) => x.localeCompare(y, 'pt-BR')).join(' | ').toLowerCase();
        const bStudents = [...b.tutorados].sort((x, y) => x.localeCompare(y, 'pt-BR')).join(' | ').toLowerCase();
        if (aStudents < bStudents) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStudents > bStudents) return sortConfig.direction === 'asc' ? 1 : -1;
      } else {
        const aVal = String(a[sortConfig.key] || '').toLowerCase();
        const bVal = String(b[sortConfig.key] || '').toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1  : -1;
      }
      const aTurma = String(a.turma).toLowerCase();
      const bTurma = String(b.turma).toLowerCase();
      return aTurma < bTurma ? -1 : aTurma > bTurma ? 1 : 0;
    });
  }, [filteredData, sortConfig]);

  const stats = useMemo(() => ({
    totalStudents: filteredData.reduce((acc, curr) => acc + curr.tutorados.length, 0),
    totalGroups:   new Set(filteredData.map(d => d.turma)).size
  }), [filteredData]);

  // Alunos visíveis no filtro atual, para o RankingPanel
  const rankingStudents = useMemo(() => {
    const names = new Set();
    filteredData.forEach(item => item.tutorados.forEach(n => names.add(n)));
    return allStudents.filter(s => names.has(s.nome));
  }, [filteredData, allStudents]);

  // Título contextual do ranking
  const filterLabel = useMemo(() => {
    if (selectedValue === 'Todos') return 'Ranking Geral';
    if (filterMode === 'tutor') return `Ranking — Tutor: ${selectedValue}`;
    return `Ranking — Turma: ${selectedValue}`;
  }, [filterMode, selectedValue]);

  const currentStudentList = useMemo(() => {
    if (searchTerm) {
      return allStudents.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(s => s.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    const list = [];
    filteredData.forEach(item => item.tutorados.forEach(nome => { if (!list.includes(nome)) list.push(nome); }));
    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [searchTerm, allStudents, filteredData]);

  const currentIndex = selectedStudent ? currentStudentList.indexOf(selectedStudent) : -1;
  const prevStudent  = currentIndex > 0 ? currentStudentList[currentIndex - 1] : null;
  const nextStudent  = currentIndex >= 0 && currentIndex < currentStudentList.length - 1 ? currentStudentList[currentIndex + 1] : null;

  const studentSessions = useMemo(() => {
    if (!studentProfile) return [];
    const sessions = new Set(
      studentProfile.notes.map(n => (n.tipoSessao && String(n.tipoSessao).trim() ? n.tipoSessao : 'Sem tipo'))
    );
    return Array.from(sessions).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [studentProfile]);

  const studentSessionCounts = useMemo(() => {
    if (!studentProfile) return {};
    return studentProfile.notes.reduce((acc, note) => {
      const tipo = note.tipoSessao && String(note.tipoSessao).trim() ? note.tipoSessao : 'Sem tipo';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
  }, [studentProfile]);

  const filteredNotes = useMemo(() => {
    if (!studentProfile) return [];
    if (selectedSessionFilters.length === 0) return studentProfile.notes;
    return studentProfile.notes.filter(n => {
      const tipo = n.tipoSessao && String(n.tipoSessao).trim() ? n.tipoSessao : 'Sem tipo';
      return selectedSessionFilters.includes(tipo);
    });
  }, [studentProfile, selectedSessionFilters]);

  // ── Renderização ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

      {showSettings && (
        <ConfigModal
          activeProfile={activeProfile}
          profiles={multiConfig.profiles}
          changeProfile={changeProfile}
          saveProfile={saveProfile}
          onClose={() => setShowSettings(false)}
          onLoad={() => loadAllData(false)}
          isLoading={isLoading}
        />
      )}

      <Header
        selectedStudent={selectedStudent}
        studentProfile={studentProfile}
        prevStudent={prevStudent}
        nextStudent={nextStudent}
        setSelectedStudent={setSelectedStudent}
        isSyncing={isSyncing}
        onRefresh={data.length > 0 ? () => loadAllData(true) : null}
        config={config}
        onOpenSettings={() => setShowSettings(true)}
        showStickyName={showStickyName}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data.length === 0 ? (
          <EmptyState onLoad={loadAllData} isLoading={isLoading} canLoad={!!config.studentsUrl} onOpenSettings={() => setShowSettings(true)} />
        ) : (
          <div className="space-y-6">
            {!selectedStudent ? (
              <Dashboard
                allStudents={allStudents}
                sortedData={sortedData}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                selectedValue={selectedValue}
                setSelectedValue={setSelectedValue}
                optionsList={optionsList}
                stats={stats}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                setSelectedStudent={setSelectedStudent}
                sortConfig={sortConfig}
                handleSort={handleSort}
                showOnlyActive={showOnlyActive}
                setShowOnlyActive={setShowOnlyActive}
                rankingStudents={rankingStudents}
                filterLabel={filterLabel}
              />
            ) : (
              <StudentProfile
                studentProfile={studentProfile}
                filteredNotes={filteredNotes}
                studentSessions={studentSessions}
                studentSessionCounts={studentSessionCounts}
                selectedSessionFilters={selectedSessionFilters}
                setSelectedSessionFilters={setSelectedSessionFilters}
                prevStudent={prevStudent}
                nextStudent={nextStudent}
                setSelectedStudent={setSelectedStudent}
                chartDataMapao={chartDataMapao}
                chartDataProva={chartDataProva}
                filteredStudents={filteredStudents}
                conceitoData={conceitoData}
                provaData={provaData}
                allStudents={allStudents}
              />
            )}
          </div>
        )}

        {error && (
          <div className="fixed bottom-6 right-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 shadow-xl flex items-center gap-3 font-bold text-sm max-w-sm z-50">
            <AlertCircle className="shrink-0" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)}><X className="w-4 h-4 ml-2 shrink-0" /></button>
          </div>
        )}

        {data.length === 0 ? (
          <footer className="mt-16 border-t border-slate-200 pt-8 pb-4 flex flex-col items-center text-center">
            <p className="text-slate-500 mb-4 font-medium max-w-md">
              Tem alguma dúvida ou encontrou um problema? Nossa equipe de desenvolvimento está pronta para ajudar.
            </p>
            <a
              href="https://wa.me/5515991497579"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 rounded-full font-semibold transition-all text-sm shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Suporte via WhatsApp
            </a>
          </footer>
        ) : (
          <a
            href="https://wa.me/5515991497579"
            target="_blank"
            rel="noopener noreferrer"
            title="Suporte via WhatsApp"
            className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-white/90 backdrop-blur text-slate-500 hover:text-slate-800 border border-slate-200/70 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-[#25D366] transition-colors fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <span className="text-sm font-medium">Precisa de ajuda ou encontrou um problema?</span>
          </a>
        )}
      </main>
    </div>
  );
};

export default App;