# Mapa Semântico da Economia Brasileira

## 1. Missão

Construa uma aplicação web pública, polida e responsiva chamada:

# **Mapa Semântico da Economia Brasileira**

Conceito central:

> **Digite um tema e veja que partes da economia brasileira se acendem.**

A aplicação utiliza as 1.000 maiores empresas do ranking EXAME Melhores e Maiores 2026 e, para qualquer tema digitado pelo usuário, calcula um **grau de associação semântica** entre esse tema e cada uma das 1.000 empresas.

Exemplos de temas:

- `data centers`
- `café`
- `aviação`
- `seca`
- `celulose`
- `cibersegurança`
- `veículos elétricos`

O objetivo não é responder com texto, chatbot ou relatório. O produto deve transformar 1.000 julgamentos probabilísticos em uma **experiência visual imediata**.

A metáfora central é:

> **o tema “acende” determinadas partes da economia.**

---

## 2. Princípios que NÃO devem ser alterados

Estas decisões já foram validadas. Não proponha alternativas durante a implementação.

- Não usar bolhas.
- Não usar scatterplot.
- Não usar treemap no qual empresas tenham tamanhos diferentes.
- Não variar o tamanho das empresas.
- Não mover empresas em função da pesquisa.
- Não usar dark mode como visual padrão.
- Não transformar a interface em dashboard corporativo.
- Não usar “correlação” para descrever o score.
- Não introduzir RAG, embeddings, vector database ou agentes.
- Não enriquecer as empresas com pesquisa externa no MVP.
- Não consolidar empresas por grupo controlador.
- Não eliminar subsidiárias ou entidades repetidas do ranking.
- Não chamar a API a cada tecla digitada.

Cada uma das 1.000 empresas deve permanecer uma entidade independente, exatamente como aparece no ranking da EXAME.

---

## 3. Linguagem visual

Utilize o protótipo fornecido como **referência visual principal**.

A sensação deve ser:

- editorial;
- sofisticada;
- leve;
- muito limpa;
- moderna;
- premium;
- mais próxima de um produto de dados contemporâneo do que de Power BI/Tableau.

### Paleta-base

Fundo geral:

`#F7F6F1`

Superfícies/cards:

`#FCFBF8`

Texto principal:

`#202820`

Texto secundário:

`#6F776F`

Borders:

`#E3E4DD`

Escala de associação, contínua:

```text
0.00  #E9EBE6
0.25  #D8E5D9
0.50  #B7D7BD
0.75  #78BC88
1.00  #2F9D55
```

Faça interpolação contínua entre as cores.

Scores baixos nunca devem deixar a célula invisível.

Tipografia: preferencialmente `Inter`, `Geist` ou equivalente clean sans-serif.

Muito whitespace. Sombras mínimas ou inexistentes.

---

## 4. Estrutura desktop

A tela principal deve caber confortavelmente em viewport desktop 1440px.

Estrutura:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  MAPA SEMÂNTICO DA ECONOMIA BRASILEIRA          Como funciona      │
│  Digite um tema e veja que partes da economia brasileira se acendem │
│                                                                     │
│  🔍  data centers _______________________________________________   │
│                                                                     │
│  PERGUNTA AO MODELO                                                 │
│  Quais das 1.000 maiores empresas do Brasil participam...           │
│                                                                     │
│  Menor associação   ░░░▒▒▒▓▓▓████████   Maior associação            │
│                                                                     │
│  ┌───────────────────────────────────────────────┐ ┌─────────────┐   │
│  │                                               │ │ MAIS        │   │
│  │              MOSAICO SETORIAL                 │ │ ASSOCIADAS  │   │
│  │                                               │ │             │   │
│  │                                               │ │ Vivo    74% │   │
│  │                                               │ │ █████████   │   │
│  │                                               │ │ Weg     65% │   │
│  │                                               │ │ ████████    │   │
│  │                                               │ │ ...         │   │
│  └───────────────────────────────────────────────┘ └─────────────┘   │
│                                                                     │
│ Fonte / metodologia                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

