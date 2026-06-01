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
      {
        kicker: "01 — IDENTIDADE",
        title: "O que é a Mundus Trade",
        blocks: [
          { kind: "p", text: "A Mundus Trade é um marketplace B2B global para exportação e importação de proteínas animais. A plataforma conecta frigoríficos (suppliers) de qualquer país do mundo com importadores, traders e compradores (buyers) da China, Oriente Médio, Ásia, Europa, África e Américas." },
          { kind: "p", text: "A Mundus não é uma trading. Não compra nem vende carne. É o canal digital onde frigoríficos publicam ofertas e buyers encontram, negociam e fecham negócio diretamente com o produtor, sem intermediário." },
          { kind: "p", text: "A Mundus é também uma camada de dados em tempo real: ao centralizar negociações globais de proteínas animais, gera inteligência de mercado que nenhum outro serviço do setor oferece com essa velocidade e granularidade." },
          { kind: "h3", text: "Dados cadastrais" },
          { kind: "table", head: ["Campo", "Valor"], rows: [
            ["Razão social", "Mundus Trade LLC"],
            ["Sede", "Ocoee, Florida, USA"],
            ["Fundador", "Fernando Nascimento"],
            ["Lançamento", "17 de novembro de 2024"],
            ["Modelo de receita", "Comissão de 0,30% sobre o valor do negócio fechado. Sem mensalidade. Sem custo de cadastro para nenhum dos lados."],
            ["Custo para o buyer", "Gratuito. O buyer nunca paga nada para usar a plataforma."],
          ]},
          { kind: "h3", text: "Missão" },
          { kind: "p", text: "Digitalizar e democratizar o comércio internacional de proteínas animais, conectando diretamente frigoríficos e compradores do mundo inteiro com transparência, velocidade e inteligência de mercado em tempo real." },
          { kind: "h3", text: "Visão" },
          { kind: "p", text: "Ser a principal plataforma global de negociação de proteínas animais e a referência de inteligência de mercado do setor, tornando o comércio B2B tão simples, rápido e transparente quanto qualquer marketplace moderno." },
          { kind: "h3", text: "Valores" },
          { kind: "ul", items: [
            "Transparência: preço, histórico e dados de mercado visíveis para quem está dentro da plataforma.",
            "Eficiência: o que hoje leva dias de e-mail deve acontecer em minutos.",
            "Confiança: fornecedores verificados, sem surpresa de qualidade ou documentação.",
            "Neutralidade: a Mundus não toma partido. Facilita o negócio sem substituir a relação comercial.",
            "Alcance global: suppliers e buyers de qualquer país são bem-vindos.",
            "Inteligência de mercado: dados reais, em tempo real, para decisões melhores dos dois lados.",
          ]},
          { kind: "callout", text: "Posicionamento em uma frase: o lugar onde frigoríficos do mundo inteiro encontram compradores globais, negociam e fecham com velocidade e transparência, sem intermediário, e onde o mercado de proteínas animais passa a ter dados em tempo real pela primeira vez." },
          { kind: "h3", text: "A história por trás da Mundus" },
          { kind: "p", text: "Fernando Nascimento tem mais de 28 anos de carreira no comércio internacional de carnes. Começou como office boy no Minerva Foods, em Barretos (SP), foi crescendo na área de exportação e mora nos Estados Unidos coordenando operações de trading global pela WMS Foods, empresa que fundou." },
          { kind: "p", text: "A WMS Foods opera há anos como trading intermediária no mercado de exportação de carnes, com contato direto com mais de 2.500 compradores globais em China, Oriente Médio, Europa e Américas e histórico comprovado de fechamento de negócios internacionais. Esse network e essa credibilidade são a base sobre a qual a Mundus foi construída." },
          { kind: "p", text: "A observação que gerou a Mundus foi direta: em 2024, frigoríficos e importadores do mundo inteiro ainda negociavam por e-mail, WhatsApp, WeChat e ligações. Para colocar uma oferta no mercado, um trader mandava 200 a 300 e-mails por dia. Para comprar, um importador esperava dias por cotação e ainda corria o risco de perder a janela de preço. A Mundus nasceu para eliminar esse atrito, criada por quem viveu o problema por quase três décadas." },
        ],
      },
    ],
  },
  en: { tagline: "", hero: "", badge: "", print: "", footer_kicker: "", footer_lines: [], signature: "", sections: [] },
  es: { tagline: "", hero: "", badge: "", print: "", footer_kicker: "", footer_lines: [], signature: "", sections: [] },
  zh: { tagline: "", hero: "", badge: "", print: "", footer_kicker: "", footer_lines: [], signature: "", sections: [] },
};

export function BrandbookDocument() {
  return <AdminDocView content={CONTENT} />;
}
