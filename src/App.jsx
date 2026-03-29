import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, BookOpen, Search, ChevronRight, ChevronLeft, UserCheck, LayoutDashboard,
  AlertCircle, X, Globe, Settings2, Loader2, User, History, 
  Calendar, Settings, FileText, TrendingUp, AlertTriangle, CheckCircle2,
  LineChart as LineChartIcon, BookMarked, ExternalLink, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown,
  BarChart2, Sparkles, Bot
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

/**
 * TutorDash - Sistema de Alerta Pedagógico 360º
 * Gráficos Analíticos Otimizados e Sistema de Navegação Corrigido
 */



const normalizeName = (name) => {
  if (!name) return '';
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

const formatBimestre = (text) => {
  const t = String(text).toLowerCase();
  if (t.includes('primeiro') || t.includes('1º')) return '1º Bimestre';
  if (t.includes('segundo') || t.includes('2º')) return '2º Bimestre';
  if (t.includes('terceiro') || t.includes('3º')) return '3º Bimestre';
  if (t.includes('quarto') || t.includes('4º')) return '4º Bimestre';
  return text.trim();
};

const parseGrade = (val) => {
  if (val === undefined || val === null || val === '-') return 0;
  const str = String(val).toUpperCase().trim();
  if (str === 'MB') return 10;
  if (str === 'B') return 8;
  if (str === 'R') return 5;
  if (str === 'I') return 2;
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

const checkIsTutor = (tutor, registrar) => {
  if (!tutor || !registrar) return false;
  const t = normalizeName(tutor);
  const r = normalizeName(registrar);
  
  if (t === r) return true;
  
  const tParts = t.split(' ');
  const rParts = r.split(' ');
  
  if (tParts.length > 1 && rParts.length > 1) {
    const firstMatch = tParts[0] === rParts[0];
    const lastMatch = tParts[tParts.length - 1] === rParts[rParts.length - 1];
    const secondMatch = tParts[1] === rParts[1];
    
    if (firstMatch && (secondMatch || lastMatch)) {
      return true;
    }
  }
  
  return false;
};

const fetchWithFallback = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
    return res;
  } catch (err) {
    console.warn('O fetch direto falhou, a tentar proxy...', err);
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const resProxy = await fetch(proxyUrl);
      if (!resProxy.ok) throw new Error(`Erro no Proxy ${resProxy.status}`);
      return resProxy;
    } catch (proxyErr) {
      throw new Error("O Google bloqueou o acesso. Verifique as permissões de partilha do link.");
    }
  }
};