Desktop:

- conteúdo principal: aproximadamente 75%;
- ranking lateral: aproximadamente 25%, ~300–330px;
- gap: 24–32px.

---

## 5. Header

Título:

**Mapa Semântico da Economia Brasileira**

Subtítulo:

> **Digite um tema e veja que partes da economia brasileira se acendem.**

No canto direito, apenas um link discreto:

**Como funciona**

Não criar menu complexo.

---

## 6. Busca

Campo grande, elegante, arredondado e dominante.

Exemplo:

`data centers`

Placeholder:

> **Explore um tema da economia brasileira**

Deve disparar pesquisa somente:

- com `Enter`;
- ou clique no ícone/botão de busca.

Nunca fazer chamada enquanto a pessoa digita.

Normalizar entrada para cache:

- trim;
- lowercase;
- remover espaços duplicados;
- normalizar acentos apenas para chave de cache;
- preservar exatamente o texto digitado para exibição.

Aceitar aproximadamente 2–80 caracteres.

---

## 7. Pergunta ao modelo

Imediatamente abaixo da busca exibir:

### **PERGUNTA AO MODELO**

E:

> Quais das 1.000 maiores empresas do Brasil participam de forma economicamente relevante do mercado, da cadeia de valor ou do ecossistema relacionado a **“data centers”**?

O termo pesquisado deve mudar dinamicamente.

Esta pergunta é importante porque deixa claro para o usuário **o que o percentual significa**.

Não usar “correlação”.

---

## 8. Colorbar

Logo abaixo da pergunta:

**Menor associação**  
→ gradiente contínuo →  
**Maior associação**

Não colocar ticks numéricos na colorbar.

A interface visual principal deve comunicar intensidade, não precisão matemática.

Os percentuais aparecem no ranking e no tooltip.

---

## 9. Mosaico setorial

Esta é a peça principal da aplicação.

Existem 1.000 células.

### Regra fundamental

> **Cada empresa ocupa exatamente uma célula do mesmo tamanho que todas as outras.**

Petrobras e empresa #1000 ocupam a mesma área.

A receita não controla tamanho.

### Agrupamento

As células ficam agrupadas pelos 22 setores da EXAME.

Cada setor forma um pequeno território visual contendo suas empresas.

Exemplo:

```text
TECNOLOGIA E TELECOMUNICAÇÕES

■ ■ ■ ■ ■ ■ ■
■ ■ ■ ■ ■ ■ ■
■ ■ ■ ■ ■ ■ ■
```

O tamanho do **território do setor** naturalmente depende de quantas empresas ele contém.

Mas todas as células individuais são iguais.

Não representar o peso econômico do setor aumentando células.

---

## 10. Ordem das empresas

Dentro de cada setor:

> ordenar sempre por `posicao_receita` crescente.

Portanto, a maior empresa do setor vem primeiro.

A posição de uma empresa **jamais muda quando o usuário pesquisa outro tema**.

Entre:

`café → data centers → seca`

a geometria permanece fixa.

**Somente as cores mudam.**

---

## 11. Layout dos setores

O layout deve ser determinístico e independente da busca.

Pode usar CSS Grid/flex + packing simples para distribuir os 22 painéis de setor.

Prioridades:

1. compactação;
2. legibilidade;
3. máximo uso da área disponível;
4. todas as 1.000 células visíveis;
5. nenhuma sobreposição;
6. tamanho uniforme das células.

No desktop, buscar células aproximadamente entre 10 e 14px, dependendo do viewport.

Cada setor deve ter:

- nome do setor;
- borda extremamente leve;
- fundo quase branco;
- células em pequena grade interna.

Não precisa mostrar quantidade de empresas por setor.

---

## 12. Cor das células

O único atributo principal modificado pelo score é:

> **cor**

`score = 0 → cor mínima`

`score = 1 → verde máximo`

Usar interpolação contínua.

Não criar categorias rígidas do tipo:

