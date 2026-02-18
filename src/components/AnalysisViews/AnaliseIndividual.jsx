import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { calcularEstatisticasAluno, calcularEstatisticasTurma } from '../../services/mapaoService';
import { User, Search, TrendingUp, AlertCircle, Award, Calendar, AlertTriangle } from 'lucide-react';
import GraficoRadarAluno from '../Charts/GraficoRadarAluno';
import GraficoComparativoAluno from '../Charts/GraficoComparativoAluno';
import GraficoEvolucaoAluno from '../Charts/GraficoEvolucaoAluno';

const AnaliseIndividual = () => {
    const { dadosMapao, incluirInativos, dadosBimestres, bimestresDisponiveis, turmaSelecionada } = useData();
    const [alunoSelecionado, setAlunoSelecionado] = useState(null);
    const [busca, setBusca] = useState('');

    const [mostrarSidebar, setMostrarSidebar] = useState(true);
    const [showStickyHeader, setShowStickyHeader] = useState(false);

    // Controle do header fixo ao rolar
    React.useEffect(() => {
        const handleScroll = () => {
            setShowStickyHeader(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const estatisticasTurma = useMemo(() => {
        if (!dadosMapao) return null;
        return calcularEstatisticasTurma(dadosMapao, incluirInativos);
    }, [dadosMapao, incluirInativos]);

    const alunosDisponiveis = useMemo(() => {
        if (!dadosBimestres) return [];

        const todosAlunosMap = new Map();

        // Itera sobre todos os bimestres disponíveis para coletar alunos
        Object.values(dadosBimestres).forEach(dadosBimestre => {
            if (!dadosBimestre) return;

            dadosBimestre.alunos.forEach(aluno => {
                // Se estiver filtrando inativos, verifica o status
                if (incluirInativos || aluno.isAtivo) {
                    // Armazena o aluno (se já existir, mantém o mais recente ou o do bimestre atual se preferir,
                    // mas aqui estamos garantindo que ele exista na lista)
                    if (!todosAlunosMap.has(aluno.nome)) {
                        todosAlunosMap.set(aluno.nome, aluno);
                    } else {
                        // Opcional: Atualizar para o objeto mais "recente" ou completo se necessário
                        // Se o aluno no Map vier de um bimestre anterior, e o atual for mais novo, podemos atualizar
                        // Mas como o objeto aluno é similar, o importante é ter o nome na lista.
                        // Para garantir que usamos os dados do bimestre ATUAL se disponível, podemos priorizar:
                        if (dadosMapao && dadosBimestre === dadosMapao) {
                            todosAlunosMap.set(aluno.nome, aluno);
                        }
                    }
                }
            });
        });

        return Array.from(todosAlunosMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [dadosBimestres, incluirInativos, dadosMapao]);

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
            <div className={`flex gap-6 ${mostrarSidebar ? '' : 'justify-center'}`}>
                <div className={mostrarSidebar ? 'w-[30%] min-w-[300px] max-w-[400px]' : 'hidden'}>
                    <div className="search-section bg-brown-900/90 backdrop-blur-sm border border-brown-700 rounded-2xl p-6 shadow-elevation-4 sticky top-6">
                        <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                            <User size={26} />
                            Análise Individual
                            <span className="text-lg font-bold text-white ml-2 block sm:inline">
                                {turmaSelecionada}
                            </span>
                        </h2>

                        <button
                            className="mt-4 inline-flex items-center justify-center rounded-lg border border-brown-600 bg-brown-800/50 px-3 py-2 text-sm font-semibold text-white hover:bg-brown-700 transition-all"
                            onClick={() => setMostrarSidebar(false)}
                            title="Ocultar lista"
                            aria-label="Ocultar lista"
                        >
                            Ocultar lista
                        </button>

                        <div className="search-container relative mt-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar aluno..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-full rounded-xl border border-brown-600 bg-brown-800 py-3 pl-10 pr-4 text-base font-medium text-white placeholder:text-brown-400 focus:border-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-all"
                            />
                        </div>

                        <div className="alunos-list mt-4 flex flex-col gap-2 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
                            {alunosFiltrados.length === 0 ? (
                                <p className="text-center text-sm text-brown-400 py-6">Nenhum aluno encontrado</p>
                            ) : (
                                alunosFiltrados.map((aluno, index) => (
                                    <button
                                        key={index}
                                        className={`aluno-item flex items-center justify-between rounded-xl border px-4 py-3 text-left text-base transition-all ${alunoSelecionado === aluno ? 'bg-gradient-to-r from-brown-700 to-brown-600 text-white border-brown-500 shadow-elevation-4' : 'bg-brown-800/30 border-brown-700 hover:border-brown-500 hover:bg-brown-800/50 text-brown-200 hover:text-white'}`}
                                        onClick={() => setAlunoSelecionado(aluno)}
                                    >
                                        <span className="aluno-nome font-semibold text-base">{aluno.nome}</span>
                                        <span className={`aluno-status text-xs font-bold uppercase px-2 py-1 rounded-md ${alunoSelecionado === aluno ? 'bg-brown-900/50 text-white' : aluno.situacao.toLowerCase() === 'ativo' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                            {aluno.situacao}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className={mostrarSidebar ? 'flex-1' : 'w-full'}>
                    {!mostrarSidebar && (
                        <button
                            className="inline-flex items-center justify-center rounded-lg border border-brown-600 bg-brown-800/50 px-3 py-2 text-sm font-semibold text-white hover:bg-brown-700 transition-all self-start"
                            onClick={() => setMostrarSidebar(true)}
                            title="Mostrar lista"
                            aria-label="Mostrar lista"
                        >
                            Mostrar lista
                        </button>
                    )}


                    {/* Header Fixo ao rolar */}
                    <div className={`fixed top-0 left-0 right-0 z-[1200] flex items-center justify-between bg-brown-900/95 px-6 py-3 shadow-lg backdrop-blur-md transition-all duration-300 border-b border-brown-700 ${showStickyHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>

                        <div className="flex items-center gap-4">
                            <button
                                className="rounded-lg border border-brown-600 bg-brown-800/50 p-2 text-white hover:bg-brown-700 transition-all disabled:opacity-50"
                                onClick={() => irParaAlunoAnterior(false)} // Não voltar ao topo no sticky
                                disabled={indiceAlunoSelecionado <= 0}
                                title="Aluno Anterior"
                            >
                                ←
                            </button>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-none">{alunoSelecionado?.nome}</h2>
                                <span className={`text-xs font-semibold ${alunoSelecionado?.situacao.toLowerCase() === 'ativo' ? 'text-green-400' : 'text-red-400'}`}>
                                    {alunoSelecionado?.situacao}
                                </span>
                            </div>
                            <button
                                className="rounded-lg border border-brown-600 bg-brown-800/50 p-2 text-white hover:bg-brown-700 transition-all disabled:opacity-50"
                                onClick={() => irParaProximoAluno(false)} // Não voltar ao topo no sticky
                                disabled={indiceAlunoSelecionado === -1 || indiceAlunoSelecionado >= alunosFiltrados.length - 1}
                                title="Próximo Aluno"
                            >
                                →
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <span className="text-xs text-brown-300 block uppercase tracking-wider">Média Geral</span>
                                <span className="text-lg font-bold text-white">{estatisticasAluno?.mediaGeral.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {alunoSelecionado && estatisticasAluno && (
                        <div className="aluno-details space-y-8">
                            {/* Header do aluno */}
                            <div className="aluno-header bg-brown-900 rounded-3xl p-8 shadow-elevation-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 border border-brown-700">
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
                                    <h1 className="text-2xl font-bold text-white">{alunoSelecionado.nome}</h1>
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
                                <div className="aluno-stat-card media bg-brown-900/50 border backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border-brown-700">
                                    <TrendingUp className="text-white" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-white font-bold">Média Geral</p>
                                        <p className="stat-value text-2xl font-bold text-white">{estatisticasAluno.mediaGeral.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="aluno-stat-card faltas bg-brown-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border border-brown-700">
                                    <Calendar className="text-white" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-white font-bold">Total de Faltas</p>
                                        <p className="stat-value text-2xl font-bold text-white">
                                            {bimestresDisponiveis.length > 1 ? totalFaltasAllBimestres : estatisticasAluno.totalFaltas}
                                        </p>
                                    </div>
                                </div>

                                <div className="aluno-stat-card melhor bg-brown-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border border-brown-700">
                                    <Award className="text-white" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-white font-bold">Melhor Disciplina</p>
                                        {estatisticasAluno.melhorDisciplina ? (
                                            <div className="flex flex-col">
                                                <p className="stat-value text-lg font-bold text-white leading-tight" title={estatisticasAluno.melhorDisciplina.nome}>
                                                    {estatisticasAluno.melhorDisciplina.nome}
                                                </p>
                                                <p className="text-3xl font-extrabold text-accent-green mt-1">{estatisticasAluno.melhorDisciplina.nota.toFixed(2)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-brown-400">N/A</p>
                                        )}
                                    </div>
                                </div>

                                <div className="aluno-stat-card pior bg-brown-900/50 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-2 flex items-center gap-4 border border-brown-700">
                                    <AlertTriangle className="text-white" size={28} />
                                    <div>
                                        <p className="stat-label text-xs uppercase tracking-wide text-white font-bold">Disciplinas &lt; 5.0</p>
                                        <p className="stat-value text-2xl font-bold text-white">
                                            {Object.values(alunoSelecionado.disciplinas).filter(d => d.media !== null && d.media < 5).length}
                                        </p>
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
                                    <div className="grafico-card full-width bg-brown-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-8 xl:col-span-2 border border-brown-700">
                                        <h3 className="text-xl font-bold text-white mb-4">📈 Evolução ao Longo dos Bimestres</h3>
                                        <GraficoEvolucaoAluno
                                            nomeAluno={alunoSelecionado.nome}
                                            dadosBimestres={dadosBimestres}
                                        />
                                    </div>
                                )}

                                <div className="grafico-card full-width bg-brown-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-8 xl:col-span-2 border border-brown-700">
                                    <h3 className="text-xl font-bold text-white mb-4">📊 Desempenho por Disciplina (Radar)</h3>
                                    <GraficoRadarAluno
                                        aluno={alunoSelecionado}
                                        dadosBimestres={dadosBimestres}
                                        bimestresDisponiveis={bimestresDisponiveis}
                                    />
                                </div>

                                <div className="grafico-card full-width bg-brown-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-8 xl:col-span-2 border border-brown-700">
                                    <h3 className="text-xl font-bold text-white mb-4">📈 Comparação com Média da Turma</h3>
                                    <GraficoComparativoAluno
                                        aluno={alunoSelecionado}
                                        mediaTurma={estatisticasTurma?.disciplinas}
                                        dadosBimestres={dadosBimestres}
                                        bimestresDisponiveis={bimestresDisponiveis}
                                    />
                                </div>
                            </div>

                            {/* Tabela detalhada */}
                            <div className="tabela-detalhada bg-brown-900/90 backdrop-blur-sm rounded-2xl p-6 shadow-elevation-8 border border-brown-700">
                                <h3 className="text-xl font-bold text-white mb-4">📋 Detalhamento por Disciplina</h3>
                                <div className="table-container overflow-x-auto">
                                    {bimestresDisponiveis.length > 1 ? (
                                        <table className="detalhamento-table w-max min-w-[1400px] table-fixed border-separate border-spacing-0 rounded-xl overflow-visible text-white">
                                            <colgroup>
                                                <col className="col-disciplina" />
                                                {bimestresDisponiveis.map(bim => (
                                                    <React.Fragment key={bim}>
                                                        <col className="col-nota" />
                                                        <col className="col-faltas" />
                                                        <col className="col-comp" />
                                                        <col className="col-perc" />
                                                    </React.Fragment>
                                                ))}
                                                <col className="col-media-geral" />
                                            </colgroup>
                                            <thead className="bg-brown-900/30">
                                                <tr>
                                                    <th
                                                        className="sticky left-0 z-30 px-4 py-3 text-sm font-bold text-center bg-brown-900 text-white uppercase tracking-wide"
                                                        rowSpan={2}
                                                    >
                                                        Disciplina
                                                    </th>
                                                    {bimestresDisponiveis.map((bim) => (
                                                        <th key={bim} colSpan={4} className="px-3 py-3 text-sm font-bold text-center text-white uppercase tracking-wide">
                                                            {bim}º Bimestre
                                                        </th>
                                                    ))}
                                                    <th rowSpan={2} className="px-4 py-3 text-sm font-bold text-center text-accent-gold uppercase tracking-wide bg-brown-900/40 border-l-2 border-accent-gold/30">
                                                        Média Geral
                                                    </th>
                                                </tr>
                                                <tr className="bg-brown-900/20">
                                                    {bimestresDisponiveis.map((bim) => (
                                                        <React.Fragment key={bim}>
                                                            <th className="px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider">Média</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider">Ausências</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider">Comparativo</th>
                                                            <th className="px-3 py-2 text-xs font-semibold text-white uppercase tracking-wider">(%) Frequência</th>
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="text-white font-medium">
                                                {Object.keys(alunoSelecionado.disciplinas).map(nomeDisc => {
                                                    // Calcula a média geral de todos os bimestres disponíveis
                                                    const todasNotas = [];
                                                    bimestresDisponiveis.forEach(bim => {
                                                        const alunoNoBim = dadosBimestres[bim]?.alunos.find(a => a.nome === alunoSelecionado.nome);
                                                        const dadosDisc = alunoNoBim?.disciplinas[nomeDisc];
                                                        if (dadosDisc && dadosDisc.media !== null) {
                                                            todasNotas.push(dadosDisc.media);
                                                        }
                                                    });
                                                    const mediaGeralFinal = todasNotas.length > 0
                                                        ? todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length
                                                        : null;
                                                    const mediaGeralAprovada = mediaGeralFinal && mediaGeralFinal >= 5;

                                                    return (
                                                        <tr key={nomeDisc} className="hover:bg-brown-800/30 transition-colors border-b border-brown-800">
                                                            <td className="sticky left-0 z-10 bg-brown-900 px-4 py-3 text-sm font-bold text-white border-r border-brown-700">{nomeDisc}</td>
                                                            {bimestresDisponiveis.map((bim, index) => {
                                                                const alunoNoBim = dadosBimestres[bim]?.alunos.find(a => a.nome === alunoSelecionado.nome);
                                                                const dadosDisciplina = alunoNoBim?.disciplinas[nomeDisc];
                                                                const estatisticasTurmaBim = dadosBimestres[bim] ? calcularEstatisticasTurma(dadosBimestres[bim], incluirInativos) : null;
                                                                const totalAulasDadas = dadosBimestres[bim]?.infoGeral?.totalAulasDadas || 0;

                                                                if (!dadosDisciplina || dadosDisciplina.media === null) {
                                                                    return (
                                                                        <React.Fragment key={bim}>
                                                                            <td className="px-3 py-3 text-center">-</td>
                                                                            <td className="px-3 py-3 text-center">-</td>
                                                                            <td className="px-3 py-3 text-center">-</td>
                                                                            <td className="px-3 py-3 text-center">-</td>
                                                                        </React.Fragment>
                                                                    );
                                                                }

                                                                const aprovado = dadosDisciplina.media >= 5;
                                                                const mediaTurmaBim = estatisticasTurmaBim?.disciplinas[nomeDisc]?.media || 0;
                                                                const diferenca = dadosDisciplina.media - mediaTurmaBim;
                                                                // Calcula frequencia: (Total - Faltas) / Total. Se total for 0, assume 100%.
                                                                const percentualFrequencia = totalAulasDadas > 0 ? (((totalAulasDadas - dadosDisciplina.faltas) / totalAulasDadas) * 100) : 100;

                                                                return (
                                                                    <React.Fragment key={bim}>
                                                                        <td className={`px-3 py-3 font-bold text-center ${aprovado ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                            {dadosDisciplina.media.toFixed(2)}
                                                                        </td>
                                                                        <td className="px-3 py-3 text-center">{dadosDisciplina.faltas}</td>
                                                                        <td className={`px-3 py-3 font-semibold text-center ${diferenca >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                            {diferenca >= 0 ? '↑' : '↓'} {Math.abs(diferenca).toFixed(2)}
                                                                        </td>
                                                                        <td className={`px-3 py-3 text-center ${percentualFrequencia < 75 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                                                                            {percentualFrequencia.toFixed(1)}%
                                                                        </td>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                            <td className={`px-4 py-3 font-extrabold text-center text-lg bg-brown-900/40 border-l-2 border-accent-gold/30 ${mediaGeralFinal !== null ? (mediaGeralAprovada ? 'text-accent-gold' : 'text-red-400') : ''}`}>
                                                                {mediaGeralFinal !== null ? mediaGeralFinal.toFixed(2) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="detalhamento-table w-max min-w-[1000px] table-fixed border-separate border-spacing-0 rounded-xl overflow-visible text-white">
                                            <colgroup>
                                                <col className="col-disciplina" />
                                                <col className="col-nota" />
                                                <col className="col-faltas" />
                                                <col className="col-comp" />
                                                <col className="col-perc" />
                                                <col className="col-media-geral" />
                                            </colgroup>
                                            <thead className="bg-brown-900/30">
                                                <tr>
                                                    <th className="sticky left-0 z-30 bg-brown-900 text-center px-4 py-3 font-bold text-white uppercase tracking-wide">Disciplina</th>
                                                    <th className="px-3 py-2 text-sm font-bold text-white uppercase tracking-wide">Média</th>
                                                    <th className="px-3 py-2 text-sm font-bold text-white uppercase tracking-wide">Ausências</th>
                                                    <th className="px-3 py-2 text-sm font-bold text-white uppercase tracking-wide">Comparativo</th>
                                                    <th className="px-3 py-2 text-sm font-bold text-white uppercase tracking-wide">(%) Frequência</th>
                                                    <th className="px-4 py-3 text-sm font-bold text-accent-gold uppercase tracking-wide bg-brown-900/40 border-l-2 border-accent-gold/30">Média Geral</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-white font-medium">
                                                {Object.entries(alunoSelecionado.disciplinas).map(([nome, dados]) => {
                                                    if (dados.media === null) return null;

                                                    const mediaTurma = estatisticasTurma?.disciplinas[nome]?.media || 0;
                                                    const diferenca = dados.media - mediaTurma;
                                                    const aprovado = dados.media >= 5;
                                                    const totalAulasDadas = dadosMapao?.infoGeral?.totalAulasDadas || 0;
                                                    // Calcula frequencia
                                                    const percentualFrequencia = totalAulasDadas > 0 ? (((totalAulasDadas - dados.faltas) / totalAulasDadas) * 100) : 100;

                                                    // Para bimestre único, média geral é a própria média
                                                    const mediaGeral = dados.media;
                                                    const mediaGeralAprovada = mediaGeral >= 5;

                                                    return (
                                                        <tr key={nome} className="hover:bg-brown-800/30 transition-colors border-b border-brown-800">
                                                            <td className="sticky left-0 z-10 bg-brown-900 px-4 py-3 text-sm font-bold text-white border-r border-brown-700">{nome}</td>
                                                            <td className={`px-3 py-3 font-bold text-center ${aprovado ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {dados.media.toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-3 text-center">{dados.faltas}</td>
                                                            <td className={`px-3 py-3 font-semibold text-center ${diferenca >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                {diferenca >= 0 ? '↑' : '↓'} {Math.abs(diferenca).toFixed(2)}
                                                            </td>
                                                            <td className={`px-3 py-3 text-center ${percentualFrequencia < 75 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                                                                {percentualFrequencia.toFixed(1)}%
                                                            </td>
                                                            <td className={`px-4 py-3 font-extrabold text-center text-lg bg-brown-900/40 border-l-2 border-accent-gold/30 ${mediaGeralAprovada ? 'text-accent-gold' : 'text-red-400'}`}>
                                                                {mediaGeral.toFixed(2)}
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
                                    onClick={() => irParaAlunoAnterior(true)}
                                    disabled={indiceAlunoSelecionado <= 0}
                                    className="aluno-nav-button px-4 py-2 rounded-lg border border-brown-300 bg-brown-200 text-brown-900 font-bold hover:bg-brown-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    ← Anterior
                                </button>
                                <button
                                    onClick={() => irParaProximoAluno(true)}
                                    disabled={indiceAlunoSelecionado === -1 || indiceAlunoSelecionado >= alunosFiltrados.length - 1}
                                    className="aluno-nav-button px-4 py-2 rounded-lg border border-brown-300 bg-brown-200 text-brown-900 font-bold hover:bg-brown-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    Próximo Aluno →
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
