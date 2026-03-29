// ─────────────────────────────────────────────────────────────
// App.jsx — Orquestrador principal do TutorDash
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, X } from 'lucide-react';

import { normalizeName, parseGrade, formatDisciplina } from './utils/helpers';
import { useAppData } from './hooks/useAppData';

import ConfigModal    from './components/ConfigModal';
import Header         from './components/Header';
import EmptyState     from './components/EmptyState';
import Dashboard      from './components/Dashboard';
import StudentProfile from './components/StudentProfile';

const App = () => {
  // ── Configuração persistente ───────────────────────────────
  const [config, setConfig] = useState(() => {
    const defaultConfig = {
      studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: ''
    };

    try {
      const saved = localStorage.getItem('tutorDashConfig');
      if (!saved) return defaultConfig;

      const parsed = JSON.parse(saved);
      return {
        ...defaultConfig,
        ...(parsed && typeof parsed === 'object' ? parsed : {})
      };
    } catch {
      return defaultConfig;
    }
  });
  useEffect(() => {
    localStorage.setItem('tutorDashConfig', JSON.stringify(config));
  }, [config]);

  // ── Estado de navegação ────────────────────────────────────
  const [showSettings,          setShowSettings]          = useState(false);
  const [filterMode,            setFilterMode]            = useState('tutor');
  const [selectedValue,         setSelectedValue]         = useState('Todos');
  const [searchTerm,            setSearchTerm]            = useState('');
  const [selectedStudent,       setSelectedStudent]       = useState(null);
  const [selectedSessionFilters, setSelectedSessionFilters] = useState([]);
  const [sortConfig,            setSortConfig]            = useState({ key: 'turma', direction: 'asc' });
  const [showStickyName,        setShowStickyName]        = useState(false);

  // Resetar filtro de sessão ao trocar de aluno
  useEffect(() => { setSelectedSessionFilters([]); }, [selectedStudent]);

  // Controle de nome flutuante no header ao rolar
  useEffect(() => {
    const handleScroll = () => setShowStickyName(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Dados (via hook) ───────────────────────────────────────
  const {
    data, annotations, provaData, conceitoData,
    isLoading, isSyncing, error, setError, loadAllData
  } = useAppData(config, setShowSettings);

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
        if (ultimoBimestre?.notas) {
          const chaves  = Object.keys(ultimoBimestre.notas);
          const matKey  = chaves.find(k => k.toUpperCase().includes('MATEM'));
          const portKey = chaves.find(k => k.toUpperCase().includes('PORTUG'));
          if (matKey)  quickMat  = ultimoBimestre.notas[matKey];
          if (portKey) quickPort = ultimoBimestre.notas[portKey];
        }
        list.push({
          nome: nomeOriginal, normalizedName: normName,
          turma: item.turma, tutor: item.tutor,
          notes: studentNotes, noteCount: studentNotes.length,
          lastNoteDate: studentNotes.length > 0 ? studentNotes[0].displayDate : null,
          provaPaulista: provaInfo ? provaInfo.resultado : 'S/D',
          provaPaulistaNotas: provaInfo ? provaInfo.notas : null,
          historicoConceitos: conceitosDoAluno,
          ultimoMat: quickMat, ultimoPort: quickPort,
          ultimoFaltas: ultimoBimestre?.faltas ?? '-',
          ultimoBimNome: ultimoBimestre ? ultimoBimestre.bimestre : 'Sem Dados'
        });
      });
    });
    return list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [data, annotations, provaData, conceitoData]);

  const studentProfile = useMemo(() => {
    if (!selectedStudent) return null;
    return allStudents.find(s => s.nome === selectedStudent) || null;
  }, [selectedStudent, allStudents]);

  const chartDataMapao = useMemo(() => {
    if (!studentProfile?.historicoConceitos?.length) return [];
    const ultimoBimestre = studentProfile.historicoConceitos[studentProfile.historicoConceitos.length - 1];
    const turmaAlunos    = conceitoData.filter(c => c.bimestre === ultimoBimestre.bimestre && c.turmaPlanilha === ultimoBimestre.turmaPlanilha);
    return Object.entries(ultimoBimestre.notas).map(([disciplina, notaRaw]) => {
      const notaAluno = parseGrade(notaRaw);
      let soma = 0, count = 0;
      turmaAlunos.forEach(aluno => {
        if (aluno.notas?.[disciplina] !== undefined) {
          const n = parseGrade(aluno.notas[disciplina]);
          if (n > 0 || aluno.notas[disciplina] !== '-') { soma += n; count++; }
        }
      });
      const displaySub = formatDisciplina(disciplina);
      const shortName  = displaySub.length > 12 ? displaySub.substring(0, 10) + '.' : displaySub;
      return { subject: shortName, fullSubject: displaySub, Aluno: notaAluno, Turma: count > 0 ? parseFloat((soma / count).toFixed(1)) : 0 };
    });
  }, [studentProfile, conceitoData]);

  const chartDataProva = useMemo(() => {
    if (!studentProfile?.provaPaulistaNotas) return [];
    return Object.entries(studentProfile.provaPaulistaNotas)
      .map(([disciplina, notaRaw]) => {
        const val = parseGrade(notaRaw);
        if (val === 0 && notaRaw === '-') return null;
        const displaySub = formatDisciplina(disciplina);
        const shortName  = displaySub.length > 12 ? displaySub.substring(0, 10) + '.' : displaySub;
        return { subject: shortName, fullSubject: displaySub, Desempenho: val };
      })
      .filter(Boolean);
  }, [studentProfile]);

  const optionsList = useMemo(() => {
    const field        = filterMode === 'tutor' ? 'tutor' : 'turma';
    const uniqueValues = [...new Set(data.map(item => item[field]))];
    return ['Todos', ...uniqueValues.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))];
  }, [data, filterMode]);

  const filteredData = useMemo(() => {
    if (selectedValue === 'Todos') return data;
    const field = filterMode === 'tutor' ? 'tutor' : 'turma';
    return data.filter(item => item[field] === selectedValue);
  }, [data, selectedValue, filterMode]);

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
          config={config}
          setConfig={setConfig}
          onClose={() => setShowSettings(false)}
          onLoad={loadAllData}
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
          <EmptyState onLoad={loadAllData} isLoading={isLoading} canLoad={!!config.studentsUrl} />
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
              />
            )}
          </div>
        )}

        {error && (
          <div className="fixed bottom-6 right-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 shadow-xl flex items-center gap-3 font-bold text-sm max-w-sm">
            <AlertCircle className="shrink-0" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)}><X className="w-4 h-4 ml-2 shrink-0" /></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;