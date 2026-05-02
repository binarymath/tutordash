import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { X, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { buildChartDataMapao, buildChartDataProva } from '../utils/buildChartData';

const PrintChartRenderer = ({ student, charts, mapaoData, provaData }) => {
  const bimestreLabel = student?.ultimoBimNome && String(student.ultimoBimNome).trim() !== 'Sem Dados'
    ? student.ultimoBimNome
    : 'Bimestre atual';

  const hasMapaoRadar = charts.mapaoRadar;
  const hasProvaRadar = charts.provaRadar;
  const hasMapaoBars = charts.mapaoBars;
  const hasProvaBars = charts.provaBars;

  // Se nenhum gráfico está selecionado, não renderiza nada para esse aluno
  if (!hasMapaoRadar && !hasProvaRadar && !hasMapaoBars && !hasProvaBars) {
    return null;
  }

  return (
    <div style={{ width: '100%', background: '#fff' }}>
      {hasMapaoRadar && (
        <section data-print-chart="mapao-radar" style={{ border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', marginBottom: (hasProvaRadar || hasMapaoBars || hasProvaBars) ? '24px' : '0' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center' }}>
            Radar de Equilíbrio ({bimestreLabel})
          </h4>
          {mapaoData.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '280px', minHeight: '280px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={mapaoData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                  <Radar isAnimationActive={false} name="Média da Turma" dataKey="Turma" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                  <Radar isAnimationActive={false} name="Aluno" dataKey="Aluno" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Sem dados para o Radar de Equilíbrio.</div>
          )}
        </section>
      )}

      {hasProvaRadar && (
        <section data-print-chart="prova-radar" style={{ border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', marginBottom: (hasMapaoBars || hasProvaBars) ? '24px' : '0' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center' }}>
            Radar de Desempenho (Prova Paulista)
          </h4>
          {provaData.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '280px', minHeight: '280px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={provaData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                  <Radar isAnimationActive={false} name="Média da Turma" dataKey="Turma" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                  <Radar isAnimationActive={false} name="Aluno" dataKey="Aluno" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Sem dados para o Radar de Desempenho.</div>
          )}
        </section>
      )}

      {hasMapaoBars && (
        <section data-print-chart="mapao-bars" style={{ border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', marginBottom: hasProvaBars ? '24px' : '0' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center' }}>
            Mapão - Aluno vs Média da Turma
          </h4>
          {mapaoData.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '320px', minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={mapaoData} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Bar isAnimationActive={false} name="Nota do Aluno" dataKey="Aluno" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Aluno" position="top" style={{ fontSize: 12, fontFamily: 'Times New Roman', fontWeight: 700, fill: '#3b82f6' }} formatter={(value) => value != null ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                  <Bar isAnimationActive={false} name="Média da Turma" dataKey="Turma" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Turma" position="top" style={{ fontSize: 12, fontFamily: 'Times New Roman', fontWeight: 700, fill: '#94a3b8' }} formatter={(value) => value != null ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Sem dados comparativos suficientes.</div>
          )}
        </section>
      )}

      {hasProvaBars && (
        <section data-print-chart="prova-bars" style={{ border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center' }}>
            Prova Paulista - Aluno vs Média da Turma
          </h4>
          {provaData.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '320px', minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={provaData} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Bar isAnimationActive={false} name="Nota do Aluno" dataKey="Aluno" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Aluno" position="top" style={{ fontSize: 12, fontFamily: 'Times New Roman', fontWeight: 700, fill: '#0ea5e9' }} formatter={(value) => value != null ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                  <Bar isAnimationActive={false} name="Média da Turma" dataKey="Turma" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Turma" position="top" style={{ fontSize: 12, fontFamily: 'Times New Roman', fontWeight: 700, fill: '#64748b' }} formatter={(value) => value != null ? Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Sem dados comparativos da Prova Paulista.</div>
          )}
        </section>
      )}
    </div>
  );
};

const PrintSelectionModal = ({
  student = {},
  studentName = '',
  studentsToFilter = [],
  conceitoData = [],
  provaData = [],
  allStudents = [],
  studentSelections = {},
  setStudentSelections,
  onClose,
}) => {
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState('');
  const printWindowRef = useRef(null);

  const students = studentsToFilter.length > 0 ? studentsToFilter : [student];
  const currentStudent = students[currentStudentIndex] || student;
  const currentStudentName = currentStudent.nome || '';

  // Obter ou inicializar seleção do aluno atual
  const getCurrentSelection = () => {
    if (!studentSelections[currentStudentName]) {
      return {
        mapaoRadar: false,
        provaRadar: false,
        mapaoBars: false,
        provaBars: false,
      };
    }
    return studentSelections[currentStudentName];
  };

  const currentSelection = getCurrentSelection();
  const selectedCount = Object.values(currentSelection).filter(Boolean).length;

  const toggleChart = (key) => {
    const updated = {
      ...currentSelection,
      [key]: !currentSelection[key],
    };
    setStudentSelections({
      ...studentSelections,
      [currentStudentName]: updated,
    });
  };

  const handleNext = () => {
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    }
  };

  const handlePrint = () => {
    // Verificar se há pelo menos um aluno com gráficos selecionados
    const hasAnySelection = Object.values(studentSelections).some((selections) =>
      Object.values(selections).some(Boolean)
    );

    if (!hasAnySelection) {
      setError('Selecione pelo menos um gráfico para algum aluno.');
      return;
    }

    setIsPrinting(true);
    setError('');

    try {
      // Renderizar os gráficos no documento
      const pagesToRender = students
        .map((s) => {
          const selections = studentSelections[s.nome] || {};
          if (!Object.values(selections).some(Boolean)) return null; // Pular alunos sem seleção

          const mapaoData = (selections.mapaoRadar || selections.mapaoBars)
            ? buildChartDataMapao(s, conceitoData, provaData, allStudents)
            : [];
          const chartDataProva = (selections.provaRadar || selections.provaBars)
            ? buildChartDataProva(s, conceitoData, provaData, allStudents)
            : [];

          return {
            student: s,
            charts: selections,
            mapaoData,
            chartDataProva,
          };
        })
        .filter(Boolean);

      if (pagesToRender.length === 0) {
        setError('Nenhum aluno com gráficos selecionados.');
        setIsPrinting(false);
        return;
      }

      // Criar janela de impressão
      const printWindow = window.open('', '_blank', 'width=960,height=720');
      if (!printWindow) {
        setError('O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.');
        setIsPrinting(false);
        return;
      }

      // Criar container para React
      const printContainer = printWindow.document.createElement('div');
      printContainer.id = 'print-root';
      printWindow.document.body.innerHTML = '';
      printWindow.document.body.appendChild(printContainer);
      const printRoot = createRoot(printContainer);

      // Componente para impressão
      const PrintDocument = () => (
        <div>
          {pagesToRender.map((page, pageIdx) => (
            <div
              key={pageIdx}
              style={{
                pageBreakAfter: 'always',
                padding: '24px 28px',
                background: '#fff',
                minHeight: '100vh',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '12px', marginBottom: '18px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#1e3a8a' }}>
                  TutorDash • Impressão de gráfico
                </p>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '2px' }}>Turma</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{page.student.turma || '-'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '2px' }}>Aluno</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{page.student.nome || '-'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '2px' }}>Tutor</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{page.student.tutor || '-'}</span>
                  </div>
                </div>
              </div>
              <PrintChartRenderer
                student={page.student}
                charts={page.charts}
                mapaoData={page.mapaoData}
                provaData={page.chartDataProva}
              />
            </div>
          ))}
        </div>
      );

      // Renderizar e imprimir
      flushSync(() => printRoot.render(<PrintDocument />));

      requestAnimationFrame(() => {
        printWindow.focus();
        printWindow.print();
        printRoot.unmount();
        onClose();
        setIsPrinting(false);
      });

      printWindowRef.current = printWindow;
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      setError('Não foi possível preparar a impressão.');
      setIsPrinting(false);
      if (printWindowRef.current && !printWindowRef.current.closed) {
        printWindowRef.current.close();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Impressão de gráfico · {currentStudentIndex + 1} de {students.length}
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-800">
              {currentStudent.nome || 'Aluno'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Turma {currentStudent.turma || '-'} • Tutor {currentStudent.tutor || '-'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gráficos</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const allStudentsSelections = {};
                students.forEach((s) => {
                  allStudentsSelections[s.nome] = currentSelection;
                });
                setStudentSelections(allStudentsSelections);
              }}
              disabled={isPrinting}
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Todos
            </button>
            <button
              onClick={() => {
                const allStudentsSelections = {};
                students.forEach((s) => {
                  allStudentsSelections[s.nome] = {
                    mapaoRadar: false,
                    provaRadar: false,
                    mapaoBars: false,
                    provaBars: false,
                  };
                });
                setStudentSelections(allStudentsSelections);
              }}
              disabled={isPrinting}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Nenhum
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { key: 'mapaoRadar', label: 'Radar de Equilíbrio', desc: 'Mapão' },
            { key: 'provaRadar', label: 'Radar de Desempenho', desc: 'Prova Paulista' },
            { key: 'mapaoBars', label: 'Barras do Mapão', desc: 'Aluno vs Média' },
            { key: 'provaBars', label: 'Barras Prova Paulista', desc: 'Aluno vs Média' },
          ].map((chart) => (
            <label
              key={chart.key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                currentSelection[chart.key]
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-blue-200'
              }`}
            >
              <input
                type="checkbox"
                checked={currentSelection[chart.key]}
                onChange={() => toggleChart(chart.key)}
                disabled={isPrinting}
                className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="block text-sm font-bold text-slate-800">Impressão de gráfico</span>
                </div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                  {chart.label} • {chart.desc}
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-200 mb-4">
          <button
            onClick={handlePrev}
            disabled={isPrinting || currentStudentIndex === 0}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={handleNext}
            disabled={isPrinting || currentStudentIndex === students.length - 1}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? 'Preparando...' : 'Imprimir Gráficos'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintSelectionModal;
