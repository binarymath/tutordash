# 📊 Analisador Bimestral

Plataforma web moderna e escalável para análise de desempenho bimestral de alunos, desenvolvida com React e Vite.

## ✨ Funcionalidades

### 🎯 Análise de Turma
- **Visão Geral Completa**: Estatísticas consolidadas da turma
- **Gráficos Interativos**: Visualização de desempenho por disciplina
- **Métricas Detalhadas**: Média, mediana, desvio padrão, taxa de aprovação
- **Identificação Automática**: Melhor e pior disciplina da turma
- **Análise de Faltas**: Total e média de faltas por disciplina

### 👤 Análise Individual
- **Busca de Alunos**: Sistema de busca rápida e intuitiva
- **Perfil Completo**: Estatísticas individuais de cada aluno
- **Gráfico Radar**: Visualização multidimensional do desempenho
- **Comparação com Turma**: Gráficos comparando aluno vs média da turma
- **Alertas Inteligentes**: Identificação de disciplinas em risco
- **Detalhamento**: Tabela completa com notas, faltas e ausências compensadas

### ⚙️ Funcionalidades Adicionais
- **Filtro de Status**: Incluir/excluir alunos transferidos e remanejados
- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Interface Moderna**: Design premium com gradientes e animações suaves

## 🏗️ Arquitetura

```
analisador-app/
├── src/
│   ├── components/
│   │   ├── Dashboard/          # Dashboard principal
│   │   ├── AnalysisViews/      # Visualizações de análise
│   │   ├── Charts/             # Componentes de gráficos
│   │   ├── Layout/             # Componentes de layout
│   │   └── Common/             # Componentes reutilizáveis
│   ├── contexts/               # Contextos React (Estado global)
│   ├── services/               # Serviços (leitura Excel, cálculos)
│   ├── utils/                  # Utilitários
│   ├── hooks/                  # Custom hooks
│   └── constants/              # Constantes (disciplinas, config)
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 16+ instalado
- NPM ou Yarn

### Instalação

```bash
# Navegue até a pasta do projeto
cd analisador-app

# Instale as dependências (já instaladas)
npm install

# Execute o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
npm run preview
```

## 📦 Dependências Principais

- **React 18**: Framework UI
- **Vite**: Build tool ultrarrápida
- **Recharts**: Biblioteca de gráficos
- **XLSX**: Leitura de arquivos Excel
- **Lucide React**: Ícones modernos

## 📊 Estrutura do Mapão.xlsx

O sistema espera um arquivo Excel com a seguinte estrutura:

- **Linha 1-9**: Informações gerais (escola, turma, ano letivo, etc.)
- **Linha 11**: Nomes das disciplinas
- **Linha 12**: Subcolunas (Nº, M, F, AC)
- **Linha 13+**: Dados dos alunos

### Colunas por Aluno:
- **Coluna A**: Nome do Aluno
- **Coluna B**: Situação (Ativo, Transferido, Remanejamento)
- **Para cada disciplina** (4 colunas):
  - **Nº**: Número do aluno
  - **M**: Média/Nota
  - **F**: Faltas
  - **AC**: Ausências Compensadas

## 🎨 Tecnologias e Padrões

### React Patterns
- **Context API**: Gerenciamento de estado global
- **Custom Hooks**: Lógica reutilizável
- **Component Composition**: Componentes modulares e reutilizáveis

### CSS
- **CSS Modules**: Estilização isolada por componente
- **Gradientes**: Design moderno e atraente
- **Flexbox/Grid**: Layouts responsivos
- **Animações**: Transições suaves e micro-interações

### Boas Práticas
- **Separação de Responsabilidades**: Componentes, serviços, utilitários
- **Memoização**: useMemo para otimização de performance
- **Código Limpo**: Funções pequenas e bem documentadas

## 📈 Cálculos Estatísticos

### Por Turma
- Média aritmética
- Mediana
- Desvio padrão
- Taxa de aprovação (nota ≥ 5.0)
- Total e média de faltas

### Por Aluno
- Média geral
- Melhor e pior disciplina
- Disciplinas em risco (nota < 5.0)
- Total de faltas
- Comparação com média da turma

## 🔜 Possíveis Expansões

- [ ] Exportação de relatórios em PDF
- [ ] Gráficos de evolução temporal (múltiplos bimestres)
- [ ] Dashboard com visão de múltiplas turmas
- [ ] Análise por disciplina específica
- [ ] Sistema de alertas e notificações
- [ ] Modo escuro
- [ ] Impressão otimizada
- [ ] Integração com API backend

## 📝 Licença

Projeto desenvolvido para análise educacional.

---

**Desenvolvido com ❤️ usando React + Vite**
