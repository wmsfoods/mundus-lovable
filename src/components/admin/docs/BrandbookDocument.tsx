import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

const CONTENT: Record<Lang, DocContent> = {
  pt: {
    tagline: "Brandbook institucional — referência interna",
    hero: "Identidade, posicionamento, modelo de negócio e diretrizes de comunicação da Mundus Trade.",
    badge: "DOCUMENTO INTERNO | OPERADORES MUNDUS | 2026",
    print: "Imprimir / Salvar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Mundus Trade LLC · Ocoee, Florida, USA",
      "Documento vivo · Versão 2.0",
      "Atualize sempre que houver mudança em estratégia, produto, público ou mensagem",
    ],
    signature: "MUNDUS TRADE | BRANDBOOK INTERNO | 2026",
    sections: [
      {
        kicker: "00 — COMO USAR",
        title: "Como usar este documento",
        blocks: [
          { kind: "lede", text: "Este brandbook tem dois papéis simultâneos: é o documento de referência interna da Mundus Trade e o arquivo que qualquer ferramenta de inteligência artificial deve receber antes de executar qualquer tarefa relacionada à marca." },
          { kind: "table", head: ["Contexto de uso", "O que este documento viabiliza", "Quem usa"], rows: [
            ["Onboarding de novos membros do time", "Qualquer pessoa que entra na Mundus entende em um documento o que a empresa é, para quem serve, como fala e o que não pode fazer.", "Gestão, todo o time"],
            ["Alimentação de IA para criação de posts", "LinkedIn, Instagram, WhatsApp e WeChat. A IA tem contexto completo de persona, tom, canal e objetivos antes de gerar qualquer conteúdo.", "Time de marketing, IA de conteúdo"],
            ["Alimentação de IA para comentários no setor", "Ferramentas que comentam em posts relevantes de terceiros para gerar visibilidade orgânica para a Mundus.", "Time de marketing, IA de engajamento"],
            ["Briefing para agências e freelancers", "Designers, redatores e produtores de vídeo recebem o contexto completo sem precisar de horas de briefing verbal.", "Fernando, Gustavo"],
            ["Alinhamento interno antes de abordagens comerciais", "Qualquer pessoa do time revisa o documento antes de ligar, mandar mensagem ou fazer uma reunião com supplier ou buyer.", "Gustavo, time comercial, Fernando"],
            ["Treinamento contínuo do time", "Base de referência para revisar tom, argumentos e respostas a objeções em qualquer reunião interna.", "Todo o time"],
            ["Geração de e-mails e mensagens B2B", "A IA usa o contexto de persona e tom para redigir abordagens personalizadas para cada perfil de contato.", "Time comercial"],
            ["Criação de materiais de apresentação", "Decks, one-pagers e landing pages partem deste documento como fonte única de verdade sobre a marca.", "Todo o time"],
          ]},
          { kind: "callout", text: "Instrução para IA: antes de executar qualquer tarefa relacionada à Mundus Trade, leia este documento na íntegra. Não assuma nenhuma informação que não esteja aqui. Se precisar de informação ausente, pergunte ao usuário antes de prosseguir." },
        ],
      },
