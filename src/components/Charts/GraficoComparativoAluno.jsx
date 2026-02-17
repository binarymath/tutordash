import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GraficoComparativoAluno = ({ aluno, mediaTurma, dadosBimestres, bimestresDisponiveis }) => {
    if (!mediaTurma) return null;

    // Função para dividir nomes compostos em duas linhas
    const formatarNomeDisciplina = (nome) => {
        if (nome.length <= 15) return nome;
        
        // Tenta dividir por espaço próximo ao meio
        const meio = Math.floor(nome.length / 2);
        let posicaoQuebra = nome.indexOf(' ', meio);
        
        if (posicaoQuebra === -1 || posicaoQuebra > nome.length - 5) {
            posicaoQuebra = nome.lastIndexOf(' ', meio);
        }
        
        if (posicaoQuebra === -1) {
            return nome.substring(0, 15) + '...';
        }
        
        return nome.substring(0, posicaoQuebra) + '\n' + nome.substring(posicaoQuebra + 1);
    };

    // Prepara dados comparativos
    const dados = Object.entries(aluno.disciplinas)
        .filter(([nome, disc]) => disc.media !== null && mediaTurma[nome])
        .map(([nome, disc]) => ({
            disciplina: formatarNomeDisciplina(nome),
            nomeCompleto: nome,
            aluno: disc.media,
            turma: mediaTurma[nome].media
        }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const diferenca = data.aluno - data.turma;
            const nomeDisciplina = data.nomeCompleto;

            // Coletar notas de todos os bimestres
            const notasPorBimestre = [];
            const mediasTurmaPorBimestre = [];

            if (dadosBimestres && bimestresDisponiveis) {
                bimestresDisponiveis.sort().forEach(bimestre => {
                    const dadosBim = dadosBimestres[bimestre];
                    if (dadosBim) {
                        // Buscar aluno no bimestre
                        const alunoNoBim = dadosBim.alunos.find(a => a.nome === aluno.nome);
                        if (alunoNoBim && alunoNoBim.disciplinas[nomeDisciplina]) {
                            const notaBim = alunoNoBim.disciplinas[nomeDisciplina].media;
                            notasPorBimestre.push({ bimestre, nota: notaBim });
                        }

                        // Buscar média da turma no bimestre para essa disciplina
                        // Considera apenas alunos ativos
                        const alunosAtivos = dadosBim.alunos.filter(a => a.isAtivo);
                        const notasDisciplina = alunosAtivos
                            .map(a => a.disciplinas[nomeDisciplina]?.media)
                            .filter(n => n !== null && n !== undefined);
                        
                        if (notasDisciplina.length > 0) {
                            const mediaTurmaBim = notasDisciplina.reduce((sum, n) => sum + n, 0) / notasDisciplina.length;
                            mediasTurmaPorBimestre.push({ bimestre, media: mediaTurmaBim });
                        }
                    }
                });
            }

            return (
                <div style={{
                    background: '#2C2420',
                    padding: '1rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    minWidth: '250px'
                }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: 'bold', color: '#EFEBE9', fontSize: '14px' }}>
                        {nomeDisciplina}
                    </p>

                    {/* Notas por Bimestre */}
                    {notasPorBimestre.length > 0 && (
                        <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #3E2723' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '12px', color: '#A1887F', fontWeight: '600' }}>
                                Notas por Bimestre:
                            </p>
                            {notasPorBimestre.map(({ bimestre, nota }) => (
                                <div key={bimestre} style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0', fontSize: '12px' }}>
                                    <span style={{ color: '#D7CCC8' }}>{bimestre}º Bim:</span>
                                    <span style={{ color: '#EFEBE9', fontWeight: '600' }}>{nota?.toFixed(2) || 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Médias Finais */}
                    <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}>
                            <span style={{ color: '#A1887F', fontSize: '13px' }}>Média do Aluno:</span>
                            <span style={{ color: '#D7CCC8', fontWeight: 'bold', fontSize: '13px' }}>{data.aluno.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}>
                            <span style={{ color: '#A1887F', fontSize: '13px' }}>Média da Turma:</span>
                            <span style={{ color: '#66BB6A', fontWeight: 'bold', fontSize: '13px' }}>{data.turma.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Diferença */}
                    <p style={{
                        margin: '0.5rem 0 0 0',
                        color: diferenca >= 0 ? '#66BB6A' : '#EF5350',
                        fontWeight: 'bold',
                        borderTop: '1px solid #3E2723',
                        paddingTop: '0.5rem',
                        fontSize: '13px',
                        textAlign: 'center'
                    }}>
                        {diferenca >= 0 ? '↑' : '↓'} {Math.abs(diferenca).toFixed(2)} pontos
                        {diferenca >= 0 ? ' acima' : ' abaixo'} da média
                    </p>
                </div>
            );
        }
        return null;
    };

    // Custom tick component para quebra de linha
    const CustomXAxisTick = ({ x, y, payload }) => {
        const lines = payload.value.split('\n');
        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="end"
                    fill="#D7CCC8"
                    transform="rotate(-45)"
                    fontSize={11}
                >
                    {lines.map((line, index) => (
                        <tspan x={0} dy={index === 0 ? 0 : 12} key={index}>
                            {line}
                        </tspan>
                    ))}
                </text>
            </g>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={dados}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#3E2723" opacity={0.5} />
                <XAxis
                    dataKey="disciplina"
                    height={120}
                    tick={<CustomXAxisTick />}
                    interval={0}
                    axisLine={{ stroke: '#5D4037' }}
                    tickLine={{ stroke: '#5D4037' }}
                />
                <YAxis
                    domain={[0, 10]}
                    tick={{ fill: '#D7CCC8' }}
                    axisLine={{ stroke: '#5D4037' }}
                    tickLine={{ stroke: '#5D4037' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3E2723', opacity: 0.2 }} />
                <Legend
                    wrapperStyle={{ paddingTop: '10px', color: '#D7CCC8' }}
                    iconType="circle"
                />
                <Bar
                    dataKey="aluno"
                    name="Nota do Aluno"
                    fill="#D7CCC8"
                    radius={[6, 6, 0, 0]}
                />
                <Bar
                    dataKey="turma"
                    name="Média da Turma"
                    fill="#66BB6A"
                    radius={[6, 6, 0, 0]}
                    fillOpacity={0.8}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default GraficoComparativoAluno;
