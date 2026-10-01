# Mapa Semântico da Economia Brasileira

A especificação autoritativa do produto está em `SPEC.md`.

Antes de fazer qualquer alteração:

1. Leia `SPEC.md` integralmente.
2. Inspecione `reference/reference.png`.
3. Valide `data/exame_maiores_2026_1000_empresas.csv`.

## Regras obrigatórias

- Não reinterpretar o produto nem adicionar funcionalidades não solicitadas.
- A referência visual deve ser seguida de perto.
- Interface 100% em português.
- Nunca expor `TYPESAFE_API_KEY` ao frontend.
- Não hardcodar resultados de temas.
- Não alterar a semântica validada do prompt Jev.
- Não usar RAG, embeddings, agentes, banco vetorial ou enrichment externo.
- Não usar bolhas.
- Não usar treemap com tamanhos variáveis por empresa.
- Todas as 1.000 empresas devem ter células do mesmo tamanho.
- As posições das empresas devem permanecer fixas entre pesquisas.
- O score altera cor, não tamanho nem posição.
- Antes de mudanças grandes, explique o plano.
- Rode build, lint e testes relevantes antes de declarar uma etapa concluída.

## Contexto do Jev

Cada empresa deve ser enviada ao Jev com contexto mínimo para desambiguação:

`{empresa} — empresa atuante no Brasil no setor {setor_primario}, sediada em {cidade_sede}, {estado}`

Esse contexto vem exclusivamente da base da EXAME.

Não buscar contexto externo.

## Batching

Usar por padrão:

- 4 batches paralelos
- 250 empresas por batch
- uma única API key
- fallback de split apenas se ocorrer `max_tokens_exceeded`

## Direção visual

A metáfora do produto é:

> **o tema acende determinadas partes da economia.**

A interface deve permanecer:

- leve;
- editorial;
- off-white;
- verde suave;
- com muito whitespace;
- com mosaico setorial como protagonista;
- com ranking lateral simples;
- sem aparência de dashboard corporativo pesado.

## Ordem de implementação

1. Ingestão e validação do CSV.
2. Layout visual completo com mosaico estático.
3. Integração Jev.
4. Animações, ranking e tooltip.
5. Cache, deduplicação e rate limiting.
6. Responsividade e acabamento.

Não avance para funcionalidades adicionais antes de concluir corretamente estas etapas.