- associado;
- não associado;
- forte;
- fraco.

O score é contínuo.

Variável no código:

`associationScore`

Nunca `correlation`.

---

## 13. Labels no mosaico

Não escrever o nome das 1.000 empresas.

Mostrar nomes apenas das empresas mais associadas ao tema.

Usar inicialmente:

> **Top 8 global**

Essas empresas devem receber:

- pequeno destaque visual da célula;
- nome próximo da célula;
- sem alterar o tamanho da célula.

Exemplo para `data centers`:

- TIM
- Vivo
- Claro Nxt
- Weg
- Weg Equipamentos
- Engie
- EDP Brasil
- CPFL

Evitar colisões.

Se oito labels não couberem sem sobreposição, priorizar ranking:

1 → 8

e esconder os labels de menor prioridade.

A lista lateral continuará mostrando todos os Top 8.

---

## 14. Ranking lateral

Título:

# **MAIS ASSOCIADAS**

Exibir Top 8 empresas, ordenadas por score decrescente.

Em caso de empate:

> melhor `posicao_receita` primeiro.

Cada item contém:

```text
1   Vivo                       74%
    ███████████████████
```

Elementos:

- posição;
- empresa;
- barra;
- percentual arredondado.

`0.743 → 74%`

A barra deve usar o mesmo verde da colorbar.

Não colocar receita ou setor nessa lista.

Objetivo: extrema simplicidade.

---

## 15. Tooltip

Hover/focus sobre qualquer célula deve abrir tooltip.

Exemplo:

### Weg

**65% de associação**

Bens de Capital e Eletroeletrônicos  
#52 no ranking EXAME  
Jaraguá do Sul, SC  
Receita 2025: R$ XX,X bi

Tooltip compacto.

A receita vem da coluna em milhares de reais e deve ser convertida apenas para apresentação.

Não modificar o valor-fonte.

---

## 16. Animação

A troca de tema deve ser uma parte importante do produto.

Ao pesquisar:

1. manter o mosaico anterior na tela;
2. diminuir levemente sua intensidade;
3. mostrar uma animação extremamente sutil de processamento;
4. quando dados chegarem, interpolar as cores;
5. atualizar labels;
6. animar barras laterais.

Transição das células:

~500–700ms, `ease-out`.

A sensação desejada é:

> **a economia está se acendendo.**

Não mostrar spinner gigante.

Não desmontar/reconstruir o mosaico.

Não mudar a posição das empresas.

---

## 17. Estado inicial

Na primeira visita, usar `data centers` como demonstração inicial.

Pode fazer a chamada automaticamente.

Idealmente este termo estará previamente em cache.

O objetivo é que o usuário veja imediatamente o produto funcionando, sem cair numa tela vazia.

---

## 18. Mobile

A aplicação deve funcionar em celular.

Em viewport menor que ~768px:

- busca continua no topo;
- pergunta abaixo;
- colorbar;
- ranking pode ficar acima do mosaico;
- mostrar Top 6 no ranking;
- setores ficam em fluxo vertical/responsivo;
- células podem diminuir para ~8–10px;
- labels no mosaico podem cair para Top 5.

Não tentar reproduzir exatamente o desktop comprimido.

---

## 19. Base de dados

Usar:

`exame_maiores_2026_1000_empresas.csv`

Fonte canônica.

Campos:

```text
posicao_receita
empresa
setor_primario
receita_2025_mil_reais
receita_2024_mil_reais
lucro_liquido_2025_mil_reais
patrimonio_liquido_2025_mil_reais
ativo_total_2025_mil_reais
cidade_sede
estado
pagina_pdf
```

Na inicialização, validar:

```text
len === 1000
posicao_receita === 1...1000
```

Criar internamente:

```text
id = exame2026_0001
...
id = exame2026_1000
```

Não deduplicar.

### 19.1 Exceção documentada: linha 418 (entidade não divulgada)

Na fonte, `posicao_receita = 418` está anonimizada: `empresa = ***(2)`, setor Tecnologia e Telecomunicações, cidade e UF `-` e todos os valores financeiros `***(2)`.

