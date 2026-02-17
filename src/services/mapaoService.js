import * as XLSX from 'xlsx';
import { DISCIPLINAS, CONFIG, STATUS_ALUNO } from '../constants/disciplinas';

/**
 * Lê e processa o arquivo Mapão.xlsx
 * @param {File} file - Arquivo Excel
 * @returns {Promise<Object>} Dados processados
 */
export const lerMapao = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Assume que a primeira aba é o Mapão
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Converte para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Processa os dados
                const dadosProcessados = processarDados(jsonData);

                resolve(dadosProcessados);
            } catch (error) {
                reject(new Error(`Erro ao processar arquivo: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler arquivo'));
        };

        reader.readAsArrayBuffer(file);
    });
};

/**
 * Processa os dados brutos do Excel
 */
const processarDados = (jsonData) => {
    // Extrai informações do cabeçalho
    const infoGeral = {
        anoLetivo: jsonData[1]?.[1] || '',
        diretoria: jsonData[2]?.[1] || '',
        escola: jsonData[3]?.[1] || '',
        tipoEnsino: jsonData[4]?.[1] || '',
        turma: jsonData[5]?.[1] || '',
        tipoFechamento: jsonData[6]?.[1] || '',
        totalAulasDadas: jsonData[7]?.[1] || '',
        totalAulasEletiva: jsonData[8]?.[1] || ''
    };

    // Processa os alunos
    const alunos = [];

    for (let i = CONFIG.LINHA_PRIMEIRO_ALUNO - 1; i < jsonData.length; i++) {
        const linha = jsonData[i];

        if (!linha || !linha[0]) continue; // Linha vazia

        const nomeAluno = linha[0];
        const situacao = linha[1] || STATUS_ALUNO.ATIVO;

        // Processa notas de cada disciplina
        const disciplinas = {};

        DISCIPLINAS.forEach(disc => {
            const baseCol = disc.col_idx - 1; // -1 porque array é 0-indexed

            disciplinas[disc.nome] = {
                codigo: disc.codigo,
                numero: linha[baseCol] || '',
                media: parseFloat(linha[baseCol + 1]) || null,
                faltas: parseInt(linha[baseCol + 2]) || 0,
                ausenciasCompensadas: parseInt(linha[baseCol + 3]) || 0
            };
        });

        alunos.push({
            nome: nomeAluno,
            situacao: situacao,
            disciplinas: disciplinas,
            isAtivo: situacao === STATUS_ALUNO.ATIVO
        });
    }

    return {
        infoGeral,
        alunos,
        totalAlunos: alunos.length,
        totalAtivos: alunos.filter(a => a.isAtivo).length,
        totalTransferidos: alunos.filter(a => a.situacao === STATUS_ALUNO.TRANSFERIDO).length,
        totalRemanejados: alunos.filter(a => a.situacao === STATUS_ALUNO.REMANEJAMENTO).length
    };
};

/**
 * Calcula estatísticas da turma
 */
export const calcularEstatisticasTurma = (dados, incluirInativos = false) => {
    const alunos = incluirInativos
        ? dados.alunos
        : dados.alunos.filter(a => a.isAtivo);

    if (alunos.length === 0) {
        return null;
    }

    const estatisticasPorDisciplina = {};

    DISCIPLINAS.forEach(disc => {
        const notas = alunos
            .map(a => a.disciplinas[disc.nome]?.media)
            .filter(n => n !== null && !isNaN(n));

        const faltas = alunos
            .map(a => a.disciplinas[disc.nome]?.faltas || 0);

        if (notas.length > 0) {
            const soma = notas.reduce((acc, n) => acc + n, 0);
            const media = soma / notas.length;
            const notasOrdenadas = [...notas].sort((a, b) => a - b);
            const mediana = notasOrdenadas.length % 2 === 0
                ? (notasOrdenadas[notasOrdenadas.length / 2 - 1] + notasOrdenadas[notasOrdenadas.length / 2]) / 2
                : notasOrdenadas[Math.floor(notasOrdenadas.length / 2)];

            const somaQuadrados = notas.reduce((acc, n) => acc + Math.pow(n - media, 2), 0);
            const desvioPadrao = Math.sqrt(somaQuadrados / notas.length);

            const aprovados = notas.filter(n => n >= CONFIG.NOTA_MINIMA_APROVACAO).length;

            estatisticasPorDisciplina[disc.nome] = {
                codigo: disc.codigo,
                media: parseFloat(media.toFixed(2)),
                mediana: parseFloat(mediana.toFixed(2)),
                desvioPadrao: parseFloat(desvioPadrao.toFixed(2)),
                notaMaxima: Math.max(...notas),
                notaMinima: Math.min(...notas),
                aprovados: aprovados,
                reprovados: notas.length - aprovados,
                taxaAprovacao: parseFloat(((aprovados / notas.length) * 100).toFixed(2)),
                totalFaltas: faltas.reduce((acc, f) => acc + f, 0),
                mediaFaltas: parseFloat((faltas.reduce((acc, f) => acc + f, 0) / faltas.length).toFixed(2))
            };
        }
    });

    // Calcula média geral da turma
    const mediasPorAluno = alunos.map(aluno => {
        const notas = Object.values(aluno.disciplinas)
            .map(d => d.media)
            .filter(n => n !== null && !isNaN(n));

        if (notas.length === 0) return null;
        return notas.reduce((acc, n) => acc + n, 0) / notas.length;
    }).filter(m => m !== null);

    const mediaGeralTurma = mediasPorAluno.length > 0
        ? mediasPorAluno.reduce((acc, m) => acc + m, 0) / mediasPorAluno.length
        : 0;

    return {
        disciplinas: estatisticasPorDisciplina,
        mediaGeralTurma: parseFloat(mediaGeralTurma.toFixed(2)),
        totalAlunos: alunos.length
    };
};

/**
 * Calcula estatísticas de um aluno individual
 */
export const calcularEstatisticasAluno = (aluno) => {
    const notas = Object.values(aluno.disciplinas)
        .map(d => d.media)
        .filter(n => n !== null && !isNaN(n));

    const faltas = Object.values(aluno.disciplinas)
        .map(d => d.faltas || 0);

    const mediaGeral = notas.length > 0
        ? notas.reduce((acc, n) => acc + n, 0) / notas.length
        : 0;

    const totalFaltas = faltas.reduce((acc, f) => acc + f, 0);

    const melhorDisciplina = Object.entries(aluno.disciplinas)
        .filter(([_, d]) => d.media !== null)
        .sort((a, b) => b[1].media - a[1].media)[0];

    const piorDisciplina = Object.entries(aluno.disciplinas)
        .filter(([_, d]) => d.media !== null)
        .sort((a, b) => a[1].media - b[1].media)[0];

    const disciplinasEmRisco = Object.entries(aluno.disciplinas)
        .filter(([_, d]) => d.media !== null && d.media < CONFIG.NOTA_MINIMA_APROVACAO)
        .map(([nome, _]) => nome);

    return {
        mediaGeral: parseFloat(mediaGeral.toFixed(2)),
        totalFaltas,
        melhorDisciplina: melhorDisciplina ? {
            nome: melhorDisciplina[0],
            nota: melhorDisciplina[1].media
        } : null,
        piorDisciplina: piorDisciplina ? {
            nome: piorDisciplina[0],
            nota: piorDisciplina[1].media
        } : null,
        disciplinasEmRisco,
        aprovado: disciplinasEmRisco.length === 0
    };
};
