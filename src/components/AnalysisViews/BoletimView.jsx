import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Search, BookOpen, GraduationCap } from 'lucide-react';
import Card from '../Common/Card';

const BoletimView = () => {
    const { dadosBimestres, bimestresDisponiveis, incluirInativos, turmaSelecionada } = useData();
    const [termoBusca, setTermoBusca] = useState('');
    const [filtroDisciplina, setFiltroDisciplina] = useState('todas');

    // Consolidar dados dos alunos de todos os bimestres
    const dadosConsolidados = useMemo(() => {
        const alunosMap = new Map();
        const disciplinasSet = new Set();

        // Ordena os bimestres para garantir que o status mais recente seja o último
        const bimsOrdenados = [...bimestresDisponiveis].sort((a, b) => a - b);

        bimsOrdenados.forEach(bim => {
            const dados = dadosBimestres[bim];
            if (!dados) return;

            dados.alunos.forEach(aluno => {
                const nomeNormalizado = aluno.nome.trim();

                if (!alunosMap.has(nomeNormalizado)) {
                    alunosMap.set(nomeNormalizado, {
                        nome: aluno.nome,
                        situacao: aluno.situacao, // Será atualizado pelo último bimestre
                        isAtivo: aluno.isAtivo,
                        bimestres: {}
                    });
                }

                const registroAluno = alunosMap.get(nomeNormalizado);

                // Atualiza status com o do bimestre atual (assumindo ordem cronológica)
                registroAluno.situacao = aluno.situacao;
                registroAluno.isAtivo = aluno.isAtivo;

                // Armazena dados deste bimestre
                registroAluno.bimestres[bim] = aluno.disciplinas;

                // Coletar todas as disciplinas encontradas
                Object.keys(aluno.disciplinas).forEach(d => disciplinasSet.add(d));
            });
        });

        // Converter Map para Array e ordenar por nome
        const listaAlunos = Array.from(alunosMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
        const listaDisciplinas = Array.from(disciplinasSet).sort();

        return { alunos: listaAlunos, disciplinas: listaDisciplinas };
    }, [dadosBimestres, bimestresDisponiveis]);

    // Filtragem
    const alunosFiltrados = useMemo(() => {
        return dadosConsolidados.alunos.filter(aluno => {
            // Filtro de Status Global (incluirInativos: true = Todos, false = Apenas Ativos)
            if (!incluirInativos && !aluno.isAtivo) return false;

            // Filtro de Busca
            if (termoBusca) {
                const termo = termoBusca.toLowerCase();
                return aluno.nome.toLowerCase().includes(termo);
            }

            return true;
        });
    }, [dadosConsolidados, termoBusca, incluirInativos]);

    // Disciplinas a exibir
    const disciplinasExibidas = useMemo(() => {
        if (filtroDisciplina === 'todas') return dadosConsolidados.disciplinas;
        return [filtroDisciplina];
    }, [filtroDisciplina, dadosConsolidados]);

    // Função auxiliar para renderizar célula de nota/falta
    const renderCelulaBimestre = (aluno, disciplina, bim) => {
        const dadosBim = aluno.bimestres[bim];
        if (!dadosBim || !dadosBim[disciplina]) return <td key={bim} className="p-3 text-center text-brown-400">-</td>;

        const { media, faltas } = dadosBim[disciplina];
        const mediaFormatada = media !== null ? media.toFixed(1) : '-';

        // Cores da nota
        let corNota = 'text-white';
        if (media !== null) {
            if (media >= 7) corNota = 'text-accent-green';
            else if (media >= 5) corNota = 'text-accent-gold';
            else corNota = 'text-accent-red';
        }

        return (
            <td key={bim} className="p-2 border-r border-brown-800/30 align-middle">
                <div className="flex flex-col items-center justify-center">
                    <span className={`font-bold text-lg ${corNota}`}>{mediaFormatada}</span>
                    <span className="text-xs text-brown-400 whitespace-nowrap bg-brown-900/40 px-1.5 py-0.5 rounded mt-1">
                        (Faltas: {faltas})
                    </span>
                </div>
            </td>
        );
    };

    // Calcular totais e médias finais
    const calcularFinais = (aluno, disciplina) => {
        let somaNotas = 0;
        let contNotas = 0;
        let totalFaltas = 0;

        // Estimativa para cálculo de %, assumindo 50 aulas anuais por matéria se não houver dado real
        // Ajuste conforme realidade escolar (ex: 200 dias letivos, X aulas/semana)
        // Aqui é apenas ilustrativo para preencher a coluna solicitada
        const aulasPorBimestreEstimadas = 20;

        bimestresDisponiveis.forEach(bim => {
            const dados = aluno.bimestres[bim]?.[disciplina];
            if (dados) {
                if (dados.media !== null && !isNaN(dados.media)) {
                    somaNotas += dados.media;
                    contNotas++;
                }
                totalFaltas += (dados.faltas || 0);
            }
        });

        const mediaFinal = contNotas > 0 ? (somaNotas / contNotas).toFixed(1) : '-';

        // Calculo de % Frequência
        // Usando o número de bimestres carregados para estimar o total de aulas até o momento
        const totalAulasAteAgora = bimestresDisponiveis.length * aulasPorBimestreEstimadas;
        let freqPorcentagem = 100;

        if (totalAulasAteAgora > 0) {
            freqPorcentagem = ((totalAulasAteAgora - totalFaltas) / totalAulasAteAgora) * 100;
        }

        // Limites
        if (freqPorcentagem > 100) freqPorcentagem = 100;
        if (freqPorcentagem < 0) freqPorcentagem = 0;

        return { mediaFinal, totalFaltas, freqPorcentagem: freqPorcentagem.toFixed(0) };
    };

    return (
        <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header e Filtros */}
            <Card className="bg-gradient-to-r from-brown-900 to-brown-800 border-accent-gold/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                            <BookOpen className="text-accent-gold" size={32} />
                            Boletim Escolar - {turmaSelecionada || 'Turma Desconhecida'}
                        </h1>
                        <p className="text-brown-300 mt-1">
                            Análise consolidada de {alunosFiltrados.length} alunos em {bimestresDisponiveis.length} bimestres
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar aluno..."
                                value={termoBusca}
                                onChange={(e) => setTermoBusca(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-brown-950/50 border border-brown-700 rounded-lg text-white focus:ring-2 focus:ring-accent-gold/50 outline-none w-full sm:w-64"
                            />
                        </div>

                        <div className="relative">
                            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400" size={18} />
                            <select
                                value={filtroDisciplina}
                                onChange={(e) => setFiltroDisciplina(e.target.value)}
                                className="pl-10 pr-8 py-2 bg-brown-950/50 border border-brown-700 rounded-lg text-white appearance-none focus:ring-2 focus:ring-accent-gold/50 outline-none cursor-pointer hover:bg-brown-900/50 max-w-[200px]"
                            >
                                <option value="todas">Todas as Disciplinas</option>
                                {dadosConsolidados.disciplinas.map(disc => (
                                    <option key={disc} value={disc}>{disc}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Lista de Boletins */}
            <div className="space-y-6 animate-fade-in">
                {alunosFiltrados.map(aluno => (
                    <Card key={aluno.nome} className="overflow-hidden shadow-lg border-brown-700/50">
                        {/* Cabeçalho do Aluno */}
                        <div className="sticky top-0 z-20 bg-brown-900/95 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 border-b border-brown-800/50 pb-4 mb-4 pt-4 -mt-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 ${aluno.isAtivo ? 'bg-accent-green/20 border-accent-green text-accent-green' : 'bg-brown-700 border-brown-600 text-brown-400'}`}>
                                    {aluno.nome.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">{aluno.nome}</h2>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${aluno.isAtivo ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
                                        {aluno.situacao}
                                    </span>
                                </div>
                            </div>

                            {/* Resumo Rápido */}
                            <div className="flex gap-4 text-sm text-brown-300">
                                {/* Pode adicionar resumo aqui se quiser */}
                            </div>
                        </div>

                        {/* Tabela de Notas */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 bg-brown-900/40 text-brown-200 font-semibold rounded-l-lg w-1/4">Disciplina</th>
                                        {bimestresDisponiveis.map(bim => (
                                            <th key={bim} className="px-4 py-3 bg-brown-900/40 text-brown-200 font-semibold text-center">
                                                {bim}º Bim
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 bg-brown-900/40 text-brown-200 font-semibold text-center">Média Final</th>
                                        <th className="px-4 py-3 bg-brown-900/40 text-brown-200 font-semibold text-center">Faltas</th>
                                        <th className="px-4 py-3 bg-brown-900/40 text-brown-200 font-semibold text-center rounded-r-lg">% Frequência</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brown-800/30">
                                    {disciplinasExibidas.map(disc => {
                                        const { mediaFinal, totalFaltas, freqPorcentagem } = calcularFinais(aluno, disc);

                                        return (
                                            <tr key={disc} className="hover:bg-brown-800/10 transition-colors">
                                                <td className="px-4 py-3 font-medium text-brown-100 border-r border-brown-800/30">
                                                    {disc}
                                                </td>
                                                {bimestresDisponiveis.map(bim => renderCelulaBimestre(aluno, disc, bim))}

                                                {/* Média Final */}
                                                <td className="px-4 py-3 text-center border-r border-brown-800/30">
                                                    <span className={`font-bold text-lg ${mediaFinal !== '-' ? (parseFloat(mediaFinal) >= 7 ? 'text-accent-green' : parseFloat(mediaFinal) >= 5 ? 'text-accent-gold' : 'text-accent-red') : 'text-brown-500'
                                                        }`}>
                                                        {mediaFinal}
                                                    </span>
                                                </td>

                                                {/* Total Faltas */}
                                                <td className="px-4 py-3 text-center text-white font-medium border-r border-brown-800/30">
                                                    {totalFaltas}
                                                </td>

                                                {/* % Frequência */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-bold ${parseFloat(freqPorcentagem) >= 75 ? 'text-accent-blue' : 'text-accent-red'}`}>
                                                        {freqPorcentagem}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ))}

                {alunosFiltrados.length === 0 && (
                    <div className="text-center py-12 text-brown-400">
                        <p className="text-lg">Nenhum aluno encontrado com os filtros selecionados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BoletimView;