Regras:

- A linha permanece como uma das 1.000 células e mantém sua posição fixa no mosaico (id `exame2026_0418`), preservando exatamente as 1.000 entidades da fonte.
- Nome exibido: `Empresa não divulgada`.
- Não inventar cidade, UF ou dados financeiros (ficam `null`).
- **Não consultar o Jev** para esta linha.
- `associationScore = null`.
- A célula usa sempre um tom neutro próprio, visualmente discreto, distinto da escala de associação.
- Fica fora do ranking "Mais associadas".
- Tooltip:
  - `Empresa não divulgada pela fonte`
  - `Associação não calculada`
- Em uma consulta normal: 1.000 células no frontend, 999 empresas avaliadas pelo Jev, batches de no máximo 250 (por exemplo 250 + 250 + 250 + 249). Os ids de pergunta (`e0001…`) continuam seguindo `posicao_receita`; a linha 418 simplesmente não é enviada.
- A regra "1.000 scores" (§43) passa a ser "999 scores + 1 célula sem score".

---

## 20. Entity resolution / contexto do Jev

Nunca mandar apenas:

`Atlas`

Nem somente:

`Atlas — Atacado e Varejo`

Construir um contexto mínimo usando exclusivamente a EXAME:

```text
{empresa} — empresa atuante no Brasil no setor {setor_primario},
sediada em {cidade_sede}, {estado}
```

Exemplo:

> Atlas — empresa atuante no Brasil no setor Atacado e Varejo, sediada em Esteio, RS

Outro:

> Weg — empresa atuante no Brasil no setor Bens de Capital e Eletroeletrônicos, sediada em Jaraguá do Sul, SC

Objetivo:

> minimizar ambiguidade de entidade sem enrichment externo.

Se cidade ou UF estiverem ausentes, omitir elegantemente.

Nunca inventar informação.

Este contexto expandido existe apenas no backend.

O frontend continua mostrando somente `empresa`.

---

## 21. Não fazer enrichment no MVP

Não buscar:

- site da empresa;
- Wikipedia;
- controlador;
- produtos;
- marcas;
- notícias;
- descrições corporativas;
- LinkedIn;
- embeddings;
- RAG.

O experimento é deliberadamente:

> **conhecimento nativo do modelo + identidade mínima fornecida pela EXAME.**

---

## 22. Prompt Jev validado

Para cada empresa criar uma pergunta `noul`.

Usar semanticamente este prompt:

```text
Um analista de mercado incluiria a empresa "{companyContext}"
entre as empresas que participam de forma economicamente relevante
do mercado, cadeia de valor ou ecossistema relacionado ao tema
descrito no state?
```

Criteria TRUE:

```text
A empresa possui relação empresarial específica e relevante com o tema
por produtos, serviços, infraestrutura, insumos, tecnologia,
distribuição ou participação direta em sua cadeia de valor.
```

Criteria FALSE:

```text
A empresa é apenas usuária, cliente ou beneficiária genérica do tema,
ou sua relação é incidental, remota ou comum à maioria das grandes
empresas.
```

Tipo:

```json
"type": "noul"
```

Interpretar `noul` como:

> grau de associação utilizado pela visualização.

Não descrevê-lo ao usuário como correlação estatística.

---

## 23. Request Jev

Endpoint:

```text
POST https://api.typesafe.ai/v1/systemone
```

Header:

```text
Authorization: Bearer ${TYPESAFE_API_KEY}
Content-Type: application/json
```

Modelo configurável:

```text
JEV_MODEL=jev-latest
```

Estrutura conceitual:

```json
{
  "model": "jev-latest",
  "state": {
    "tema": "data centers"
  },
  "questions": {
    "e0001": {
      "type": "noul",
      "instructions": "...",
      "criteria": {
        "true": "...",
        "false": "..."
      }
    }
  }
}
```

IDs de perguntas:

```text
e0001
e0002
...
e1000
```

