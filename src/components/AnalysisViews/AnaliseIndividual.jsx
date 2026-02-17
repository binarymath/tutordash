import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { calcularEstatisticasAluno, calcularEstatisticasTurma } from '../../services/mapaoService';
import { User, Search, TrendingUp, AlertCircle, Award, Calendar } from 'lucide-react';
import GraficoRadarAluno from '../Charts/GraficoRadarAluno';
import GraficoComparativoAluno from '../Charts/GraficoComparativoAluno';
import GraficoEvolucaoAluno from '../Charts/GraficoEvolucaoAluno';

const AnaliseIndividual = () => {
    const { dadosMapao, incluirInativos, dadosBimestres, bimestresDisponiveis } = useData();
    const [alunoSelecionado, setAlunoSelecionado] = useState(null);
    const [busca, setBusca] = useState('');
    const [mostrarSidebar, setMostrarSidebar] = useState(true);

    const estatisticasTurma = useMemo(() => {
        if (!dadosMapao) return null;
        return calcularEstatisticasTurma(dadosMapao, incluirInativos);
    }, [dadosMapao, incluirInativos]);

    const alunosDisponiveis = useMemo(() => {
        if (!dadosMapao) return [];
        return incluirInativos
            ? dadosMapao.alunos
            : dadosMapao.alunos.filter(a => a.isAtivo);
    }, [dadosMapao, incluirInativos]);

    const alunosFiltrados = useMemo(() => {
        if (!busca) return alunosDisponiveis;
        return alunosDisponiveis.filter(aluno =>
            aluno.nome.toLowerCase().includes(busca.toLowerCase())
        );
    }, [alunosDisponiveis, busca]);

    const indiceAlunoSelecionado = useMemo(() => {
        if (!alunoSelecionado) return -1;
        return alunosFiltrados.findIndex(a => a.nome === alunoSelecionado.nome);
    }, [alunoSelecionado, alunosFiltrados]);

    const irParaAlunoAnterior = (voltarTopo = false) => {
        if (indiceAlunoSelecionado > 0) {
            setAlunoSelecionado(alunosFiltrados[indiceAlunoSelecionado - 1]);
            if (voltarTopo) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const irParaProximoAluno = (voltarTopo = false) => {
        if (indiceAlunoSelecionado >= 0 && indiceAlunoSelecionado < alunosFiltrados.length - 1) {
            setAlunoSelecionado(alunosFiltrados[indiceAlunoSelecionado + 1]);
            if (voltarTopo) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const estatisticasAluno = useMemo(() => {
        if (!alunoSelecionado) return null;
        return calcularEstatisticasAluno(alunoSelecionado);
    }, [alunoSelecionado]);

    // Calcula total de faltas de todos os bimestres
    const totalFaltasAllBimestres = useMemo(() => {
        if (!alunoSelecionado || bimestresDisponiveis.length === 0) return 0;

        let totalFaltas = 0;
        bimestresDisponiveis.forEach(bim => {
            const alunoNoBim = dadosBimestres[bim]?.alunos.find(a => a.nome === alunoSelecionado.nome);
            if (alunoNoBim) {
                Object.values(alunoNoBim.disciplinas).forEach(disc => {
                    totalFaltas += disc.faltas || 0;
                });
            }
        });

        return totalFaltas;
    }, [alunoSelecionado, bimestresDisponiveis, dadosBimestres]);

    if (!dadosMapao) {
        return (
            <div className="w-full rounded-2xl border border-brown-300 bg-white/90 backdrop-blur-sm p-6 text-center text-brown-800 font-medium shadow-elevation-2">
                Carregue um arquivo do Mapão para ver a análise
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className={`grid gap-6 ${mostrarSidebar ? 'xl:grid-cols-[360px_1fr]' : 'grid-cols-1'}`}>
                <div className={mostrarSidebar ? 'block' : 'hidden'}>
                    <div className="search-section bg-white/90 backdrop-blur-sm border border-brown-300 rounded-2xl p-6 shadow-elevation-4 sticky top-6">
                        <h2 className="flex items-center gap-2 text-xl font-extrabold text-brown-900"><User size={26} /> Análise Individual do Aluno</h2>

                        <button
                            className="mt-4 inline-flex items-center justify-center rounded-lg border border-brown-300 bg-brown-100 px-3 py-2 text-sm font-semibold text-brown-800 hover:bg-brown-200 transition-all"
                            onClick={() => setMostrarSidebar(false)}
                            title="Ocultar lista"
                            aria-label="Ocultar lista"
                        >
                            Ocultar lista
                        </button>

                        <div className="search-container relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-500" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar aluno por nome..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full rounded-xl border border-brown-300 bg-white py-3 pl-10 pr-4 text-base font-medium text-brown-900 placeholder:text-brown-500 focus:border-brown-600 focus:outline-none focus:ring-2 focus:ring-brown-600/20 transition-all"
                            />
                        </div>

                        <div className="alunos-list mt-4 flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
                            {alunosFiltrados.length === 0 ? (
                                <p className="text-center text-sm text-brown-600 py-6">Nenhum aluno encontrado</p>
                            ) : (
                                alunosFiltrados.map((aluno, index) => (
                                    <button
                                        key={index}
                                        className={`aluno-item flex items-center justify-between rounded-xl border px-4 py-3 text-left text-base transition-all ${alunoSelecionado === aluno ? 'bg-gradient-to-r from-brown-200 to-brown-300 text-brown-900 border-brown-400 shadow-elevation-2' : 'bg-white border-brown-200 hover:border-brown-400 hover:bg-brown-50 text-brown-800'}`}
                                        onClick={() => setAlunoSelecionado(aluno)}
                                    >
                                        <span className="aluno-nome font-semibold text-base">{aluno.nome}</span>
                                        <span className={`aluno-status text-sm font-bold uppercase px-2 py-1 rounded-md ${alunoSelecionado === aluno ? 'bg-brown-400/30 text-brown-900' : aluno.situacao.toLowerCase() === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {aluno.situacao}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {!mostrarSidebar && (
                        <button
                            className="inline-flex items-center justify-center rounded-lg border border-brown-300 bg-brown-100 px-3 py-2 text-sm font-semibold text-brown-800 hover:bg-brown-200 transition-all self-start"
                            onClick={() => setMostrarSidebar(true)}
                            title="Mostrar lista"
                            aria-label="Mostrar lista"
                        >
                            Mostrar lista
                        </button>
                    )}

                    {alunoSelecionado && estatisticasAluno && (
                        <div className="aluno-details space-y-8">
                            {/* Header do aluno */}
                            <div className="aluno-header bg-gradient-to-br from-brown-100 via-brown-200 to-brown-100 rounded-3xl p-8 shadow-elevation-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 border border-brown-300">
                                <div className="aluno-nav left flex justify-start">
                                    <button
                                        className="aluno-nav-button px-4 py-2 rounded-lg border border-brown-400 bg-white text-brown-900 font-semibold hover:bg-brown-50 transition-all shadow-elevation-1 hover:shadow-elevation-2"
                                        onClick={irParaAlunoAnterior}
                                        disabled={indiceAlunoSelecionado <= 0}
                                    >
                                        Aluno Anterior
                                    </button>
                                </div>
                                <div className="aluno-info text-center">
                                    <h1 className="text-2xl font-bold text-brown-900">{alunoSelecionado.nome}</h1>
                                    <span className={`status-badge inline-block mt-2 px-3 py-1 rounded-lg text-sm font-semibold ${alunoSelecionado.situacao.toLowerCase() === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {alunoSelecionado.situacao}
                                    </span>
                                </div>
                                <div className="aluno-nav right flex justify-end">
                                    <button
                                        className="aluno-nav-button px-4 py-2 rounded-lg border border-brown-400 bg-white text-brown-900 font-semibold hover:bg-brown-50 transition-all shadow-elevation-1 hover:shadow-elevation-2"
                                        onClick={irParaProximoAluno}
                                        disabled={indiceAlunoSelecionado === -1 || indiceAlunoSelecionado >= alunosFiltrados.length - 1}
                                    >
                                        Próximo Aluno
                                    </button>
                                </div>
                            </div>

                            {/* Cards de estatísticas gerais */}
                            <div className="aluno-stats-cards grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                                <div className="aluno-stat-card media bg-white/90 border backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border-brown-300">
                                    <TrendingUp className="text-brown-700" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-brown-600">Média Geral</p>
                                        <p className="stat-value text-2xl font-bold text-brown-900">{estatisticasAluno.mediaGeral.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="aluno-stat-card faltas bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border border-brown-300">
                                    <Calendar className="text-brown-700" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-brown-600">Total de Faltas</p>
                                        <p className="stat-value text-2xl font-bold text-brown-900">
                                            {bimestresDisponiveis.length > 1 ? totalFaltasAllBimestres : estatisticasAluno.totalFaltas}
                                        </p>
                                    </div>
                                </div>

                                <div className="aluno-stat-card melhor bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border border-brown-300">
                                    <Award className="text-brown-700" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-brown-600">Melhor Disciplina</p>
                                        <p className="stat-value-small text-sm font-semibold text-brown-800">{estatisticasAluno.melhorDisciplina?.nome}</p>
                                        <p className="stat-nota text-xl font-bold text-brown-900">{estatisticasAluno.melhorDisciplina?.nota.toFixed(1)}</p>
                                    </div>
                                </div>

                                <div className="aluno-stat-card risco bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border border-brown-300">
                                    <AlertCircle className="text-red-600" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-brown-600">Disciplinas em Risco</p>
                                        <p className="stat-value text-2xl font-bold text-red-700">{estatisticasAluno.disciplinasEmRisco.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Alertas */}
                            {estatisticasAluno.disciplinasEmRisco.length > 0 && (
                                <div className="alert-section flex items-start gap-4 p-4 bg-red-50 border border-red-300 rounded-xl text-red-800">
                                    <AlertCircle size={20} className="text-red-600" />
                                    <div>
                                        <strong>Atenção necessária em:</strong>
                                        <ul className="mt-2 space-y-1">
                                            {estatisticasAluno.disciplinasEmRisco.map((disc, idx) => (
                                                <li key={idx} className="text-sm font-medium">
                                                    {disc.nome}: <span className="font-bold">{disc.nota.toFixed(1)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Gráficos */}
                            <div className="graficos-section grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {bimestresDisponiveis.length > 1 && (
                                    <div className="grafico-card full-width bg-gradient-to-br from-white/95 to-brown-50/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-4 xl:col-span-2 border border-brown-300">
                                        <h3 className="text-xl font-bold text-brown-900 mb-4">📈 Evolução ao Longo dos Bimestres</h3>
                                        <GraficoEvolucaoAluno
                                            nomeAluno={alunoSelecionado.nome}
                                            dadosBimestres={dadosBimestres}
                                        />
                                    </div>
                                )}

                                <div className="grafico-card full-width bg-gradient-to-br from-white/95 to-brown-50/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-4 xl:col-span-2 border border-brown-300">
                                    <h3 className="text-xl font-bold text-brown-900 mb-4">📊 Desempenho por Disciplina (Radar)</h3>
                                    <GraficoRadarAluno
                                        aluno={alunoSelecionado}
                                        dadosBimestres={dadosBimestres}
                                        bimestresDisponiveis={bimestresDisponiveis}
                                    />
                                </div>

                                <div className="grafico-card full-width bg-gradient-to-br from-white/95 to-brown-50/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-4 xl:col-span-2 border border-brown-300">
                                    <h3 className="text-xl font-bold text-brown-900 mb-4">📈 Comparação com Média da Turma</h3>
                                    <GraficoComparativoAluno
                                        aluno={alunoSelecionado}
                                        mediaTurma={estatisticasTurma?.disciplinas}
                                    />
                                </div>
                            </div>

                            {/* Tabela detalhada */}
                            <div className="tabela-detalhada bg-gradient-to-br from-white/95 to-brown-50/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-4 border border-brown-300">
                                <h3 className="text-xl font-bold text-brown-900 mb-4">📋 Detalhamento por Disciplina</h3>
                                <div className="table-container overflow-x-auto">
                                    {bimestresDisponiveis.length > 1 ? (
                                        <table className="detalhamento-table w-max min-w-[1200px] table-fixed border-separate border-spacing-0 rounded-xl overflow-visible text-brown-900">
                                            <colgroup>
                                                <col className="col-disciplina" />
                                                {bimestresDisponiveis.map(bim => (
                                                    <React.Fragment key={bim}>
                                                        <col className="col-nota" />
                                                        <col className="col-faltas" />
                                                        <col className="col-aus" />
                                                        <col className="col-status" />
                                                        <col className="col-comp" />
                                                    </React.Fragment>
                                                ))}
                                            </colgroup>
                                            <thead className="bg-brown-200">
                                                <tr>
                                                    <th
                                                        className="sticky left-0 z-30 px-4 py-3 text-sm font-bold text-center bg-brown-200 text-brown-900 uppercase tracking-wide"
                                                        rowSpan={2}
                                                    >
                                                        Disciplina
                                                    </th>
                                                    {bimestresDisponiveis.map((bim) => (
                                                        <th key={bim} colSpan={5} className="px-3 py-3 text-sm font-bold text-center text-brown-900 uppercase tracking-wide">
                                                            {bim}º Bimestre
                                                        </th>
                                                    ))}
                                                </tr>
                                                <tr className="bg-brown-100">
                                                    {bimestresDisponiveis.map((bim) => (
                                                        <React.Fragment key={bim}>
                                                            <th className="px-3 py-2 text-xs font-semibold text-brown-900 uppercase tracking-wider">Média</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-brown-900 uppercase tracking-wider">Mediana</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-brown-900 uppercase tracking-wider">Desvio Padrão</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-brown-900 uppercase tracking-wider">Aprovação</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-brown-900 uppercase tracking-wider">Comparativo</th>
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="text-white/90">
                                                {Object.keys(alunoSelecionado.disciplinas).map(nomeDisc => (
                                                    <tr key={nomeDisc} className="odd:bg-white/5 even:bg-white/10 hover:bg-white/15">
                                                        <td className="sticky left-0 z-10 bg-[#1A1411] px-4 py-3 text-sm font-semibold text-white">{nomeDisc}</td>
                                                        {bimestresDisponiveis.map(bim => {
                                                            const alunoNoBim = dadosBimestres[bim]?.alunos.find(a => a.nome === alunoSelecionado.nome);
                                                            const dadosDisciplina = alunoNoBim?.disciplinas[nomeDisc];
                                                            const estatisticasTurmaBim = dadosBimestres[bim] ? calcularEstatisticasTurma(dadosBimestres[bim], incluirInativos) : null;

                                                            if (!dadosDisciplina || dadosDisciplina.media === null) {
                                                                return (
                                                                    <React.Fragment key={bim}>
                                                                        <td className="px-3 py-3">-</td>
                                                                        <td className="px-3 py-3">-</td>
                                                                        <td className="px-3 py-3">-</td>
                                                                        <td className="px-3 py-3">-</td>
                                                                        <td className="px-3 py-3">-</td>
                                                                    </React.Fragment>
                                                                );
                                                            }

                                                            const aprovado = dadosDisciplina.media >= 5;
                                                            const mediaTurmaBim = estatisticasTurmaBim?.disciplinas[nomeDisc]?.media || 0;
                                                            const diferenca = dadosDisciplina.media - mediaTurmaBim;

                                                            return (
                                                                <React.Fragment key={bim}>
                                                                    <td className={`px-3 py-3 font-bold ${aprovado ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                        {dadosDisciplina.media.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3 py-3">{dadosDisciplina.faltas}</td>
                                                                    <td className="px-3 py-3">{dadosDisciplina.ausenciasCompensadas}</td>
                                                                    <td className="px-3 py-3">
                                                                        <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ${aprovado ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                                                                            {aprovado ? '✓' : '✗'}
                                                                        </span>
                                                                    </td>
                                                                    <td className={`px-3 py-3 font-semibold ${diferenca >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                        {diferenca >= 0 ? '↑' : '↓'} {Math.abs(diferenca).toFixed(2)}
                                                                    </td>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="detalhamento-table w-max min-w-[900px] table-fixed border-separate border-spacing-0 rounded-xl overflow-visible text-white">
                                            <colgroup>
                                                <col className="col-disciplina" />
                                                <col className="col-nota" />
                                                <col className="col-faltas" />
                                                <col className="col-aus" />
                                                <col className="col-status" />
                                                <col className="col-comp" />
                                            </colgroup>
                                            <thead className="bg-gradient-to-r from-[#2B1B12] via-[#3D2A20] to-[#2B1B12] text-white">
                                                <tr>
                                                    <th className="sticky left-0 z-30 bg-gradient-to-r from-[#2B1B12] via-[#3D2A20] to-[#2B1B12] text-center px-4 py-3 font-semibold">Disciplina</th>
                                                    <th className="px-3 py-2 text-sm font-semibold">Nota</th>
                                                    <th className="px-3 py-2 text-sm font-semibold">Faltas</th>
                                                    <th className="px-3 py-2 text-sm font-semibold">Aus. Compensadas</th>
                                                    <th className="px-3 py-2 text-sm font-semibold">Status</th>
                                                    <th className="px-3 py-2 text-sm font-semibold">Comparação c/ Turma</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-white/90">
                                                {Object.entries(alunoSelecionado.disciplinas).map(([nome, dados]) => {
                                                    if (dados.media === null) return null;

                                                    const mediaTurma = estatisticasTurma?.disciplinas[nome]?.media || 0;
                                                    const diferenca = dados.media - mediaTurma;
                                                    const aprovado = dados.media >= 5;

                                                    return (
                                                        <tr key={nome} className="odd:bg-white/5 even:bg-white/10 hover:bg-white/15">
                                                            <td className="sticky left-0 z-10 bg-[#1A1411] px-4 py-3 text-sm font-semibold text-white">{nome}</td>
                                                            <td className={`px-3 py-3 font-bold ${aprovado ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                {dados.media.toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-3">{dados.faltas}</td>
                                                            <td className="px-3 py-3">{dados.ausenciasCompensadas}</td>
                                                            <td className="px-3 py-3">
                                                                <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ${aprovado ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                                                                    {aprovado ? '✓ Aprovado' : '✗ Reprovado'}
                                                                </span>
                                                            </td>
                                                            <td className={`px-3 py-3 font-semibold ${diferenca >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                {diferenca >= 0 ? '↑' : '↓'} {Math.abs(diferenca).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <button
                                    className="aluno-nav-button px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-white font-semibold hover:bg-white/10 transition"
                                    onClick={() => irParaAlunoAnterior(true)}
                                    disabled={indiceAlunoSelecionado <= 0}
                                >
                                    Aluno Anterior
                                </button>
                                <button
                                    className="aluno-nav-button px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-white font-semibold hover:bg-white/10 transition"
                                    onClick={() => irParaProximoAluno(true)}
                                    disabled={indiceAlunoSelecionado === -1 || indiceAlunoSelecionado >= alunosFiltrados.length - 1}
                                >
                                    Próximo Aluno
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnaliseIndividual;
