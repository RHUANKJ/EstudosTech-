# posse. — do edital à posse

App pessoal de estudo para concursos, feito para quem tem dificuldade com rotina e disciplina.
Você não decide o que estudar: o app monta a **missão do dia** com base no que a banca mais cobra, no que você mais erra e no que está há mais tempo sem ver.

## O que tem

- **Vários editais.** Alterne entre concursos. Já vêm prontos:
  - **PMPE – Soldado** (Edital 001/2026, Instituto AOCP, prova em 21/02/2027), com incidência real contada na prova de Soldado 2024;
  - **PMPE – 2º Tenente QOPM (CFO)** (mesmo edital);
  - **PCPE – Agente/Escrivão** (estrutura do edital anterior, Cebraspe; atualizar com o edital 2026).
- **Painel** com indicadores, ciclo de estudos (meta por disciplina), gráfico da semana, próximas revisões e mapa de constância.
- **Rotina por hora**: defina a hora de começo e quantas horas estuda em cada dia; a missão sai com horários (ex.: 19:00–19:50).
- **Agenda da semana**: os próximos 7 dias já planejados, hora a hora.
- **Missão do dia** e **estudo livre** (registre o que estudou fora do plano).
- **Modo resgate**: escolha 15, 30 ou 60 minutos para reorganizar os blocos pendentes.
- **Materiais da PMPE Soldado**: leia na missão ou durante o foco. A aba **Materiais** reúne os PDFs originais e mostra a cobertura por disciplina.
- **Onboarding** de 30 segundos no primeiro uso.
- **Instalável no celular** (PWA) e funciona offline.
- **Replanejamento automático**: se você falhar um dia, nada acumula. A fila se reorganiza.
- **Modo foco** com cronômetro, **sequência de dias**, **revisão espaçada** (1, 7 e 30 dias) e **desempenho por assunto**.
- **TecConcursos (link direcionado)**: cada assunto abre o seu caderno de questões no Tec. Você resolve lá e registra os acertos aqui.
- **IA de direcionamento** (Google Gemini grátis ou Claude):
  1. **Ler edital**: envie o PDF e ela monta disciplinas, pesos e assuntos.
  2. **Raio-X de provas anteriores**: envie PDFs de provas e ela classifica cada questão por assunto, gerando a incidência real.
  3. **Pesquisa na web**: estima a relevância de cada assunto e os temas mais cobrados pela banca, com fontes.
  4. **Mentor**: um chat que conhece o seu edital, a sua fila e a sua constância.

## Como a prioridade é calculada

Cada assunto recebe uma nota a partir de:

- **incidência**: questões em provas anteriores (70%) e relevância estimada pela IA (30%);
- **peso** da disciplina, ou seja, quantas questões ela tem na prova;
- **domínio** que você declarou (1 a 5);
- **taxa de erro** nas suas questões;
- **dias** desde a última vez que você viu o assunto.

## Como usar

Acesse **https://rhuankj.github.io/EstudosTech-/** e, no celular, use "Adicionar à tela inicial". Também funciona abrindo o `index.html` direto.
Os dados ficam só no navegador. Use **Ajustes → Exportar backup** de vez em quando.

### IA: grátis com o Google Gemini

1. Entre em https://aistudio.google.com/apikey com sua conta Google e clique em **Create API key**.
2. No app, vá em **Ajustes → IA → Google Gemini**, cole a chave e clique em **Conectar**. O app detecta sozinho os modelos liberados para a sua chave.

A camada gratuita tem limite de pedidos por minuto e por dia, e o Google pode usar o conteúdo enviado para melhorar os produtos dele.
Se quiser mais qualidade, dá para trocar para o **Claude (Anthropic)**, que é pago: crie a chave em https://console.anthropic.com. As chaves ficam só no seu navegador e não vão para o backup.

> Este modo, com a chave no navegador, serve para **uso pessoal**. Para abrir o app para outras pessoas, a IA precisa passar por um backend que guarde a chave no servidor.

### Biblioteca e servidor local

A biblioteca de PMPE Soldado funciona no GitHub Pages e ao abrir o `index.html` desta pasta. Para rodar o servidor local, execute `node server.cjs` com Node.js 22 ou superior e acesse **http://127.0.0.1:8787**. O servidor aceita conexões apenas na máquina local.

Para usar o Claude pelo servidor, defina `ANTHROPIC_API_KEY` em um arquivo `.env` ao lado de `server.cjs`, execute `node --env-file=.env server.cjs` e selecione Claude em **Ajustes → IA**.

Os PDFs e o catálogo de trechos ficam em `biblioteca-local/`. O backup do progresso guarda os registros de estudo separadamente. Para mudar de endereço, exporte o backup no endereço antigo e importe no novo.

## Integração com o TecConcursos

O Tec não tem API pública e a raspagem do site provavelmente viola os termos de uso. Por isso, a integração atual é por link direcionado.
A proposta de parceria oficial está em [`PARCERIA-TEC.md`](PARCERIA-TEC.md).

## Estrutura

- `index.html`: o app inteiro (HTML, CSS e JS, sem build).
- `editais.js`: os modelos de edital (PMPE Soldado, PMPE Oficial, PCPE).