---

## 24. Batching

Configuração padrão:

```text
JEV_BATCH_SIZE=250
```

1.000 empresas:

```text
batch 1: 1–250
batch 2: 251–500
batch 3: 501–750
batch 4: 751–1000
```

Os quatro batches devem ser disparados **em paralelo**.

Usar:

```typescript
Promise.all(...)
```

ou `Promise.allSettled` com tratamento apropriado.

Não usar quatro API keys.

Uma única chave foi suficiente nos benchmarks.

---

## 25. Evidência empírica já validada

Não desperdiçar tempo rebenchmarkando isto na implementação.

Foi medido:

```text
1000 empresas
4 batches paralelos × 250
~0,9 s em uma busca individual
```

Stress test:

```text
16 usuários simultâneos
64 requests concorrentes
16.000 avaliações
0 erros

mediana ≈ 1,25 s
máximo ≈ 1,55 s
```

Batch de 500 falhou com:

```text
max_tokens_exceeded
```

Batch de 250 passou inclusive usando as 250 descrições de contexto mais longas:

```text
input_tokens: 41.812
output_tokens: 5.004
```

Portanto:

> 250 é o tamanho operacional padrão.

---

## 26. Fallback para limite de tokens

Apesar de 250 estar validado, implementar defesa.

Se um batch retornar:

```text
max_tokens_exceeded
```

dividir apenas aquele batch em dois:

```text
250 → 125 + 125
```

e repetir.

Não refazer os outros batches.

---

## 27. Retry

Para:

- timeout;
- HTTP 429;
- HTTP 5xx;

fazer até 2 retries por batch, com pequeno exponential backoff + jitter.

Não repetir automaticamente erro 4xx semântico, exceto `max_tokens_exceeded`, que usa split.

Timeout sugerido por request:

~10–15 segundos.

---

## 28. Falha parcial

Nunca apresentar silenciosamente um mapa com apenas 750 empresas.

Se um batch continuar falhando após retries:

- preservar visualização anterior;
- mostrar mensagem discreta:
  **“Não foi possível concluir esta análise. Tente novamente.”**
- permitir retry.

Não substituir scores ausentes por zero.

---

## 29. Cache

Implementar cache server-side.

Chave deve considerar:

```text
tema_normalizado
dataset_version
prompt_version
context_version
model
```

Exemplo conceitual:

```text
semantic-map:v1:<hash>
```

TTL sugerido:

**7 dias**

Cachear resposta completa das 1.000 empresas.

Cache hit deve retornar praticamente instantaneamente.

---

## 30. Deduplicação de buscas simultâneas

Se várias pessoas pesquisarem `data centers` simultaneamente:

> realizar apenas um cálculo.

As outras requisições devem aguardar o mesmo resultado.

Em produção distribuída, usar Redis lock / `SET NX` ou mecanismo equivalente.

Fluxo:

```text
request
 ↓
cache?
 ├── sim → retorna
 ↓
há cálculo deste tema em andamento?
 ├── sim → aguarda resultado
 ↓
adquire lock
 ↓
Jev
 ↓
salva cache
 ↓
libera lock
```

---

## 31. Redis

Arquitetura preferencial para produção:

- Redis/Upstash ou Redis compatível;
- cache;
- lock/deduplicação;
- rate limiting.

Em desenvolvimento local, permitir fallback para `Map` em memória.

O app não deve deixar de funcionar localmente sem Redis.

---

## 32. Rate limiting

Como o app será público, proteger endpoint.

Sugestão inicial:

> até 10–12 pesquisas novas não cacheadas por minuto por IP.

Cache hits podem ter limite muito mais permissivo.

Responder com mensagem amigável em caso de excesso.

Nunca expor detalhes internos da API.

---

## 33. Segurança

`TYPESAFE_API_KEY` somente server-side.

Nunca:

- enviar ao browser;
- usar `NEXT_PUBLIC_`;
- gravar no repo;
- incluir no bundle;
- retornar em erro.

