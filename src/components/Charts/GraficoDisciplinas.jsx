import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { CONFIG } from '../../constants/disciplinas';

const GraficoDisciplinas = ({ disciplinas, totalAtivos = 0, totalTransferidos = 0, totalRemanejados = 0, bimestresDisponiveis = null, estatisticasPorBimestre = null }) => {
    // Se houver múltiplos bimestres, mostra gráfico comparativo
    if (bimestresDisponiveis && bimestresDisponiveis.length > 1 && estatisticasPorBimestre) {
        return <GraficoDisciplinasComparativo
            bimestresDisponiveis={bimestresDisponiveis}
            estatisticasPorBimestre={estatisticasPorBimestre}
        />;
    }

    // Caso contrário, mostra gráfico do bimestre atual
    return <GraficoDisciplinasSingle
        disciplinas={disciplinas}
        totalAtivos={totalAtivos}
        totalTransferidos={totalTransferidos}
        totalRemanejados={totalRemanejados}
    />;
};

const GraficoDisciplinasSingle = ({ disciplinas, totalAtivos = 0, totalTransferidos = 0, totalRemanejados = 0 }) => {
    // Prepara os dados para o gráfico com nomes mais curtos
    const dados = disciplinas.map(disc => {
        let nomeAbreviado = disc.nome;

        // Abreviações específicas para nomes longos
        if (disc.nome.includes('ORIENTAÇÃO DE ESTUDO')) {
            if (disc.nome.includes('LÍNGUA PORTUGUESA')) {
                nomeAbreviado = 'Orient. Est. - Port.';
            } else if (disc.nome.includes('MATEMÁTICA')) {
                nomeAbreviado = 'Orient. Est. - Mat.';
            } else {
                nomeAbreviado = 'Orient. Estudo';
            }
        } else if (disc.nome.length > 15) {
            // Pega primeiras palavras significativas
            const palavras = disc.nome.split(' ');
            nomeAbreviado = palavras.slice(0, 2).join(' ');
            if (nomeAbreviado.length > 15) {
                nomeAbreviado = nomeAbreviado.substring(0, 15) + '...';
            }
        }

        return {
            nome: nomeAbreviado,
            nomeCompleto: disc.nome,
            media: disc.media,
            taxaAprovacao: disc.taxaAprovacao
        };
    });

    // Define cores baseadas na média (Accent Colors)
    const getColor = (media) => {
        if (media >= 7) return '#66BB6A'; // Accent Green
        if (media >= 5) return '#FFB74D'; // Accent Gold
        return '#EF5350'; // Accent Red
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: '#2C2420', // Surface Card
                    padding: '1rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: `1px solid rgba(255,255,255,0.1)`
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#EFEBE9' }}>
                        {data.nomeCompleto}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: getColor(data.media), fontWeight: '600' }}>
                        Média: {data.media.toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#D7CCC8' }}>
                        Aprovação: {data.taxaAprovacao}%
                    </p>
                </div>
            );
        }
        return null;
    };

    // Função para renderizar labels em múltiplas linhas
    const renderCustomTick = ({ x, y, payload }) => {
        const value = payload.value;
        const palavras = value.split(' ');

        if (palavras.length > 1) {
            const meio = Math.ceil(palavras.length / 2);
            const linha1 = palavras.slice(0, meio).join(' ');
            const linha2 = palavras.slice(meio).join(' ');

            return (
                <g transform={`translate(${x},${y})`}>
                    <text
                        x={0}
                        y={0}
                        dy={15}
                        textAnchor="end"
                        fill="#D7CCC8"
                        fontSize={10}
                        fontWeight={500}
                        transform="rotate(-45)"
                    >
                        <tspan x="0" dy="0">{linha1}</tspan>
                        <tspan x="0" dy="12">{linha2}</tspan>
                    </text>
                </g>
            );
        }

        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={15}
                    textAnchor="end"
                    fill="#D7CCC8"
                    fontSize={10}
                    fontWeight={500}
                    transform="rotate(-45)"
                >
                    {value}
                </text>
            </g>
        );
    };

    return (
        <div style={{ width: '100%', height: '600px' }}>
            <ResponsiveContainer>
                <BarChart
                    data={dados}
                    margin={{ top: 20, right: 30, left: 20, bottom: 150 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3E2723" opacity={0.5} />
                    <XAxis
                        dataKey="nome"
                        height={150}
                        interval={0}
                        tick={renderCustomTick}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <YAxis
                        domain={[0, 10]}
                        tick={{ fill: '#D7CCC8' }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fill: '#D7CCC8' }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3E2723', opacity: 0.2 }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px', color: '#D7CCC8' }}
                        content={() => (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '2rem',
                                fontSize: '0.95rem',
                                color: '#D7CCC8',
                                fontWeight: 500
                            }}>
                                <span style={{ color: '#66BB6A' }}>✓ {totalAtivos} Ativos</span>
                                <span style={{ color: '#FFB74D' }}>→ {totalTransferidos} Transferidos</span>
                                <span style={{ color: '#A1887F' }}>↻ {totalRemanejados} Remanejamentos</span>
                            </div>
                        )}
                    />
                    <Bar dataKey="media" radius={[8, 8, 0, 0]}>
                        {dados.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.media)} />
                        ))}
                    </Bar>
                    <ReferenceLine
                        y={CONFIG.NOTA_MINIMA_APROVACAO}
                        stroke="#EF5350"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{ value: 'Mínimo', position: 'right', fill: '#EF5350', fontSize: 12 }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const GraficoDisciplinasComparativo = ({ bimestresDisponiveis, estatisticasPorBimestre }) => {
    // Cores para comparação (Brown Ramp / Earthy Tones)
    const cores = ['#D7CCC8', '#A1887F', '#795548', '#5D4037'];

    // Coleta todas as disciplinas
    const todasDisciplinas = new Set();
    bimestresDisponiveis.forEach(bim => {
        Object.keys(estatisticasPorBimestre[bim].disciplinas).forEach(disc => {
            todasDisciplinas.add(disc);
        });
    });

    // Formata dados para o gráfico
    const dados = Array.from(todasDisciplinas).map(discNome => {
        const entrada = { nome: discNome };
        bimestresDisponiveis.forEach(bim => {
            const disc = estatisticasPorBimestre[bim].disciplinas[discNome];
            if (disc) {
                entrada[`bim${bim}`] = disc.media;
            }
        });
        return entrada;
    });

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: '#2C2420',
                    padding: '1rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#EFEBE9' }}>
                        {data.nome}
                    </p>
                    {payload.map((entry, idx) => (
                        <p key={idx} style={{ margin: '0.25rem 0', color: entry.color, fontWeight: '600' }}>
                            {entry.name}: {entry.value.toFixed(2)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Função para renderizar labels em múltiplas linhas
    const renderCustomTick = ({ x, y, payload }) => {
        const value = payload.value;
        const palavras = value.split(' ');

        if (palavras.length > 1) {
            const meio = Math.ceil(palavras.length / 2);
            const linha1 = palavras.slice(0, meio).join(' ');
            const linha2 = palavras.slice(meio).join(' ');

            return (
                <g transform={`translate(${x},${y})`}>
                    <text
                        x={0}
                        y={0}
                        dy={15}
                        textAnchor="end"
                        fill="#D7CCC8"
                        fontSize={10}
                        fontWeight={500}
                        transform="rotate(-45)"
                    >
                        <tspan x="0" dy="0">{linha1}</tspan>
                        <tspan x="0" dy="12">{linha2}</tspan>
                    </text>
                </g>
            );
        }

        return (
            <g transform={`translate(${x},${y})`}>
                <text
                    x={0}
                    y={0}
                    dy={15}
                    textAnchor="end"
                    fill="#D7CCC8"
                    fontSize={10}
                    fontWeight={500}
                    transform="rotate(-45)"
                >
                    {value}
                </text>
            </g>
        );
    };

    return (
        <div style={{ width: '100%', height: '600px' }}>
            <ResponsiveContainer>
                <BarChart
                    data={dados}
                    margin={{ top: 20, right: 30, left: 20, bottom: 150 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3E2723" opacity={0.5} />
                    <XAxis
                        dataKey="nome"
                        height={150}
                        interval={0}
                        tick={renderCustomTick}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <YAxis
                        domain={[0, 10]}
                        tick={{ fill: '#D7CCC8' }}
                        label={{ value: 'Média', angle: -90, position: 'insideLeft', fill: '#D7CCC8' }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3E2723', opacity: 0.2 }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px', color: '#D7CCC8' }}
                        formatter={(value) => {
                            const match = value.match(/bim(\d)/);
                            return match ? `${match[1]}º Bimestre` : value;
                        }}
                    />
                    {bimestresDisponiveis.map((bim, idx) => (
                        <Bar
                            key={bim}
                            dataKey={`bim${bim}`}
                            fill={cores[idx % cores.length]}
                            name={`${bim}º Bimestre`}
                            radius={[8, 8, 0, 0]}
                        />
                    ))}
                    <ReferenceLine
                        y={CONFIG.NOTA_MINIMA_APROVACAO}
                        stroke="#EF5350"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{ value: 'Mínimo', position: 'right', fill: '#EF5350', fontSize: 12 }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GraficoDisciplinas;
