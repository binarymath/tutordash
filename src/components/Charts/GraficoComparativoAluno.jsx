import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GraficoComparativoAluno = ({ aluno, mediaTurma }) => {
    if (!mediaTurma) return null;

    // Prepara dados comparativos
    const dados = Object.entries(aluno.disciplinas)
        .filter(([nome, disc]) => disc.media !== null && mediaTurma[nome])
        .map(([nome, disc]) => ({
            disciplina: nome.length > 15 ? nome.substring(0, 15) + '...' : nome,
            nomeCompleto: nome,
            aluno: disc.media,
            turma: mediaTurma[nome].media
        }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const diferenca = data.aluno - data.turma;

            return (
                <div style={{
                    background: '#2C2420',
                    padding: '1rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#EFEBE9' }}>
                        {data.nomeCompleto}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#D7CCC8', fontWeight: '600' }}>
                        Aluno: {data.aluno.toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#66BB6A', fontWeight: '600' }}>
                        Média da Turma: {data.turma.toFixed(2)}
                    </p>
                    <p style={{
                        margin: '0.5rem 0 0 0',
                        color: diferenca >= 0 ? '#66BB6A' : '#EF5350',
                        fontWeight: 'bold',
                        borderTop: '1px solid #3E2723',
                        paddingTop: '0.5rem'
                    }}>
                        {diferenca >= 0 ? '↑' : '↓'} {Math.abs(diferenca).toFixed(2)} pontos
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={dados}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#3E2723" opacity={0.5} />
                <XAxis
                    dataKey="disciplina"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: '#D7CCC8', fontSize: 11 }}
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