const App = () => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('tutorDashConfig');
    return saved ? JSON.parse(saved) : {
      studentsUrl: '',
      notesUrl: '',
      provaUrl: '',
      conceitoUrl: '', 
      formLink: ''     
    };
  });

  useEffect(() => {
    localStorage.setItem('tutorDashConfig', JSON.stringify(config));
  }, [config]);

  const [data, setData] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [provaData, setProvaData] = useState([]);
  const [conceitoData, setConceitoData] = useState([]); 
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [filterMode, setFilterMode] = useState('tutor');
  const [selectedValue, setSelectedValue] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('Todas');
  const [sortConfig, setSortConfig] = useState({ key: 'turma', direction: 'asc' });
  const [showStickyName, setShowStickyName] = useState(false); // NOVO: Estado para controlar o nome flutuante



  useEffect(() => {
    setSelectedSessionFilter('Todas');

  }, [selectedStudent]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (data.length > 0 && config.studentsUrl) {
      const interval = setInterval(() => {
        loadAllData(true);
      }, 5 * 60 * 1000); 
      return () => clearInterval(interval);
    }
  }, [data.length, config.studentsUrl]);

  // NOVO: Ouve a barra de rolagem e mostra o nome no header quando desce mais de 200px
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowStickyName(true);
      } else {
        setShowStickyName(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchAndParseCSV = async (url) => {
    if (!url) return [];
    let fetchUrl = url;
    if (fetchUrl.includes('docs.google.com/spreadsheets')) {
      const idMatch = fetchUrl.match(/\/d\/(.*?)(\/|$)/);
      if (idMatch) fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
    }
    const res = await fetchWithFallback(fetchUrl);
    const text = await res.text();
    const wb = window.XLSX.read(text, { type: 'string' });
    return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  };

  const loadAllData = async (silent = false) => {
    if (!window.XLSX) {
      if (!silent) setError("O leitor de planilhas ainda está a carregar. Aguarde um momento e tente novamente.");
      return;
    }

    if (!config.studentsUrl) {
      if (!silent) {
        setError("O URL da Planilha de Tutoria (Base) é obrigatória.");
        setShowSettings(true);
      }
      return;
    }

    if (!silent) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsSyncing(true);
    }

    let warnings = [];
    
    let newAlunos = null;
    let newNotes = null;
    let newProva = null;
    let newConceitos = null;

    try {
      // 1. TUTORIA
      try {
        const alunosArray = await fetchAndParseCSV(config.studentsUrl);
        const formattedAlunos = alunosArray.slice(1).map((row, idx) => {
          const tutoradosRaw = row.slice(2, 16) || [];
          const tutorados = tutoradosRaw.map(t => t ? String(t).trim() : "").filter(t => t !== "");
          return {
            id: idx,
            turma: String(row[1] || 'Sem Turma').trim(),
            tutorados: tutorados,
            tutor: String(row[16] || 'Não Atribuído').trim()
          };
        }).filter(item => item.tutorados.length > 0);
        
        if (formattedAlunos.length === 0) throw new Error("Nenhum dado válido encontrado.");
        newAlunos = formattedAlunos;
      } catch (e) {
        throw new Error(`Base de Tutoria: ${e.message}`);
      }

      // 2. ANOTAÇÕES
      if (config.notesUrl) {
        try {
          const notesArray = await fetchAndParseCSV(config.notesUrl);
          if (notesArray.length > 1) {
            const headers = notesArray[0] || [];
            const noteIdx = headers.findIndex(h => h && ['nota', 'obs', 'texto', 'ocorrência', 'anotação'].some(kw => String(h).toLowerCase().includes(kw)));

            const parsedNotes = notesArray.slice(1).map(row => {
              const teacherRaw = row[18] ? String(row[18]).trim() : ''; 
              const tipoAnotacaoRaw = row[19] ? String(row[19]).trim() : ''; 
              
              // Buscando nas colunas C (2) até R (17). (Aumentado de P para R para garantir que capte turmas como o 7A caso estejam após a coluna P)
              const studentNameRaw = row.slice(2, 18).find(name => name && String(name).trim() !== '') || '';

              return {
                id: Math.random().toString(),
                displayDate: row[0] ? String(row[0]) : 'S/ Data',
                studentName: studentNameRaw ? String(studentNameRaw).trim() : '',
                normalizedName: normalizeName(studentNameRaw ? String(studentNameRaw).trim() : ''),
                teacher: teacherRaw || 'Prof Desconhecido', 
                note: noteIdx !== -1 && row[noteIdx] ? String(row[noteIdx]) : '',
                tipoSessao: tipoAnotacaoRaw
              };
            }).filter(n => n.studentName);
            newNotes = parsedNotes.reverse();
          } else {
            newNotes = [];
          }
        } catch (e) { 
          warnings.push(`Anotações (${e.message})`);
        }
      }

      // 3. PROVA PAULISTA
      if (config.provaUrl) {
        try {
          const provaArray = await fetchAndParseCSV(config.provaUrl);
          if (provaArray.length > 1) {
            const headers = provaArray[0] || [];
            const studentIdx = headers.findIndex(h => h && ['aluno', 'nome'].some(kw => String(h).toLowerCase().includes(kw)));
            const notaIdx = headers.findIndex(h => h && ['nota', 'acerto', 'resultado', 'desempenho'].some(kw => String(h).toLowerCase().includes(kw)));
            
            const excludeWords = ['aluno', 'nome', 'turma', 'ra', 'situação', 'nota', 'resultado', 'desempenho', 'acerto', 'série'];
            const ppSubjects = [];
            headers.forEach((h, idx) => {
              if (typeof h === 'string' && h.trim() !== '') {
                const lowerH = h.toLowerCase().trim();
                if (!excludeWords.some(ew => lowerH.includes(ew)) && idx !== studentIdx && idx !== notaIdx) {
                  ppSubjects.push({ index: idx, name: h.trim() });
                }
              }
            });

            const parsedProva = provaArray.slice(1).map(row => {
              const alunoNome = studentIdx !== -1 ? row[studentIdx] : '';
              if (!alunoNome) return null;

              const notasIndividuais = {};
              ppSubjects.forEach(sub => {
                notasIndividuais[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
              });

              return {
                normalizedName: normalizeName(alunoNome),
                resultado: notaIdx !== -1 && row[notaIdx] ? String(row[notaIdx]) : 'S/N',
                notas: notasIndividuais
              };
            }).filter(p => p.normalizedName);
            newProva = parsedProva;
          } else {
            newProva = [];
          }
        } catch (e) { 
          warnings.push(`Prova Paulista (${e.message})`);
        }
      }

      // 4. LEITOR NATIVO DO MAPÃO DA SED
      if (config.conceitoUrl) {
        try {
          let fetchCUrl = config.conceitoUrl;
          if (fetchCUrl.includes('docs.google.com/spreadsheets')) {
            const idMatch = fetchCUrl.match(/\/d\/(.*?)(\/|$)/);
            if (idMatch) fetchCUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=xlsx`;
          }
          
          const res = await fetchWithFallback(fetchCUrl);
          const arrayBuffer = await res.arrayBuffer();
          const wb = window.XLSX.read(arrayBuffer, { type: 'array' });
          
          let todosConceitos = [];
          
          wb.SheetNames.forEach(nomeDaGuia => {
            const ws = wb.Sheets[nomeDaGuia];
            const jsonData = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            let turmaPlanilha = nomeDaGuia;
            let bimestreRaw = nomeDaGuia;
            let headerRowIdx = -1;

            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i] || [];
              if (row[0] === 'Turma:') turmaPlanilha = row[1];
              if (row[0] === 'Tipo Fechamento:') bimestreRaw = row[1];
              if (row[0] === 'ALUNO') {
                headerRowIdx = i;
                break;
              }
            }

            if (headerRowIdx !== -1) {
              const headers = jsonData[headerRowIdx];
              const subjects = [];
              let faltasIdx = -1; // NOVO: Índice para capturar a coluna de ausências

              headers.forEach((h, idx) => {
                if (typeof h === 'string') {
                  const upperH = h.toUpperCase();
                  if (h.includes('\n')) {
                    const subjectName = h.split('\n')[0].trim();
                    if (!subjectName.toUpperCase().includes('TOTAL')) {
                      subjects.push({ index: idx, name: subjectName });
                    }
                  } else if (upperH.includes('FALTA') || upperH.includes('AUSÊN') || upperH.includes('AUSEN') || upperH === '% F' || upperH === 'F') {
                    // Deteta a coluna de Faltas (dá preferência se contiver 'TOTAL' ou 'GERAL')
                    if (faltasIdx === -1 || upperH.includes('TOTAL') || upperH.includes('GERAL') || faltasIdx < idx) {
                      faltasIdx = idx;
                    }
                  }
                }
              });

              const dadosDaGuia = jsonData.slice(headerRowIdx + 1).map(row => {
                const alunoNome = row[0];
                if (!alunoNome || String(alunoNome).trim() === '' || String(alunoNome).includes('Aulas Dadas')) return null;

                let notas = {};
                subjects.forEach(sub => {
                  notas[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
                });

                // NOVO: Extrai as faltas do aluno
                const faltas = faltasIdx !== -1 && row[faltasIdx] ? String(row[faltasIdx]).trim() : '-';

                return {
                  normalizedName: normalizeName(alunoNome),
                  bimestre: formatBimestre(bimestreRaw), 
                  turmaPlanilha: String(turmaPlanilha).trim(),
                  notas: notas,
                  faltas: faltas
                };
              }).filter(Boolean);
              
              todosConceitos = [...todosConceitos, ...dadosDaGuia];
            }
          });
          newConceitos = todosConceitos;
        } catch (e) { 
          console.error("Erro no Mapão SED:", e);
          warnings.push(`Mapão/Histórico (${e.message})`);
        }
      }

      if (!silent && warnings.length > 0) {
        setError(`Aviso: Base carregada, mas houve falha ao importar: ${warnings.join(' | ')}.`);
      }

    } catch (err) {
      if (!silent) setError(`Erro crítico na importação: ${err.message}`);
      else console.error("Falha na sincronização silenciosa:", err.message);
    } finally {
      if (newAlunos) setData(newAlunos);
      if (newNotes !== null) setAnnotations(newNotes);
      if (newProva !== null) setProvaData(newProva);
      if (newConceitos !== null) setConceitoData(newConceitos);

      if (!silent) setIsLoading(false);
      else setIsSyncing(false);
    }
  };

  const allStudents = useMemo(() => {
    const list = [];
    data.forEach(item => {
      item.tutorados.forEach(nomeOriginal => {
        const normName = normalizeName(nomeOriginal);
        
        const studentNotes = annotations.filter(n => n.normalizedName === normName);
        const provaInfo = provaData.find(p => p.normalizedName === normName);
        
        let conceitosDoAluno = conceitoData.filter(c => c.normalizedName === normName);
        conceitosDoAluno.sort((a, b) => a.bimestre.localeCompare(b.bimestre)); 
        
        const ultimoBimestre = conceitosDoAluno.length > 0 ? conceitosDoAluno[conceitosDoAluno.length - 1] : null;

        let quickMat = '-';
        let quickPort = '-';
        if (ultimoBimestre && ultimoBimestre.notas) {
          const chaves = Object.keys(ultimoBimestre.notas);
          const matKey = chaves.find(k => k.toUpperCase().includes('MATEM'));
          const portKey = chaves.find(k => k.toUpperCase().includes('PORTUG'));
          if (matKey) quickMat = ultimoBimestre.notas[matKey];
          if (portKey) quickPort = ultimoBimestre.notas[portKey];
        }

        list.push({ 
          nome: nomeOriginal, 
          normalizedName: normName,
          turma: item.turma, 
          tutor: item.tutor, 
          notes: studentNotes,
          noteCount: studentNotes.length, 
          lastNoteDate: studentNotes.length > 0 ? studentNotes[0].displayDate : null,
          provaPaulista: provaInfo ? provaInfo.resultado : 'S/D',
          provaPaulistaNotas: provaInfo ? provaInfo.notas : null,
          historicoConceitos: conceitosDoAluno,
          ultimoMat: quickMat,
          ultimoPort: quickPort,
          ultimoFaltas: ultimoBimestre && ultimoBimestre.faltas ? ultimoBimestre.faltas : '-',
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
    if (!studentProfile || !studentProfile.historicoConceitos || studentProfile.historicoConceitos.length === 0) return [];
    
    const ultimoBimestre = studentProfile.historicoConceitos[studentProfile.historicoConceitos.length - 1];
    const turmaAlunos = conceitoData.filter(c => c.bimestre === ultimoBimestre.bimestre && c.turmaPlanilha === ultimoBimestre.turmaPlanilha);

    const cData = [];
    Object.entries(ultimoBimestre.notas).forEach(([disciplina, notaRaw]) => {
      const notaAluno = parseGrade(notaRaw);
      
      let soma = 0;
      let count = 0;
      turmaAlunos.forEach(aluno => {
        if(aluno.notas && aluno.notas[disciplina] !== undefined) {
          const n = parseGrade(aluno.notas[disciplina]);
          if (n > 0 || aluno.notas[disciplina] !== '-') { 
            soma += n;
            count++;
          }
        }
      });
      const mediaTurma = count > 0 ? parseFloat((soma / count).toFixed(1)) : 0;

      let shortName = disciplina.length > 12 ? disciplina.substring(0, 10) + '.' : disciplina;

      cData.push({
        subject: shortName,
        fullSubject: disciplina,
        Aluno: notaAluno,
        Turma: mediaTurma
      });
    });
    return cData;
  }, [studentProfile, conceitoData]);

  const chartDataProva = useMemo(() => {
    if (!studentProfile || !studentProfile.provaPaulistaNotas) return [];
    const pData = [];
    Object.entries(studentProfile.provaPaulistaNotas).forEach(([disciplina, notaRaw]) => {
      const val = parseGrade(notaRaw);
      if (val > 0 || notaRaw !== '-') {
        let shortName = disciplina.length > 12 ? disciplina.substring(0, 10) + '.' : disciplina;
        pData.push({
          subject: shortName,
          fullSubject: disciplina,
          Desempenho: val
        });
      }
    });
    return pData;
  }, [studentProfile]);


  const optionsList = useMemo(() => {
    const field = filterMode === 'tutor' ? 'tutor' : 'turma';
    const uniqueValues = [...new Set(data.map(item => item[field]))];
    return ['Todos', ...uniqueValues.sort((a, b) => String(a).localeCompare(String(b), undefined, {numeric: true}))];
  }, [data, filterMode]);

  const filteredData = useMemo(() => {
    if (selectedValue === 'Todos') return data;
    const field = filterMode === 'tutor' ? 'tutor' : 'turma';
    return data.filter(item => item[field] === selectedValue);
  }, [data, selectedValue, filterMode]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    sortableItems.sort((a, b) => {
      if (sortConfig.key === 'alunos') {
        const diff = a.tutorados.length - b.tutorados.length;
        if (diff !== 0) return sortConfig.direction === 'asc' ? diff : -diff;
      } else {
        let aValue = String(a[sortConfig.key] || '').toLowerCase();
        let bValue = String(b[sortConfig.key] || '').toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      }
      
      const aTurma = String(a.turma).toLowerCase();
      const bTurma = String(b.turma).toLowerCase();
      if (aTurma < bTurma) return -1;
      if (aTurma > bTurma) return 1;

      return 0;
    });
    return sortableItems;
  }, [filteredData, sortConfig]);

  const stats = useMemo(() => {
    const totalStudents = filteredData.reduce((acc, curr) => acc + curr.tutorados.length, 0);
    const totalGroups = new Set(filteredData.map(d => d.turma)).size;
    return { totalStudents, totalGroups };
  }, [filteredData]);

  // Lista de alunos globalmente ordenada para navegação individual (Próximo / Anterior)
  const currentStudentList = useMemo(() => {
    if (searchTerm) {
      return allStudents
        .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(s => s.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    const list = [];
    filteredData.forEach(item => {
      item.tutorados.forEach(nome => {
        if (!list.includes(nome)) list.push(nome);
      });
    });
    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [searchTerm, allStudents, filteredData]);

  const currentIndex = selectedStudent ? currentStudentList.indexOf(selectedStudent) : -1;
  const prevStudent = currentIndex > 0 ? currentStudentList[currentIndex - 1] : null;
  const nextStudent = currentIndex >= 0 && currentIndex < currentStudentList.length - 1 ? currentStudentList[currentIndex + 1] : null;

  const studentSessions = useMemo(() => {
    if (!studentProfile) return [];
    const sessions = new Set(studentProfile.notes.map(n => n.tipoSessao).filter(Boolean));
    return ['Todas', ...Array.from(sessions)];
  }, [studentProfile]);

  const filteredNotes = useMemo(() => {
    if (!studentProfile) return [];
    if (selectedSessionFilter === 'Todas') return studentProfile.notes;
    return studentProfile.notes.filter(n => n.tipoSessao === selectedSessionFilter);
  }, [studentProfile, selectedSessionFilter]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };



  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const pointData = payload[0].payload;
      return (
        <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-700 text-white text-xs z-50">
          <p className="font-black mb-2 text-blue-300 uppercase tracking-widest">{pointData.fullSubject || label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Configurações do Sistema */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800"><Settings className="text-blue-600 w-8 h-8" /> Configuração 360º</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <label className="text-xs font-bold text-blue-700 uppercase">1. Tutoria (Base Obrigatória)</label>
                <input type="text" className="w-full bg-white border border-blue-200 rounded-xl py-2 px-4 mt-1" value={config.studentsUrl || ''} onChange={e => setConfig({...config, studentsUrl: e.target.value})} placeholder="Link (Qualquer Ficheiro Sheets)..." />
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase">2. Planilha de Anotações</label>
                <input type="text" className="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 mt-1" value={config.notesUrl || ''} onChange={e => setConfig({...config, notesUrl: e.target.value})} placeholder="Link..." />
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase">3. Prova Paulista</label>
                <input type="text" className="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 mt-1" value={config.provaUrl || ''} onChange={e => setConfig({...config, provaUrl: e.target.value})} placeholder="Link..." />
              </div>
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-200 text-amber-800 text-[9px] font-black px-2 py-1 rounded-bl-lg uppercase flex items-center gap-1"><BookMarked className="w-3 h-3"/> Mapão da SED</div>
                <label className="text-xs font-bold text-amber-700 uppercase">4. Histórico Bimestral</label>
                <input type="text" className="w-full bg-white border border-amber-300 rounded-xl py-2 px-4 mt-1" value={config.conceitoUrl || ''} onChange={e => setConfig({...config, conceitoUrl: e.target.value})} placeholder="Link da Folha de Cálculo com os Mapões..." />
                <p className="text-[10px] text-amber-700 mt-2 font-medium">O sistema processa o formato oficial da Secretaria Escolar Digital. Pode incluir todas as turmas de todos os bimestres na mesma planilha (uma em cada aba/guia).</p>
              </div>
              
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
                <label className="text-xs font-bold text-emerald-700 uppercase">Acesso Rápido a Formulário Externo</label>
                <input type="text" className="w-full bg-white border border-emerald-300 rounded-xl py-2 px-4 mt-1" value={config.formLink || ''} onChange={e => setConfig({...config, formLink: e.target.value})} placeholder="Cole o link do seu Google Forms aqui..." />
              </div>
            </div>

            <button onClick={() => {setShowSettings(false); loadAllData(false);}} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-900 transition-colors">
              Guardar e Sincronizar
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><LayoutDashboard className="text-white w-5 h-5" /></div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">TutorDash</h1>
            </div>
            
            {/* NOVO: NAVEGAÇÃO FLUTUANTE DO ALUNO CENTRADA NO HEADER (14px) */}
            {selectedStudent && showStickyName && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-slate-100/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => prevStudent && setSelectedStudent(prevStudent)}
                  disabled={!prevStudent}
                  className={`p-1.5 rounded-full transition-colors ${!prevStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'}`}
                  title="Aluno Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-[14px] font-black text-slate-800 whitespace-nowrap max-w-[130px] sm:max-w-[300px] truncate">
                  {studentProfile?.nome}
                </span>
                
                <button
                  onClick={() => nextStudent && setSelectedStudent(nextStudent)}
                  disabled={!nextStudent}
                  className={`p-1.5 rounded-full transition-colors ${!nextStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'}`}
                  title="Próximo Aluno"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-3 items-center">
              {data.length > 0 && (
                <button 
                  onClick={() => loadAllData(true)} 
                  disabled={isSyncing}
                  className="flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50" 
                  title="Atualizar dados em segundo plano"
                >
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              )}
              {config.formLink && (
                <a 
                  href={config.formLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-blue-100"
                >
                  <ExternalLink className="w-4 h-4" /> Link Anotações
                </a>
              )}
              <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Settings className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data.length === 0 ? (
          <div className="max-w-xl mx-auto pt-10 text-center">
            <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"><Globe className="text-blue-600 w-10 h-10" /></div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Workspace 360º</h2>
            <p className="text-slate-500 mb-8">Configure as suas planilhas partilhadas para obter o panorama completo dos alunos.</p>
            <button onClick={() => loadAllData(false)} disabled={isLoading || !config.studentsUrl} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sincronização"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {!selectedStudent ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Search className="text-slate-400" />
                  <input type="text" placeholder="Pesquisar criança pelo nome..." className="flex-1 outline-none font-bold text-slate-700 bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && <button onClick={() => setSearchTerm('')}><X className="text-slate-400 hover:text-red-500" /></button>}
                </div>

                {searchTerm ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allStudents.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((s, i) => (
                      <button key={i} onClick={() => { setSelectedStudent(s.nome); setSearchTerm(''); }} className="text-left p-6 rounded-3xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-lg group-hover:text-blue-600">{s.nome}</p>
                          <div className="flex gap-3 mt-3">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">Turma {s.turma}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><UserCheck className="w-3 h-3"/> {s.tutor}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
                          {s.noteCount > 0 && (() => {
                            const isTutorMatch = checkIsTutor(s.tutor, s.notes[0].teacher);
                            return (
                              <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${isTutorMatch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${isTutorMatch ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                📝 Por: {s.notes[0].teacher} • Total: {s.noteCount} • Última: {s.lastNoteDate}
                              </span>
                            );
                          })()}
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">🎓 PP: {s.provaPaulista}</span>
                          {s.ultimoMat !== '-' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 mt-1">📊 Mat: {s.ultimoMat} | Port: {s.ultimoPort}</span>}
                          {s.ultimoFaltas !== '-' && (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border mt-1 flex items-center gap-1 ${s.ultimoFaltas === '0' || s.ultimoFaltas === '0%' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              <AlertCircle className="w-3 h-3" /> Faltas: {s.ultimoFaltas}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside className="lg:col-span-1 space-y-4">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filtrar por</p>
                        <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                          <button onClick={() => { setFilterMode('tutor'); setSelectedValue('Todos'); }} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${filterMode === 'tutor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>TUTOR</button>
                          <button onClick={() => { setFilterMode('turma'); setSelectedValue('Todos'); }} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${filterMode === 'turma' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>TURMA</button>
                        </div>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold" value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)}>
                          {optionsList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg">
                        <p className="text-blue-100 text-[10px] font-bold uppercase">Tutorados</p>
                        <div className="text-3xl font-black">{stats.totalStudents}</div>
                      </div>
                      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                        <p className="text-slate-400 text-[10px] font-bold uppercase">Turmas</p>
                        <div className="text-3xl font-black text-slate-800">{stats.totalGroups}</div>
                      </div>
                    </aside>
                    <div className="lg:col-span-3">
                      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('turma')}>
                                <div className="flex items-center gap-2">Turma <SortIcon columnKey="turma" /></div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('tutor')}>
                                <div className="flex items-center gap-2">Tutor <SortIcon columnKey="tutor" /></div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('alunos')}>
                                <div className="flex items-center gap-2">Alunos <SortIcon columnKey="alunos" /></div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedData.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-black text-slate-800 whitespace-nowrap">{item.turma}</td>
                                <td className="px-6 py-4 text-sm text-slate-500 font-bold whitespace-nowrap">{item.tutor}</td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    {[...item.tutorados].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((nome, i) => {
                                      const studentInfo = allStudents.find(s => s.nome === nome);
                                      return (
                                        <button key={i} onClick={() => setSelectedStudent(nome)} className="text-left bg-white border border-slate-200 p-2 rounded-xl shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-w-[140px] flex-1 sm:flex-none">
                                          <span className="text-[11px] font-bold text-slate-700 block mb-1.5 truncate">{nome}</span>
                                          {studentInfo && (
                                            <div className="flex gap-1 flex-wrap text-[9px] font-bold text-slate-500">
                                              {studentInfo.noteCount > 0 && (() => {
                                                const isTutorMatch = checkIsTutor(studentInfo.tutor, studentInfo.notes[0].teacher);
                                                return (
                                                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${isTutorMatch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isTutorMatch ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                                    📝 {studentInfo.notes[0].teacher} • Total: {studentInfo.noteCount} • Última: {studentInfo.lastNoteDate}
                                                  </span>
                                                );
                                              })()}
                                              {studentInfo.provaPaulista !== 'S/D' && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">PP: {studentInfo.provaPaulista}</span>}
                                              {studentInfo.ultimoMat !== '-' && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 w-full mt-1">📊 Mat: {studentInfo.ultimoMat} | Port: {studentInfo.ultimoPort}</span>}
                                              {studentInfo.ultimoFaltas !== '-' && (
                                                <span className={`w-full mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${studentInfo.ultimoFaltas === '0' || studentInfo.ultimoFaltas === '0%' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                  <AlertCircle className="w-2 h-2" /> Faltas: {studentInfo.ultimoFaltas}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* VISTA 2: PERFIL DO ALUNO 360º */
              <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 w-fit">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => prevStudent && setSelectedStudent(prevStudent)}
                      disabled={!prevStudent}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 transition-colors ${!prevStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button 
                      onClick={() => nextStudent && setSelectedStudent(nextStudent)}
                      disabled={!nextStudent}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 transition-colors ${!nextStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                      Próximo <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">{studentProfile?.nome}</h2>
                    <div className="flex gap-4 mt-3 text-xs font-bold text-slate-500 uppercase">
                      <span className="bg-slate-100 px-4 py-2 rounded-lg text-slate-700">Turma: {studentProfile?.turma}</span>
                      <span className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-1"><UserCheck className="w-3 h-3"/> Tutor: {studentProfile?.tutor}</span>
                    </div>
                  </div>
                </div>



                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Prova Paulista</h3>
                      <div className="text-4xl font-black text-blue-600 mb-1">{studentProfile?.provaPaulista}</div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Desempenho Geral</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><LineChartIcon className="w-4 h-4"/> Evolutivo Númerico</h3>
                      {studentProfile?.historicoConceitos && studentProfile.historicoConceitos.length > 0 ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {studentProfile.historicoConceitos.map((bim, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                                <p className="text-[10px] font-black text-blue-600 uppercase">{bim.bimestre}</p>
                                {/* NOVO: Badge dinâmico para destacar as Ausências/Faltas */}
                                {bim.faltas && bim.faltas !== '-' && (
                                  <span className={`text-[9px] font-black px-2 py-1 rounded-full border flex items-center gap-1 ${bim.faltas === '0' || bim.faltas === '0%' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    <AlertCircle className="w-3 h-3" />
                                    {bim.faltas.includes('%') ? `Ausência: ${bim.faltas}` : `${bim.faltas} Faltas`}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-y-2">
                                {Object.entries(bim.notas).map(([disciplina, nota], idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-500 truncate mr-2" title={disciplina}>{disciplina}</span>
                                    <span className={`text-xs font-black px-2 py-1 rounded ${nota === '-' ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>{nota}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center">
                          <p className="text-slate-400 font-bold uppercase text-[10px]">Sem dados bimestrais</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2"><History className="w-4 h-4" /> Anotações e Sessões</h3>
                      
                      {studentSessions.length > 1 && (
                        <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar Anotações</p>
                          <div className="flex flex-wrap gap-3">
                            {studentSessions.map(sessao => (
                              <label key={sessao} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-all ${selectedSessionFilter === sessao ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}>
                                <input
                                  type="radio"
                                  name="sessionFilter"
                                  value={sessao}
                                  checked={selectedSessionFilter === sessao}
                                  onChange={(e) => setSelectedSessionFilter(e.target.value)}
                                  className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <span className={`text-xs font-bold ${selectedSessionFilter === sessao ? 'text-blue-700' : 'text-slate-600'}`}>{sessao}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredNotes.length > 0 ? (
                          filteredNotes.map((n) => (
                            <div key={n.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                              {n.tipoSessao && (
                                <div className="absolute top-0 right-0 bg-amber-50 border-b border-l border-amber-100 px-4 py-1.5 rounded-bl-xl">
                                  <span className="text-[10px] font-black text-amber-600 uppercase">{n.tipoSessao}</span>
                                </div>
                              )}
                              
                              <div className={`flex justify-between items-center mb-4 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-50 pb-3 ${n.tipoSessao ? 'mt-8' : 'mt-1'}`}>
                                <span className="text-blue-600 flex items-center gap-1">
                                  <User className="w-3 h-3"/> 
                                  Quem Registrou: {n.teacher}
                                </span>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {n.displayDate}</span>
                              </div>
                              <div className="space-y-3">
                                {n.note ? (
                                  <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Anotação / Observação</span>
                                    <p className="text-slate-700 font-medium leading-relaxed">{n.note}</p>
                                  </div>
                                ) : (
                                  <p className="text-slate-400 font-medium italic text-sm">Registo sem descrição.</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-white border border-dashed border-slate-200 p-10 rounded-3xl text-center">
                            <p className="text-slate-400 font-bold uppercase text-xs">Sem anotações registadas para este filtro.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PAINEL DE ANÁLISE GRÁFICA (RADARES E BARRAS) CORRIGIDO E OTIMIZADO */}
                <div className="mt-8">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
                    <BarChart2 className="w-6 h-6 text-blue-600" /> Análise Gráfica e Comparativa
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfico de Radar - Mapão */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Equilíbrio (Último Bimestre)</h4>
                      {chartDataMapao.length > 0 ? (
                        <div className="w-full h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartDataMapao} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              {/* Legenda na base do Radar */}
                              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                              {/* A camada desenhada em último lugar fica "por cima". Turma no fundo, Aluno à frente! */}
                              <Radar name="Média Turma" dataKey="Turma" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                              <Radar name="Aluno" dataKey="Aluno" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <p className="text-slate-400 text-xs font-bold uppercase text-center px-4">Sem dados numéricos suficientes para desenhar o radar</p>
                        </div>
                      )}
                    </div>

                    {/* Gráfico de Radar - Prova Paulista */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Desempenho (Prova Paulista)</h4>
                      {chartDataProva.length > 0 ? (
                        <div className="w-full h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartDataProva} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                              <Radar name="Prova Paulista" dataKey="Desempenho" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <p className="text-slate-400 text-xs font-bold uppercase text-center px-4">Sem disciplinas detalhadas na Prova Paulista</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gráfico de Barras Comparativo - Layout Otimizado */}
                  <div className="mt-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Comparação Detalhada: Aluno vs Média da Turma (Último Bimestre)</h4>
                    {chartDataMapao.length > 0 ? (
                      <div className="w-full h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          {/* Maior margem no topo para a legenda, e na base para o texto inclinado */}
                          <BarChart data={chartDataMapao} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            
                            {/* Nomes das disciplinas inclinados a 45º para não se sobreporem e interval=0 para mostrar todas */}
                            <XAxis 
                              dataKey="subject" 
                              tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} 
                              angle={-45} 
                              textAnchor="end" 
                              interval={0}
                              axisLine={false} 
                              tickLine={false} 
                            />
                            
                            <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                            
                            {/* Legenda passada para o topo do gráfico para evitar conflitos com os eixos */}
                            <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                            
                            <Bar name="Nota do Aluno" dataKey="Aluno" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            <Bar name="Média da Turma" dataKey="Turma" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-slate-400 text-xs font-bold uppercase">Sem dados comparativos suficientes</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {error && (
          <div className="fixed bottom-6 right-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 shadow-xl flex items-center gap-3 font-bold text-sm max-w-sm">
            <AlertCircle className="shrink-0" /> 
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)}><X className="w-4 h-4 ml-2 shrink-0"/></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;