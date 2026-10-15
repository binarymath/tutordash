import React, { useState, useMemo } from 'react';
import {
  Sheet, BookOpen, Filter, Search, Plus, ExternalLink,
  ChevronDown, Layers, Calendar, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { formatTurma, formatDisciplina } from '../utils/helpers';

const DisciplinaTableSection = ({
  selectedTurma,
  selectedDisc = 'Geral',
  disciplinaData,
  isLoading = false,
  error = null,
  onOpenLinksModal,
  hasUrl = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDiscFilter, setActiveDiscFilter] = useState('ALL');

  // Normaliza a turma atual (ex: "6A")
  const currentTurmaNorm = useMemo(() => formatTurma(selectedTurma), [selectedTurma]);

  // Filtra as linhas da turma selecionada
  const turmaRows = useMemo(() => {
    if (!disciplinaData?.rows?.length || !currentTurmaNorm) return [];
    return disciplinaData.rows.filter(r => {
      const rTurmaNorm = formatTurma(r.turma);
      return rTurmaNorm === currentTurmaNorm || r.turma === selectedTurma;
    });
  }, [disciplinaData, currentTurmaNorm, selectedTurma]);

  // Lista de todas as disciplinas encontradas para esta turma
  const availableDisciplinas = useMemo(() => {
    const set = new Set();
    turmaRows.forEach(r => {
      if (r.disciplina) set.add(r.disciplina);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [turmaRows]);

  // Sincroniza o filtro com a disciplina selecionada no topo do painel se aplicável
  const effectiveDisciplina = useMemo(() => {
    if (activeDiscFilter !== 'ALL') return activeDiscFilter;
    if (selectedDisc && selectedDisc !== 'Geral') {
      const formattedTop = formatDisciplina(selectedDisc);
      const match = availableDisciplinas.find(d =>
        d.toLowerCase() === formattedTop.toLowerCase() ||
        d.toLowerCase().includes(formattedTop.toLowerCase())
      );
      if (match) return match;
    }
    return 'ALL';
  }, [activeDiscFilter, selectedDisc, availableDisciplinas]);

  // Filtra por disciplina e busca textual
  const filteredRows = useMemo(() => {
    return turmaRows.filter(row => {
      // Filtro de disciplina (Coluna D)
      if (effectiveDisciplina !== 'ALL' && row.disciplina !== effectiveDisciplina) {
        return false;
      }

      // Filtro de busca textual em todas as células da linha
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesCell = row.cells.some(c => String(c.value).toLowerCase().includes(term));
        const matchesDisc = row.disciplina.toLowerCase().includes(term);
        const matchesBim = row.bimestre.toLowerCase().includes(term);
        return matchesCell || matchesDisc || matchesBim;
      }

      return true;
    });
  }, [turmaRows, effectiveDisciplina, searchTerm]);

  // Agrupa as linhas filtradas por Bimestre (separando por tabela)
  const groupedByBimestre = useMemo(() => {
    const groups = {};
    // Ordem esperada dos bimestres
    const standardOrder = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

    filteredRows.forEach(row => {
      const bim = row.bimestre || 'Outros';
      if (!groups[bim]) groups[bim] = [];
      groups[bim].push(row);
    });

    // Ordena os bimestres
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      bimestre: key,
      rows: groups[key]
    }));
  }, [filteredRows]);

  // ── CASO 1: Nenhuma URL configurada ──
  if (!hasUrl) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Sheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Planilha Complementar por Disciplina
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Você pode conectar uma planilha com abas por turma e bimestre (ex: <strong>{currentTurmaNorm || '6A'}-1B</strong>) para visualizar as linhas da <strong>Coluna D (Disciplina)</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLinksModal}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 hover:border-blue-300 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adicionar Planilha
          </button>
        </div>
      </div>
    );
  }

  // ── CASO 2: Carregando ──
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-3 animate-pulse">
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Carregando registros da planilha de disciplinas...
        </p>
      </div>
    );
  }

  // ── CASO 3: Erro no carregamento ──
  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-800">Falha ao ler a planilha de disciplinas</p>
            <p className="text-[11px] text-rose-600 mt-0.5">{error.message || 'Verifique se o link está público.'}</p>
          </div>
        </div>
        <button
          onClick={onOpenLinksModal}
          className="px-3.5 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100/50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Revisar Link
        </button>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Registros e Acompanhamento por Disciplina
              </h3>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                Turma {currentTurmaNorm}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Linhas da planilha filtradas pela Coluna D (Disciplina) e organizadas por bimestre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onOpenLinksModal}
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Alterar ou gerenciar links"
          >
            <Sheet className="w-3.5 h-3.5" /> Planilha
          </button>
        </div>
      </div>

      {/* Controles de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
        
        {/* Seletor de Disciplina */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Disciplina:
          </span>
          <button
            type="button"
            onClick={() => setActiveDiscFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              effectiveDisciplina === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas ({turmaRows.length})
          </button>
          {availableDisciplinas.map(disc => {
            const count = turmaRows.filter(r => r.disciplina === disc).length;
            const isSelected = effectiveDisciplina === disc;
            return (
              <button
                key={disc}
                type="button"
                onClick={() => setActiveDiscFilter(disc)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {disc} ({count})
              </button>
            );
          })}
        </div>

        {/* Campo de Busca Textual */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar dados nesta tabela..."
            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Exibição das Tabelas separadas por Bimestre */}
      {groupedByBimestre.length > 0 ? (
        <div className="space-y-6">
          {groupedByBimestre.map(group => {
            // Determina os cabeçalhos a partir da primeira linha deste bimestre
            const firstRow = group.rows[0];
            const headers = firstRow ? firstRow.cells.map(c => c.header) : [];

            // Oculta colunas redundantes: Série e Disciplina (Coluna D)
            const normHeader = (h) => String(h || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
            const visibleCols = headers
              .map((header, idx) => ({ header, idx }))
              .filter(({ header, idx }) => idx !== 3 && normHeader(header) !== 'SERIE');

            // Ordena pela coluna (%) Acertos, do menor para o maior (vazios no final)
            const pctIdx = headers.findIndex(h => String(h).includes('%'));
            const getPct = (row) => {
              if (pctIdx === -1) return null;
              const raw = row.rawRow?.[pctIdx];
              if (typeof raw === 'number') return raw;
              const n = parseFloat(String(raw ?? '').replace('%', '').replace(',', '.'));
              if (isNaN(n)) return null;
              return String(raw).includes('%') || n > 1 ? n / 100 : n;
            };
            const sortedRows = pctIdx === -1 ? group.rows : [...group.rows].sort((a, b) => {
              const pa = getPct(a);
              const pb = getPct(b);
              if (pa === null && pb === null) return 0;
              if (pa === null) return 1;
              if (pb === null) return -1;
              return pa - pb;
            });

            return (
              <div
                key={group.bimestre}
                className="border border-slate-200 rounded-2xl overflow-clip shadow-2xs bg-white"
              >
                {/* Faixa do Bimestre */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-black text-slate-800 tracking-tight">
                      {group.bimestre}
                    </h4>
                  </div>
                  <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    {group.rows.length} {group.rows.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>

                {/* Tabela de Linhas da Disciplina (altura total, rola com a página) */}
                <div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-16 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <tr>
                        {visibleCols.map(({ header, idx }) => (
                          <th key={idx} className="py-2.5 px-3.5 whitespace-nowrap">
                            {header}
                            {idx === pctIdx && <span className="ml-1 text-blue-600">↑</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedRows.map((row, rIdx) => (
                        <tr
                          key={row.id || rIdx}
                          className={`transition-colors hover:bg-blue-100/70 ${
                            rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                          }`}
                        >
                          {visibleCols.map(({ idx: cIdx }) => {
                            const cell = row.cells[cIdx] || {};
                            const val = String(cell.value || '');
                            const isUrl = /^https?:\/\//i.test(val);
                            const isLongText = !isUrl && val.length > 40;
                            return (
                              <td
                                key={cIdx}
                                className={`py-2.5 px-3.5 ${isLongText ? 'min-w-[280px] max-w-[480px] whitespace-normal' : 'whitespace-nowrap'} ${
                                  cIdx === pctIdx ? 'font-black text-slate-800' : 'text-slate-700 font-medium'
                                }`}
                              >
                                {isUrl ? (
                                  <a
                                    href={val}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-bold"
                                    title={val}
                                  >
                                    <ExternalLink className="w-3 h-3" /> Abrir
                                  </a>
                                ) : (
                                  val || <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <p className="text-xs font-bold text-slate-500">
            Nenhuma linha encontrada para a turma {currentTurmaNorm}
            {effectiveDisciplina !== 'ALL' ? ` na disciplina ${effectiveDisciplina}` : ''}.
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Certifique-se de que a planilha possui abas nomeadas como <strong>{currentTurmaNorm}-1B</strong>, <strong>{currentTurmaNorm}-2B</strong>, etc., e que a coluna D contenha o nome da matéria.
          </p>
        </div>
      )}

      {/* Rodapé Didático */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span>
          💡 Exibindo linhas completas retornadas da planilha com base na <strong>Coluna D (Disciplina)</strong>.
        </span>
        <span>
          Total de registros encontrados: <strong>{filteredRows.length}</strong>
        </span>
      </div>

    </section>
  );
};

export default DisciplinaTableSection;
