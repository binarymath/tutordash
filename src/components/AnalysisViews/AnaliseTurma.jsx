import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { calcularEstatisticasTurma } from '../../services/mapaoService';
import { Users, TrendingUp, Award, AlertTriangle, BarChart3 } from 'lucide-react';
import GraficoDisciplinas from '../Charts/GraficoDisciplinas';
import GraficoBimestres from '../Charts/GraficoBimestres';
import Card from '../Common/Card';

const AnaliseTurma = () => {
    const { dadosMapao, incluirInativos, dadosBimestres, bimestresDisponiveis } = useData();

    const estatisticas = useMemo(() => {
        if (!dadosMapao) return null;
        return calcularEstatisticasTurma(dadosMapao, incluirInativos);
    }, [dadosMapao, incluirInativos]);

    // Calcula estatísticas para todos os bimestres
    const estatisticasPorBimestre = useMemo(() => {
        const stats = {};
        bimestresDisponiveis.forEach(bim => {
            if (dadosBimestres[bim]) {
                stats[bim] = calcularEstatisticasTurma(dadosBimestres[bim], incluirInativos);
            }
        });
        return stats;
    }, [dadosBimestres, bimestresDisponiveis, incluirInativos]);

    if (!dadosMapao || !estatisticas) {
        return (
            <Card className="max-w-xl mx-auto text-center border-dashed border-brown-700 bg-brown-900/20">
                <p className="text-brown-300">Carregue um arquivo do Mapão para ver a análise</p>
            </Card>
        );
    }

    const { infoGeral } = dadosMapao;

    // Calcula totais unificados considerando todos os bimestres e o último status de cada aluno
    const { totalAlunos, totalAtivos, totalTransferidos, totalRemanejados } = useMemo(() => {
        if (!bimestresDisponiveis.length) {
            // Fallback para dadosMapao se não houver bimestres específicos carregados (caso raro se dadosMapao existe)
            return {
                totalAlunos: dadosMapao?.totalAlunos || 0,
                totalAtivos: dadosMapao?.totalAtivos || 0,
                totalTransferidos: dadosMapao?.totalTransferidos || 0,
                totalRemanejados: dadosMapao?.totalRemanejados || 0
            };
        }

        const alunosMap = new Map();

        // Ordena os bimestres para processar em ordem cronológica (1 -> 4)
        // Isso garante que o status do último bimestre carregado seja o considerado
        const bimestresOrdenados = [...bimestresDisponiveis].sort((a, b) => a - b);

        bimestresOrdenados.forEach(bim => {
            const dados = dadosBimestres[bim];
            if (!dados) return;

            dados.alunos.forEach(aluno => {
                // Mapeia cada aluno pelo nome, atualizando o status conforme avança os bimestres
                alunosMap.set(aluno.nome, aluno.situacao);
            });
        });

        let tAtivos = 0;
        let tTransferidos = 0;
        let tRemanejados = 0;

        alunosMap.forEach(status => {
            if (status === 'Ativo') tAtivos++;
            else if (status === 'Transferido') tTransferidos++;
            else if (status === 'Remanejamento') tRemanejados++;
        });

        return {
            totalAlunos: alunosMap.size,
            totalAtivos: tAtivos,
            totalTransferidos: tTransferidos,
            totalRemanejados: tRemanejados
        };
    }, [bimestresDisponiveis, dadosBimestres, dadosMapao]);
    const { disciplinas, mediaGeralTurma } = estatisticas;

    // Encontra melhor e pior disciplina
    const disciplinasArray = Object.entries(disciplinas).map(([nome, stats]) => ({
        nome,
        ...stats
    }));

    const melhorDisciplina = disciplinasArray.reduce((prev, current) =>
        (prev.media > current.media) ? prev : current
    );

    const piorDisciplina = disciplinasArray.reduce((prev, current) =>
        (prev.media < current.media) ? prev : current
    );

    return (
        <div className="max-w-[1500px] mx-auto space-y-8">
            {/* Cabeçalho com informações da turma */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brown-800 via-brown-700 to-brown-900 text-white shadow-2xl p-8 border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Users size={180} />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2">{infoGeral.turma}</h1>
                <div className="flex flex-wrap gap-4 text-brown-100 font-medium">
                    <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">{infoGeral.escola}</span>
                    <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">{infoGeral.tipoFechamento}</span>
                </div>
            </div>

            {/* Cards de visão geral */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <Card className="flex items-center gap-5 group">
                    <div className="p-3 rounded-xl bg-brown-800/50 text-brown-200 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/5">
                        <Users size={32} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-brown-300 uppercase tracking-wider">Total de Alunos</h3>
                        <p className="text-3xl font-bold text-white">{totalAlunos}</p>
                        <div className="mt-1 flex flex-col text-xs font-semibold gap-0.5">
                            <span className="text-accent-green">✓ {totalAtivos} Ativos</span>
                            <span className="text-accent-gold">→ {totalTransferidos} Transferidos</span>
                            <span className="text-accent-red">✕ {totalRemanejados} Remanejados</span>
                        </div>
                    </div>
                </Card>

                <Card className="flex items-center gap-5 group">
                    <div className="p-3 rounded-xl bg-emerald-900/30 text-accent-green group-hover:scale-110 transition-transform duration-300 ring-1 ring-accent-green/20">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-brown-300 uppercase tracking-wider">Média Geral</h3>
                        <p className={`text-3xl font-bold ${mediaGeralTurma >= 7 ? 'text-accent-green' : mediaGeralTurma >= 5 ? 'text-accent-gold' : 'text-accent-red'}`}>
                            {mediaGeralTurma.toFixed(2)}
                        </p>
                        <div className="text-xs font-medium text-brown-400 mt-1">
                            {mediaGeralTurma >= 7 ? 'Desempenho Bom' : mediaGeralTurma >= 5 ? 'Desempenho Regular' : 'Atenção Necessária'}
                        </div>
                    </div>
                </Card>

                <Card className="flex items-center gap-5 group">
                    <div className="p-3 rounded-xl bg-blue-900/30 text-accent-blue group-hover:scale-110 transition-transform duration-300 ring-1 ring-accent-blue/20">
                        <Award size={32} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-brown-300 uppercase tracking-wider">Destaque</h3>
                        <p className="text-xs text-brown-200 truncate max-w-[150px]" title={melhorDisciplina.nome}>{melhorDisciplina.nome}</p>
                        <p className="text-3xl font-bold text-white">{melhorDisciplina.media.toFixed(2)}</p>
                        <div className="text-xs font-medium text-white">{melhorDisciplina.taxaAprovacao}% de aprovação</div>
                    </div>
                </Card>

                <Card className="flex items-center gap-5 group">
                    <div className="p-3 rounded-xl bg-red-900/30 text-accent-red group-hover:scale-110 transition-transform duration-300 ring-1 ring-accent-red/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-brown-300 uppercase tracking-wider">Atenção</h3>
                        <p className="text-xs text-brown-200 truncate max-w-[150px]" title={piorDisciplina.nome}>{piorDisciplina.nome}</p>
                        <p className="text-3xl font-bold text-white">{piorDisciplina.media.toFixed(2)}</p>
                        <div className="text-xs font-medium text-brown-400">{piorDisciplina.reprovados} abaixo da média</div>
                    </div>
                </Card>
            </div>

            {/* Gráfico de desempenho por disciplina */}
            <Card>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-brown-800/50 text-accent-gold"><BarChart3 size={20} /></span>
                    Desempenho por Disciplina
                </h2>
                <GraficoDisciplinas
                    disciplinas={disciplinasArray}
                    totalAtivos={totalAtivos}
                    totalTransferidos={totalTransferidos}
                    totalRemanejados={totalRemanejados}
                    bimestresDisponiveis={bimestresDisponiveis}
                    estatisticasPorBimestre={estatisticasPorBimestre}
                />
            </Card>

            {/* Tabela de evolução por bimestre */}
            {bimestresDisponiveis.length > 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <GraficoBimestres
                            bimestresDisponiveis={bimestresDisponiveis}
                            estatisticasPorBimestre={estatisticasPorBimestre}
                        />
                    </Card>

                    <Card>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="p-2 rounded-lg bg-brown-800/50 text-accent-gold"><TrendingUp size={20} /></span>
                            Evolução Geral
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-white uppercase bg-brown-900/30">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Bimestre</th>
                                        <th className="px-4 py-3">Média</th>
                                        <th className="px-4 py-3">Mediana</th>
                                        <th className="px-4 py-3 rounded-r-lg">Aprovação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brown-800/30">
                                    {bimestresDisponiveis.map(bim => {
                                        const stats = estatisticasPorBimestre[bim];
                                        if (!stats) return null;

                                        const disciplinasArray = Object.values(stats.disciplinas);
                                        const mediaGeral = disciplinasArray.reduce((acc, d) => acc + d.media, 0) / disciplinasArray.length;
                                        const medianaGeral = disciplinasArray.reduce((acc, d) => acc + d.mediana, 0) / disciplinasArray.length;
                                        const aprovacaoGeral = disciplinasArray.reduce((acc, d) => acc + d.taxaAprovacao, 0) / disciplinasArray.length;

                                        return (
                                            <tr key={bim} className="hover:bg-brown-800/20 transition-colors">
                                                <td className="px-4 py-4 font-medium text-white">{bim}º Bimestre</td>
                                                <td className={`px-4 py-4 font-bold ${mediaGeral >= 7 ? 'text-accent-green' : mediaGeral >= 5 ? 'text-accent-gold' : 'text-accent-red'}`}>
                                                    {mediaGeral.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-white show-hover">{medianaGeral.toFixed(2)}</td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-brown-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-accent-blue" style={{ width: `${aprovacaoGeral}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-white">{aprovacaoGeral.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tabela detalhada de disciplinas */}
            <Card>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-brown-800/50 text-accent-gold"><Award size={20} /></span>
                    Estatísticas Detalhadas
                </h2>
                <div className="overflow-x-auto -mx-6 md:mx-0">
                    <div className="min-w-full inline-block align-middle p-1">
                        {bimestresDisponiveis.length > 1 ? (
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th rowSpan="2" className="px-4 py-3 bg-brown-900/50 text-white font-semibold rounded-tl-lg sticky left-0 z-10 backdrop-blur-md">Disciplina</th>
                                        {bimestresDisponiveis.map(bim => (
                                            <th key={bim} colSpan="5" className="text-center px-4 py-2 text-white text-xs uppercase bg-brown-900/30 border-b border-brown-800">
                                                {bim}º Bimestre
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        {bimestresDisponiveis.map(bim => (
                                            <React.Fragment key={bim}>
                                                <th className="px-3 py-2 text-xs font-medium text-white bg-brown-900/20">Média</th>
                                                <th className="px-3 py-2 text-xs font-medium text-white bg-brown-900/20">Mediana</th>
                                                <th className="px-3 py-2 text-xs font-medium text-white bg-brown-900/20">Moda</th>
                                                <th className="px-3 py-2 text-xs font-medium text-white bg-brown-900/20">Desvio</th>
                                                <th className="px-3 py-2 text-xs font-medium text-white bg-brown-900/20">Aprovação</th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brown-800/30">
                                    {disciplinasArray.map(disc => (
                                        <tr key={disc.nome} className="hover:bg-brown-800/20 transition-colors group">
                                            <td className="px-4 py-3 font-semibold text-white bg-surface-card sticky left-0 z-10 group-hover:bg-brown-800/20 transition-colors border-r border-brown-800/50">{disc.nome}</td>
                                            {bimestresDisponiveis.map(bim => {
                                                const stats = estatisticasPorBimestre[bim];
                                                const discData = stats?.disciplinas[disc.nome];
                                                if (!discData) {
                                                    return (
                                                        <React.Fragment key={bim}>
                                                            <td className="px-3 py-3 text-brown-600">-</td>
                                                            <td className="px-3 py-3 text-brown-600">-</td>
                                                            <td className="px-3 py-3 text-brown-600">-</td>
                                                            <td className="px-3 py-3 text-brown-600">-</td>
                                                            <td className="px-3 py-3 text-brown-600">-</td>
                                                        </React.Fragment>
                                                    );
                                                }
                                                return (
                                                    <React.Fragment key={bim}>
                                                        <td className={`px-3 py-3 font-bold ${discData.media >= 7 ? 'text-accent-green' : discData.media >= 5 ? 'text-accent-gold' : 'text-accent-red'}`}>
                                                            {discData.media.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-3 text-white">{discData.mediana.toFixed(2)}</td>
                                                        <td className="px-3 py-3 text-white text-xs">{discData.moda}</td>
                                                        <td className="px-3 py-3 text-white text-xs">{discData.desvioPadrao.toFixed(2)}</td>
                                                        <td className="px-3 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${discData.taxaAprovacao >= 70 ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                {discData.taxaAprovacao.toFixed(0)}%
                                                            </span>
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-white uppercase bg-brown-900/30">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Disciplina</th>
                                        <th className="px-4 py-3">Média</th>
                                        <th className="px-4 py-3">Mediana</th>
                                        <th className="px-4 py-3">Moda</th>
                                        <th className="px-4 py-3">Desvio Padrão</th>
                                        <th className="px-4 py-3 rounded-r-lg">Aprovação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brown-800/30">
                                    {disciplinasArray
                                        .sort((a, b) => b.media - a.media)
                                        .map((disc) => (
                                            <tr key={disc.nome} className="hover:bg-brown-800/20 transition-colors">
                                                <td className="px-4 py-4 font-semibold text-white">{disc.nome}</td>
                                                <td className={`px-4 py-4 font-bold ${disc.media >= 7 ? 'text-accent-green' : disc.media >= 5 ? 'text-accent-gold' : 'text-accent-red'}`}>
                                                    {disc.media.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-4 text-white">{disc.mediana.toFixed(2)}</td>
                                                <td className="px-4 py-4 text-white">{disc.moda}</td>
                                                <td className="px-4 py-4 text-white">{disc.desvioPadrao.toFixed(2)}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-1.5 bg-brown-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${disc.taxaAprovacao >= 70 ? 'bg-accent-green' : 'bg-accent-red'}`}
                                                                style={{ width: `${disc.taxaAprovacao}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-white">{disc.taxaAprovacao}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AnaliseTurma;