Criar `.env.example`:

```text
TYPESAFE_API_KEY=
JEV_MODEL=jev-latest
JEV_BATCH_SIZE=250

REDIS_URL=
REDIS_TOKEN=
```

---

## 34. Stack recomendada

Usar uma stack simples:

### Frontend/backend

- Next.js, versão estável atual;
- App Router;
- TypeScript;
- React;
- Tailwind CSS.

### Dados

CSV carregado server-side e transformado em estrutura tipada.

### Cache

Redis compatível / Upstash.

### Deploy

Arquitetura compatível com Vercel.

Evitar dependências pesadas sem necessidade.

---

## 35. Estrutura sugerida

```text
app/
  page.tsx
  api/
    search/
      route.ts

components/
  Header.tsx
  SearchBar.tsx
  ModelQuestion.tsx
  ColorLegend.tsx
  SectorMosaic.tsx
  SectorPanel.tsx
  CompanyCell.tsx
  CompanyTooltip.tsx
  AssociationRanking.tsx
  MethodologyModal.tsx

lib/
  companies.ts
  jev.ts
  batching.ts
  cache.ts
  rateLimit.ts
  normalizeTheme.ts
  colors.ts
  formatters.ts

data/
  exame_maiores_2026_1000_empresas.csv

types/
  company.ts
  api.ts
```

Não precisa seguir os nomes literalmente se houver motivo técnico melhor, mas preservar separação de responsabilidades.

---

## 36. API interna do frontend

Frontend chama somente:

```text
POST /api/search
```

Payload:

```json
{
  "theme": "data centers"
}
```

Resposta:

```json
{
  "theme": "data centers",
  "question": "Quais das 1.000...",
  "cached": false,
  "model": "jev-1.13.0",
  "elapsedMs": 912,
  "results": [
    {
      "id": "exame2026_0067",
      "rank": 67,
      "company": "TIM",
      "sector": "Tecnologia e Telecomunicações",
      "city": "...",
      "state": "...",
      "revenue2025ThousandsBRL": 123456,
      "associationScore": 0.81
    }
  ]
}
```

Ordenar `results` pela posição original da EXAME.

O frontend cria o ranking por score.

---

## 37. Modal “Como funciona”

Texto curto e transparente.

Explicar:

### Universo

As 1.000 maiores empresas por receita da EXAME Melhores e Maiores 2026.

### Associação

Cada empresa é avaliada em relação ao tema digitado.

### Contexto

O modelo recebe nome, setor e localização da empresa para reduzir ambiguidades.

### Interpretação

O percentual representa um **grau estimado de associação com a pergunta exibida**, não correlação estatística, causalidade ou probabilidade de desempenho futuro.

### Entidades

Empresas e subsidiárias aparecem conforme o ranking original; não há consolidação por grupo econômico.

### Limitações

Modelos podem produzir associações imperfeitas, especialmente para entidades menos documentadas.

---

## 38. Rodapé

Muito discreto:

> **Base: EXAME Melhores e Maiores 2026 • Associação semântica: Jev / TypeSafe**

Pode haver link discreto para metodologia.

---

## 39. Analytics

Preparar eventos, mesmo que o provider seja conectado depois:

```text
search_submitted
search_success
search_error
cache_hit
company_hover
methodology_opened
```

Para `search_success`, registrar:

- tema normalizado;
- latency;
- cache hit/miss.

Nunca registrar API key.

---

## 40. Performance frontend

Renderizar 1.000 células sem canvas obrigatório; DOM é suficiente se componentes forem leves.

Evitar rerender individual desnecessário.

Memoizar:

- empresas;
- setor;
- layout.

Ao mudar tema, atualizar principalmente:

- `associationScore`;
- fill;
- labels;
- ranking.

Não recalcular geometria.

---

## 41. Acessibilidade

Cada célula deve ser focável ou, no mínimo, possuir `aria-label` contendo:

```text
Weg, 65 por cento de associação, Bens de Capital e Eletroeletrônicos
```

