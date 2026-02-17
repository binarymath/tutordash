import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const GraficoRadarAluno = ({ aluno, dadosBimestres = null, bimestresDisponiveis = null }) => {
    // Se houver múltiplos bimestres, calcular a média
    let alunoParaGrafico = aluno;
    let mostrarBimestres = false;

    if (dadosBimestres && bimestresDisponiveis && bimestresDisponiveis.length > 1) {
        mostrarBimestres = true;

        // Calcula média das notas do aluno em todos os bimestres
        const disciplinasMedia = {};

        bimestresDisponiveis.forEach(bim => {
            const alunoNoBim = dadosBimestres[bim]?.alunos.find(a => a.nome === aluno.nome);
            if (alunoNoBim) {
                Object.entries(alunoNoBim.disciplinas).forEach(([nomeDisc, dados]) => {
                    if (dados.media !== null && dados.media !== undefined) {
                        if (!disciplinasMedia[nomeDisc]) {
                            disciplinasMedia[nomeDisc] = { notas: [], media: 0 };
                        }
                        disciplinasMedia[nomeDisc].notas.push(dados.media);
                    }
                });
            }
        });

        // Calcula a média para cada disciplina
        Object.keys(disciplinasMedia).forEach(disc => {
            const notas = disciplinasMedia[disc].notas;
            disciplinasMedia[disc].media = notas.reduce((a, b) => a + b, 0) / notas.length;
        });

        // Cria objeto com as médias
        alunoParaGrafico = {
            ...aluno,
            disciplinas: Object.entries(disciplinasMedia).reduce((acc, [nomeDisc, dados]) => {
                acc[nomeDisc] = {
                    media: dados.media,
                    bimestres: dados.notas
                };
                return acc;
            }, {})
        };
    }

    // Prepara dados para o radar - mantém nomes mais completos
    const dados = Object.entries(alunoParaGrafico.disciplinas)
        .filter(([_, disc]) => disc.media !== null && disc.media !== undefined)
        .map(([nome, disc]) => {
            // Abreviações específicas para disciplinas longas
            let nomeExibicao = nome;

            if (nome.includes('ORIENTAÇÃO DE ESTUDO')) {
                // Abrevia de forma inteligente
                if (nome.includes('LÍNGUA PORTUGUESA')) {
                    nomeExibicao = 'Orient. Est. - Port.';
                } else if (nome.includes('MATEMÁTICA')) {
                    nomeExibicao = 'Orient. Est. - Mat.';
                } else {
                    nomeExibicao = 'Orientação de Estudo';
                }
            } else if (nome.length > 20) {
                // Para outros nomes longos, pega as primeiras palavras
                const palavras = nome.split(' ');
                nomeExibicao = palavras.slice(0, 3).join(' ');
                if (nomeExibicao.length > 20) {
                    nomeExibicao = nomeExibicao.substring(0, 20) + '...';
                }
            }

            return {
                disciplina: nomeExibicao,
                nomeCompleto: nome,
                nota: parseFloat(disc.media.toFixed(2)),
                bimestres: disc.bimestres
            };
        });

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: '#2C2420',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 1000
                }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#EFEBE9', fontSize: '0.9rem' }}>
                        {data.nomeCompleto}
                    </p>
                    {mostrarBimestres && data.bimestres && (
                        <div style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#D7CCC8' }}>
                            {data.bimestres.map((nota, idx) => (
                                <p key={idx} style={{ margin: '0.2rem 0' }}>
                                    Bim. {idx + 1}: {nota.toFixed(2)}
                                </p>
                            ))}
                        </div>
                    )}
                    <p style={{ margin: '0.25rem 0 0 0', color: '#D7CCC8', fontWeight: '700', fontSize: '1.1rem' }}>
                        {mostrarBimestres ? 'Média: ' : 'Nota: '}{data.nota.toFixed(2)}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Função customizada para renderizar os labels com melhor posicionamento
    const renderCustomAxisTick = ({ payload, x, y, cx, cy, ...rest }) => {
        // Calcula o ângulo baseado na posição
        const angle = Math.atan2(y - cy, x - cx);

        // Aumenta a distância dos labels do centro
        const radius = 20;
        const newX = x + Math.cos(angle) * radius;
        const newY = y + Math.sin(angle) * radius;

        // Determina o alinhamento baseado na posição
        let textAnchor = 'middle';
        if (newX > cx + 10) textAnchor = 'start';
        else if (newX < cx - 10) textAnchor = 'end';

        return (
            <text
                x={newX}
                y={newY}
                textAnchor={textAnchor}
                fill="#D7CCC8"
                fontSize={11}
                fontWeight={600}
            >
                {payload.value}
            </text>
        );
    };

    // Renderiza apenas os ticks nos vértices (valores máximos)
    const renderRadiusAxisTick = ({ payload, x, y, ...rest }) => {
        // Mostra apenas o valor máximo (10)
        if (payload.value === 10 || payload.value === 0) {
            return (
                <text
                    x={x}
                    y={y - 5}
                    textAnchor="middle"
                    fill="#A1887F"
                    fontSize={10}
                    fontWeight={500}
                >
                    {payload.value}
                </text>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={600}>
            <RadarChart
                data={dados}
                margin={{ top: 70, right: 80, bottom: 70, left: 80 }}
            >
                <PolarGrid
                    stroke="#3E2723"
                    strokeWidth={1.5}
                    opacity={0.5}
                />
                <PolarAngleAxis
                    dataKey="disciplina"
                    tick={renderCustomAxisTick}
                />
                <PolarRadiusAxis
                    angle={90}
                    domain={[0, 10]}
                    tick={renderRadiusAxisTick}
                    tickCount={3}
                    axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Radar
                    name={mostrarBimestres ? 'Média dos Bimestres' : 'Nota'}
                    dataKey="nota"
                    stroke="#D7CCC8"
                    fill="#D7CCC8"
                    fillOpacity={0.4}
                    strokeWidth={3}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
};

export default GraficoRadarAluno;
