// Disciplinas identificadas no Mapão.xlsx
export const DISCIPLINAS = [
    { numero: 1, nome: "ARTE", codigo: "1813", coluna_inicial: "C", col_idx: 3 },
    { numero: 2, nome: "CIÊNCIAS", codigo: "8468", coluna_inicial: "G", col_idx: 7 },
    { numero: 3, nome: "Educação Financeira", codigo: "50432", coluna_inicial: "K", col_idx: 11 },
    { numero: 4, nome: "EDUCAÇÃO FÍSICA", codigo: "1900", coluna_inicial: "O", col_idx: 15 },
    { numero: 5, nome: "ELETIVAS", codigo: "8465", coluna_inicial: "S", col_idx: 19 },
    { numero: 6, nome: "GEOGRAFIA", codigo: "2100", coluna_inicial: "W", col_idx: 23 },
    { numero: 7, nome: "HISTÓRIA", codigo: "2200", coluna_inicial: "AA", col_idx: 27 },
    { numero: 8, nome: "LÍNGUA INGLESA", codigo: "8467", coluna_inicial: "AE", col_idx: 31 },
    { numero: 9, nome: "LÍNGUA PORTUGUESA", codigo: "1100", coluna_inicial: "AI", col_idx: 35 },
    { numero: 10, nome: "MATEMÁTICA", codigo: "2700", coluna_inicial: "AM", col_idx: 39 },
    { numero: 11, nome: "ORIENTAÇÃO DE ESTUDO – LÍNGUA PORTUGUESA", codigo: "55208", coluna_inicial: "AQ", col_idx: 43 },
    { numero: 12, nome: "ORIENTAÇÃO DE ESTUDO – MATEMÁTICA", codigo: "55207", coluna_inicial: "AU", col_idx: 47 },
    { numero: 13, nome: "PROJETO DE VIDA", codigo: "8441", coluna_inicial: "AY", col_idx: 51 },
    { numero: 14, nome: "REDAÇÃO E LEITURA", codigo: "52001", coluna_inicial: "BC", col_idx: 55 },
    { numero: 15, nome: "TECNOLOGIA E INOVAÇÃO", codigo: "8466", coluna_inicial: "BG", col_idx: 59 }
];

// Subcolunas de cada disciplina
export const SUBCOLUNAS = {
    NUMERO: 'Nº',  // Número do aluno
    MEDIA: 'M',    // Média/Nota
    FALTAS: 'F',   // Faltas
    AC: 'AC'       // Ausências Compensadas
};

// Status dos alunos
export const STATUS_ALUNO = {
    ATIVO: 'Ativo',
    TRANSFERIDO: 'Transferido',
    REMANEJAMENTO: 'Remanejamento'
};

// Configurações padrão
export const CONFIG = {
    NOTA_MINIMA_APROVACAO: 5.0,
    PERCENTUAL_MAX_FALTAS: 25,
    LINHA_CABECALHO: 11,
    LINHA_SUBCOLUNAS: 12,
    LINHA_PRIMEIRO_ALUNO: 13
};