Tooltip deve funcionar por hover e teclado.

Garantir contraste de texto.

A cor não deve ser a única forma de descobrir a associação: tooltip e ranking complementam.

---

## 42. Critérios de aceite visual

A implementação só está aprovada se:

- fundo for off-white;
- o visual parecer leve;
- houver claramente uma grande superfície de mosaico;
- houver colorbar;
- houver ranking lateral;
- a pergunta ao modelo estiver visível;
- 1.000 células forem renderizadas;
- células tiverem tamanho igual;
- nomes não poluírem o mosaico;
- top empresas tiverem labels;
- setores forem visualmente distinguíveis;
- mudança de tema produza forte efeito de recoloração;
- a interface não pareça Power BI/Tableau;
- não haja dark theme dominante;
- não haja bolhas.

---

## 43. Critérios de aceite funcional

Obrigatórios:

1. Carregar exatamente 1.000 empresas.
2. Renderizar cada empresa uma única vez.
3. Manter posições estáveis entre consultas.
4. Pesquisar somente no submit.
5. Exibir pergunta correspondente ao termo.
6. Fazer 4 batches paralelos de 250.
7. Usar nome + setor + cidade + UF como contexto.
8. Retornar 1.000 scores antes de atualizar mapa.
9. Colorir células usando score contínuo.
10. Ordenar ranking lateral por score.
11. Mostrar percentuais corretamente.
12. Cache funcionar.
13. Busca igual simultânea ser deduplicada.
14. API key nunca chegar ao browser.
15. Hover mostrar metadados.
16. Layout responsivo.
17. Falha parcial não gerar visual enganoso.
18. Nunca chamar score de correlação.

---

## 44. Validações antes de considerar concluído

Testar manualmente pelo menos:

### `data centers`

Esperar forte presença de:

- telecom;
- infraestrutura elétrica;
- equipamentos;
- tecnologia.

### `café`

Esperar empresas diretamente ligadas a café/agro/alimentos.

### `aviação`

Esperar companhias aéreas, Embraer e cadeia relacionada.

### `celulose`

Esperar players de papel/celulose claramente no topo.

### `seca`

Esperar footprint mais transversal, especialmente agro, energia e saneamento.

Não hardcode esses resultados.

São somente sanity checks.

---

## 45. Não hardcodar buscas

A aplicação precisa aceitar qualquer tema razoável.

Os exemplos podem ser pré-cacheados, mas:

> resultados reais devem sempre vir do Jev.

Nunca criar mapa baseado em palavras-chave pré-programadas.

---

## 46. Resultado conceitual desejado

Quando alguém digitar:

# `data centers`

em aproximadamente um segundo deve acontecer:

> telecomunicações acende;  
> energia acende;  
> equipamentos acende;  
> tecnologia acende;  
> partes menos relacionadas permanecem quase neutras.

A pessoa deve entender o produto **antes de precisar ler uma explicação longa**.

Esse é o critério mais importante.

---

## 47. Prioridade de implementação

Implementar nesta ordem:

**primeiro:** ingestão/validação do CSV e layout estático com 1.000 células.

**segundo:** estética fiel ao protótipo.

**terceiro:** integração Jev.

**quarto:** animação e ranking.

**quinto:** tooltip.

**sexto:** cache/deduplicação/rate limit.

**sétimo:** mobile, metodologia e acabamento.

Não sacrificar a qualidade visual tentando implementar funcionalidades adicionais que não foram pedidas.

---

## 48. Regra final para o Claude

Não “melhore” o conceito adicionando funcionalidades.

Não adicione:

- chat;
- respostas textuais de IA;
- cards de insights;
- filtros complexos;
- gráficos extras;
- gauges;
- KPIs;
- tabelas;
- comparação de temas;
- download;
- login;
- favoritos;
- agentes.

A força do produto é deliberadamente esta:

> **uma busca + uma pergunta + um mosaico que acende + um ranking.**

Construa isso excepcionalmente bem antes de qualquer outra coisa.
