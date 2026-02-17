import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { DISCIPLINAS } from '../../constants/disciplinas';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from '../Common/Card';

const TabelaConsolidada = () => {
    const { dadosBimestres, bimestresDisponiveis } = useData();
    const [busca, setBusca] = useState('');
    const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('all');

    // Consolida dados de todos os alunos
    const dadosConsolidados = useMemo(() => {
        if (bimestresDisponiveis.length === 0) return [];

        // Pega lista única de alunos (do primeiro bimestre disponível)
        const primeiroBimestre = dadosBimestres[bimestresDisponiveis[0]];
        if (!primeiroBimestre) return [];

        return primeiroBimestre.alunos.map(alunoBase => {
            const consolidado = {
                nome: alunoBase.nome,
                situacao: alunoBase.situacao,
                disciplinas: {}
            };

            // Para cada disciplina
            DISCIPLINAS.forEach(disc => {
                consolidado.disciplinas[disc.nome] = {
                    bimestres: {},
                    mediaGeral: null
                };

                const notas = [];

                // Coleta notas de cada bimestre
                bimestresDisponiveis.forEach(bim => {
                    const aluno = dadosBimestres[bim]?.alunos.find(a => a.nome === alunoBase.nome);
                    const nota = aluno?.disciplinas[disc.nome]?.media;

                    consolidado.disciplinas[disc.nome].bimestres[bim] = nota || null;

                    if (nota !== null && !isNaN(nota)) {
                        notas.push(nota);
                    }
                });

                // Calcula média geral
                if (notas.length > 0) {
                    consolidado.disciplinas[disc.nome].mediaGeral =
                        notas.reduce((acc, n) => acc + n, 0) / notas.length;
                }
            });

            // Calcula média geral do aluno (todas as disciplinas)
            const todasNotas = Object.values(consolidado.disciplinas)
                .map(d => d.mediaGeral)
                .filter(n => n !== null);

            consolidado.mediaGeralAluno = todasNotas.length > 0
                ? todasNotas.reduce((acc, n) => acc + n, 0) / todasNotas.length
                : null;

            return consolidado;
        });
    }, [dadosBimestres, bimestresDisponiveis]);

    // Filtra alunos pela busca
    const alunosFiltrados = useMemo(() => {
        if (!busca) return dadosConsolidados;
        return dadosConsolidados.filter(aluno =>
            aluno.nome.toLowerCase().includes(busca.toLowerCase())
        );
    }, [dadosConsolidados, busca]);

    if (bimestresDisponiveis.length === 0) {
        return (
            <Card className="text-center border-dashed border-brown-700 bg-brown-900/20">
                <p className="text-brown-300">Carregue pelo menos um bimestre para ver a análise consolidada</p>
            </Card>
        );
    }

    const getTendencia = (bimestres) => {
        const notasValidas = bimestresDisponiveis
            .map(bim => bimestres[bim])
            .filter(n => n !== null);

        if (notasValidas.length < 2) return null;

        const primeira = notasValidas[0];
        const ultima = notasValidas[notasValidas.length - 1];

        if (ultima > primeira + 0.5) return 'up';
        if (ultima < primeira - 0.5) return 'down';
        return 'stable';
    };

    const disciplinasParaMostrar = disciplinaSelecionada === 'all'
        ? DISCIPLINAS
        : DISCIPLINAS.filter(d => d.nome === disciplinaSelecionada);

    return (
        <div className="w-full max-w-[1700px] mx-auto p-2 md:p-6 text-brown-100">
            <Card className="mb-6 bg-gradient-to-br from-brown-900 to-brown-800 border-brown-700">
                <h1 className="text-2xl md:text-3xl font-bold text-brown-50">📊 Análise Consolidada por Bimestre</h1>
                <p className="text-brown-200 mt-2">Visualização completa das notas de todos os alunos ao longo dos bimestres</p>
            </Card>

            <div className="mt-6 flex flex-col lg:flex-row gap-4">
                <div className="flex items-center gap-3 w-full lg:w-2/3 rounded-xl border border-brown-700 bg-brown-900/40 px-4 py-3 shadow-sm focus-within:border-brown-500 focus-within:ring-1 focus-within:ring-brown-500 transition-all">
                    <Search size={18} className="text-brown-400" />
                    <input
                        type="text"
                        placeholder="Buscar aluno..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full bg-transparent text-brown-100 placeholder:text-brown-500 focus:outline-none"
                    />
                </div>

                <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full lg:w-1/3 rounded-xl border border-brown-700 bg-brown-900/40 px-4 py-3 text-brown-100 focus:outline-none focus:border-brown-500 focus:ring-1 focus:ring-brown-500"
                >
                    <option value="all" className="bg-brown-900">Todas as Disciplinas</option>
                    {DISCIPLINAS.map(disc => (
                        <option key={disc.nome} value={disc.nome} className="bg-brown-900">{disc.nome}</option>
                    ))}
                </select>
            </div>

            {disciplinasParaMostrar.map(disciplina => (
                <Card key={disciplina.nome} className="mt-8 border-brown-700 bg-brown-900/30">
                    <h2 className="text-xl font-semibold text-brown-100 mb-4 border-b border-brown-800 pb-2">{disciplina.nome}</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="text-left px-3 py-3 bg-brown-900/50 text-brown-200 font-medium rounded-l-lg">Aluno</th>
                                    {bimestresDisponiveis.map(bim => (
                                        <th key={bim} className="text-left px-3 py-3 bg-brown-900/50 text-brown-200 font-medium">{bim}º Bim</th>
                                    ))}
                                    <th className="text-left px-3 py-3 bg-brown-900/50 text-brown-200 font-medium">Média Geral</th>
                                    <th className="text-left px-3 py-3 bg-brown-900/50 text-brown-200 font-medium rounded-r-lg">Tendência</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brown-800/30">
                                {alunosFiltrados.map((aluno, idx) => {
                                    const dadosDisc = aluno.disciplinas[disciplina.nome];
                                    const tendencia = getTendencia(dadosDisc.bimestres);

                                    return (
                                        <tr key={idx} className="hover:bg-brown-800/20 transition-colors">
                                            <td className="px-3 py-3 font-medium text-brown-100">
                                                <div className="flex items-center gap-2">
                                                    <span>{aluno.nome}</span>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${aluno.situacao.toLowerCase() === 'ativo'
                                                        ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                                                        : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}>
                                                        {aluno.situacao}
                                                    </span>
                                                </div>
                                            </td>
                                            {bimestresDisponiveis.map(bim => {
                                                const nota = dadosDisc.bimestres[bim];
                                                // Cor da nota
                                                let corTexto = 'text-brown-500'; // N/A
                                                if (nota !== null) {
                                                    if (nota >= 7) corTexto = 'text-accent-green font-bold';
                                                    else if (nota >= 5) corTexto = 'text-accent-gold font-bold';
                                                    else corTexto = 'text-accent-red font-bold';
                                                }

                                                return (
                                                    <td key={bim} className={`px-3 py-3 ${corTexto}`}>
                                                        {nota !== null ? nota.toFixed(1) : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className={`px-3 py-3 font-bold ${dadosDisc.mediaGeral >= 5 ? 'text-accent-green' : 'text-accent-red'}`}>
                                                {dadosDisc.mediaGeral !== null ? dadosDisc.mediaGeral.toFixed(2) : '-'}
                                            </td>
                                            <td className="px-3 py-3">
                                                {tendencia === 'up' && <TrendingUp size={18} className="text-accent-green" />}
                                                {tendencia === 'down' && <TrendingDown size={18} className="text-accent-red" />}
                                                {tendencia === 'stable' && <Minus size={18} className="text-brown-400" />}
                                                {tendencia === null && <span className="text-brown-600">-</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default TabelaConsolidada;
