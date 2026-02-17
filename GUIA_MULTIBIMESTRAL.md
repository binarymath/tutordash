# 🎓 Sistema Multi-Bimestral - Guia de Uso

## ✨ Nova Funcionalidade: Análise de 4 Bimestres

O sistema agora suporta **análise comparativa de múltiplos bimestres**!

## 📤 Como Carregar os Arquivos

### Passo 1: Preparar os Arquivos
Você deve ter **4 arquivos Excel separados**, um para cada bimestre:
- `Mapao_1Bimestre.xlsx`
- `Mapao_2Bimestre.xlsx`
- `Mapao_3Bimestre.xlsx`
- `Mapao_4Bimestre.xlsx`

### Passo 2: Upload dos Arquivos
1. Ao abrir a aplicação, você verá **4 botões de upload**
2. Clique em cada botão para carregar o arquivo do respectivo bimestre
3. Você pode carregar **1, 2, 3 ou todos os 4 bimestres**
4. Os botões ficarão **verdes** quando carregados com sucesso

## 🎯 Funcionalidades por Número de Bimestres

### Com 1 Bimestre Carregado:
- ✅ Análise de Turma
- ✅ Análise Individual
- ✅ Gráficos estáticos
- ❌ Sem evolução temporal

### Com 2+ Bimestres Carregados:
- ✅ Análise de Turma
- ✅ Análise Individual
- ✅ **Seletor de Bimestre** (no header)
- ✅ **Gráfico de Evolução Temporal**
- ✅ Comparação entre bimestres

## 🔄 Navegando Entre Bimestres

### Seletor de Bimestre (Header)
- Aparece automaticamente quando você carrega dados
- Botões: `1º` `2º` `3º` `4º`
- **Botão branco**: Bimestre atual selecionado
- **Botão transparente**: Bimestres disponíveis
- **Botão opaco**: Bimestres não carregados (desabilitados)

### Trocar de Bimestre:
1. Clique no botão do bimestre desejado no header
2. Todas as visualizações atualizam automaticamente
3. Footer mostra qual bimestre está sendo visualizado

## 📊 Análise Individual com Evolução

Quando você tem **2 ou mais bimestres** carregados:

### Gráfico de Evolução Temporal
- **Localização**: Primeiro gráfico na análise individual
- **Mostra**: Média geral do aluno ao longo dos bimestres
- **Visual**: Linha com pontos (fácil de ver tendências)
- **Cores**: Azul/Roxo com gradiente

### Como Interpretar:
- ↗️ **Linha subindo**: Aluno melhorando
- ↘️ **Linha descendo**: Aluno com queda no desempenho
- ➡️ **Linha estável**: Desempenho consistente

## 💡 Casos de Uso

### Caso 1: Início do Ano
```
1º Bimestre: ✅ Carregado
2º Bimestre: ❌ Não disponível
3º Bimestre: ❌ Não disponível
4º Bimestre: ❌ Não disponível

Resultado: Análise normal, sem evolução
```

### Caso 2: Meio do Ano
```
1º Bimestre: ✅ Carregado
2º Bimestre: ✅ Carregado
3º Bimestre: ❌ Não disponível
4º Bimestre: ❌ Não disponível

Resultado: Gráfico de evolução com 2 pontos
```

### Caso 3: Análise Anual Completa
```
1º Bimestre: ✅ Carregado
2º Bimestre: ✅ Carregado
3º Bimestre: ✅ Carregado
4º Bimestre: ✅ Carregado

Resultado: Análise completa com evolução de todo o ano
```

## 🎨 Interface Atualizada

### Dashboard Header:
```
+---------------------------------------------------------------+
| 📊 Analisador Bimestral                                      |
|                                                               |
| [📅 1º 2º 3º 4º]  [Análise Turma] [Análise Individual]       |
+---------------------------------------------------------------+
```

### Upload Screen:
```
+---------------------------+---------------------------+
|     1º Bimestre          |     2º Bimestre          |
|  [Clique para carregar]  |  [Clique para carregar]  |
+---------------------------+---------------------------+
|     3º Bimestre          |     4º Bimestre          |
|  [Clique para carregar]  |  [Clique para carregar]  |
+---------------------------+---------------------------+
        ✅ 2 de 4 bimestres carregados
```

## ⚠️ Importante

### Requisitos dos Arquivos:
1. **Mesma turma**: Todos os 4 arquivos devem ser da mesma turma
2. **Mesma estrutura**: Todos devem ter as mesmas disciplinas
3. **Mesmos alunos**: Sistema identifica alunos pelo nome
4. **Formato correto**: Todos devem seguir o padrão do Mapão.xlsx

### Notas:
- Se um aluno aparece em um bimestre mas não em outro, o gráfico mostrará apenas os bimestres disponíveis
- Alunos transferidos/remanejados podem não aparecer em todos os bimestres
- Use o filtro "Incluindo Inativos" para ver alunos transferidos

## 🚀 Workflow Recomendado

### Durante o Ano Letivo:
1. **1º Bimestre**: Carregue apenas o 1º arquivo
2. **2º Bimestre**: Adicione o 2º arquivo para ver evolução  
3. **3º Bimestre**: Continue adicionando para análise trimestral
4. **4º Bimestre**: Complete com todos os 4 para visão anual

### Fim do Ano:
1. Carregue todos os 4 bimestres de uma vez
2. Analise a evolução de cada aluno
3. Identifique alunos com melhora/queda
4. Gere relatórios finais

## 📈 Métricas de Evolução

O sistema calcula automaticamente:
- ✅ **Média por bimestre**: Para cada aluno
- ✅ **Tendência**: Melhoria ou queda
- ✅ **Consistência**: Se o desempenho é estável
- ✅ **Comparação**: Aluno vs média da turma ao longo do tempo

---

**Desenvolvido para proporcionar análise completa e evolutiva do desempenho dos alunos** 🎓
