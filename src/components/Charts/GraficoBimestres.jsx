import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';

const GraficoBimestres = ({ bimestresDisponiveis, estatisticasPorBimestre }) => {
    // Prepara os dados para o gráfico
    const dados = bimestresDisponiveis.map(bim => {
        const stats = estatisticasPorBimestre[bim];
        if (!stats) return null;

        // Calcula médias gerais do bimestre
        const disciplinasArray = Object.values(stats.disciplinas);
        const mediaGeral = disciplinasArray.reduce((acc, d) => acc + d.media, 0) / disciplinasArray.length;
        const medianaGeral = disciplinasArray.reduce((acc, d) => acc + d.mediana, 0) / disciplinasArray.length;
        const desvioPadraoGeral = disciplinasArray.reduce((acc, d) => acc + d.desvioPadrao, 0) / disciplinasArray.length;
        const aprovacaoGeral = disciplinasArray.reduce((acc, d) => acc + d.taxaAprovacao, 0) / disciplinasArray.length;

        return {
            bimestre: `${bim}º Bim.`,
            media: parseFloat(mediaGeral.toFixed(2)),
            mediana: parseFloat(medianaGeral.toFixed(2)),
            desvioPadrao: parseFloat(desvioPadraoGeral.toFixed(2)),
            aprovacao: parseFloat(aprovacaoGeral.toFixed(2))
        };
    }).filter(d => d !== null);

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
                        {data.bimestre}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#D7CCC8', fontWeight: '600' }}>
                        Média: {data.media.toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#A1887F', fontWeight: '600' }}>
                        Mediana: {data.mediana.toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#8D6E63' }}>
                        Desvio Padrão: {data.desvioPadrao.toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#66BB6A', fontWeight: '600' }}>
                        Aprovação: {data.aprovacao.toFixed(1)}%
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full text-white">
            <h3 className="text-lg font-semibold mb-4 text-[#EFEBE9]">📊 Evolução das Métricas por Bimestre</h3>
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                    data={dados}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3E2723" opacity={0.5} />
                    <XAxis
                        dataKey="bimestre"
                        stroke="#D7CCC8"
                        style={{ fontSize: '0.9rem', fontWeight: 500 }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <YAxis
                        stroke="#D7CCC8"
                        style={{ fontSize: '0.9rem' }}
                        domain={[0, 10]}
                        label={{ value: 'Valor', angle: -90, position: 'insideLeft', fill: '#D7CCC8' }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#3E2723', opacity: 0.2 }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '1.5rem', color: '#D7CCC8' }}
                        iconType="circle"
                    />
                    <Bar
                        dataKey="media"
                        fill="#D7CCC8"
                        name="Média"
                        radius={[6, 6, 0, 0]}
                        barSize={30}
                    />
                    <Bar
                        dataKey="mediana"
                        fill="#A1887F"
                        name="Mediana"
                        radius={[6, 6, 0, 0]}
                        barSize={30}
                    />
                    <Bar
                        dataKey="desvioPadrao"
                        fill="#42A5F5"
                        name="Desvio Padrão"
                        radius={[6, 6, 0, 0]}
                        barSize={30}
                    />
                    <Line
                        type="monotone"
                        dataKey="aprovacao"
                        stroke="#66BB6A"
                        strokeWidth={3}
                        name="Aprovação (%)"
                        yAxisId="right"
                        dot={{ fill: '#66BB6A', r: 5, strokeWidth: 0 }}
                        activeDot={{ r: 8 }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#66BB6A"
                        style={{ fontSize: '0.9rem' }}
                        domain={[0, 100]}
                        label={{ value: 'Aprovação (%)', angle: 90, position: 'insideRight', fill: '#66BB6A' }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GraficoBimestres;
