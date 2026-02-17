import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DISCIPLINAS } from '../../constants/disciplinas';

const GraficoEvolucaoAluno = ({ nomeAluno, dadosBimestres }) => {
    // Prepara dados de evolução por disciplina
    const disciplinasComDados = DISCIPLINAS.map(disc => {
        const dadosEvolucao = {
            disciplina: disc.nome,
            nomeAbreviado: disc.nome.length > 15 ? disc.nome.substring(0, 15) + '...' : disc.nome
        };

        // Adiciona nota de cada bimestre
        [1, 2, 3, 4].forEach(bim => {
            if (dadosBimestres[bim]) {
                const aluno = dadosBimestres[bim].alunos.find(a => a.nome === nomeAluno);
                if (aluno && aluno.disciplinas[disc.nome]) {
                    dadosEvolucao[`bim${bim}`] = aluno.disciplinas[disc.nome].media;
                }
            }
        });

        return dadosEvolucao;
    }).filter(d => d.bim1 !== undefined || d.bim2 !== undefined || d.bim3 !== undefined || d.bim4 !== undefined);

    // Prepara dados para gráfico de linha (média geral por bimestre)
    const dadosMediaGeral = [1, 2, 3, 4]
        .filter(bim => dadosBimestres[bim])
        .map(bim => {
            const aluno = dadosBimestres[bim].alunos.find(a => a.nome === nomeAluno);
            if (!aluno) return null;

            const notas = Object.values(aluno.disciplinas)
                .map(d => d.media)
                .filter(n => n !== null && !isNaN(n));

            const media = notas.length > 0
                ? notas.reduce((acc, n) => acc + n, 0) / notas.length
                : 0;

            return {
                bimestre: `${bim}º Bim`,
                media: parseFloat(media.toFixed(2))
            };
        })
        .filter(d => d !== null);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#2C2420',
                    padding: '1rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#EFEBE9' }}>
                        {label}
                    </p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.25rem 0', color: entry.color, fontWeight: '600' }}>
                            Média: {entry.value.toFixed(2)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (dadosMediaGeral.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#D7CCC8' }}>
                Carregue mais de um bimestre para ver a evolução
            </div>
        );
    }

    return (
        <div>
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dadosMediaGeral} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3E2723" opacity={0.5} />
                    <XAxis
                        dataKey="bimestre"
                        tick={{ fill: '#D7CCC8' }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <YAxis
                        domain={[0, 10]}
                        tick={{ fill: '#D7CCC8' }}
                        label={{ value: 'Média Geral', angle: -90, position: 'insideLeft', fill: '#D7CCC8' }}
                        axisLine={{ stroke: '#5D4037' }}
                        tickLine={{ stroke: '#5D4037' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3E2723', strokeWidth: 2 }} />
                    <Legend wrapperStyle={{ color: '#D7CCC8' }} />
                    <Line
                        type="monotone"
                        dataKey="media"
                        name="Média Geral"
                        stroke="#D7CCC8"
                        strokeWidth={3}
                        dot={{ fill: '#D7CCC8', r: 6, strokeWidth: 0 }}
                        activeDot={{ r: 8 }}
                    />
                    {/* Linha de referência para nota mínima */}
                    <line y1="50%" y2="50%" stroke="#EF5350" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GraficoEvolucaoAluno;
