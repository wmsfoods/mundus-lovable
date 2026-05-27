import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

const CONTENT: Record<Lang, DocContent> = {
  pt: {
    tagline: "Treinamento Buyer — apresentação da plataforma",
    hero: "Como transformar a abordagem ao buyer em uma conversa que gera ativação. Menos pitch, mais escuta, mais curiosidade.",
    badge: "MATERIAL INTERNO | TIME COMERCIAL — BUYER | 2026",
    print: "Imprimir / Salvar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Material de treinamento interno — persona Buyer",
      "Use antes de toda call de discovery com importadores",
      "Atualize sempre que aprender algo novo em campo",
    ],
    signature: "MUNDUS TRADE | TREINAMENTO BUYER | 2026",
    sections: [
      {
        kicker: "00 — DIAGNÓSTICO",
        title: "O problema atual nas calls com buyers",
        blocks: [
          { kind: "p", text: "Clientes estão cadastrados, mas nenhum ativou. O problema não é a plataforma — é como estamos apresentando ela. Hoje a call está muito mais centrada em explicar a plataforma do que em entender o cliente." },
          { kind: "callout", text: "O objetivo não é convencer o cliente de que a Mundus é boa — é fazer ele chegar na conclusão de que ele precisa dela." },
          { kind: "h3", text: "A objeção silenciosa" },
          { kind: "quote", text: "\"Mas tem fornecedor real aqui? Isso vai funcionar de verdade?\"" },
          { kind: "p", text: "Essa objeção não se resolve explicando a plataforma. Se resolve fazendo ele falar sobre como compra hoje — e conectando a dor dele à solução." },
          { kind: "p", text: "Isso não é falta de esforço — é falta de método. Ninguém aqui aprendeu formalmente como fazer uma call de venda consultiva." },
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Por que escutar mais converte mais",
        blocks: [
          { kind: "cards3", items: [
            { t: "Gong", d: "Melhores calls: cliente fala 60–70% do tempo. Top performers chegam perto de 70–80%." },
            { t: "HubSpot", d: "Discovery eficaz = mais perguntas abertas + escuta ativa." },
            { t: "Challenger Sale", d: "Os melhores vendedores não explicam melhor — fazem o cliente pensar melhor." },
          ]},
          { kind: "callout", text: "Calls onde o vendedor fala mais de 60% do tempo têm taxa de conversão 40% menor (Gong)." },
        ],
      },
      {
        kicker: "02 — FRAMEWORKS",
        title: "Referências que sustentam o método",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Ensinar e provocar, não empurrar. O vendedor desafia o cliente a pensar diferente sobre o próprio problema." },
            { t: "SPIN Selling", d: "Situation → Problem → Implication → Need-Payoff. Constrói credibilidade antes de apresentar o produto." },
            { t: "Gap Selling", d: "A venda acontece quando você entende profundamente o gap do cliente — onde ele está vs. onde quer chegar." },
          ]},
          { kind: "table", head: ["Letra", "Tipo", "Objetivo"], rows: [
            ["S", "Situation", "Identifica o contexto do cliente."],
            ["P", "Problem", "Revela desafios enfrentados."],
            ["I", "Implication", "Explora consequências dos problemas."],
            ["N", "Need-Payoff", "Leva o cliente a reconhecer o valor da solução."],
          ]},
        ],
      },
      {
        kicker: "03 — ANTES vs DEPOIS",
        title: "A inversão de lógica na call",
        blocks: [
          { kind: "table", head: ["❌ Como está hoje", "✅ Como deveria ser"], rows: [
            ["Enviar apresentação institucional (PDF)", "Entender como ele compra hoje antes de qualquer coisa"],
            ["Listar funcionalidades da plataforma", "Identificar onde o processo de sourcing trava"],
            ["Falar mais de 60% do tempo", "Cliente fala 60–70% do tempo"],
            ["Perguntas fechadas (\"você tem interesse?\")", "Perguntas abertas e exploratórias"],
            ["Sair sem próximo passo definido", "Sempre sair com data + ação + responsável"],
          ]},
          { kind: "callout", text: "Conecte a Mundus ao que ELE falou — nunca ao que VOCÊ quer mostrar." },
        ],
      },
      {
        kicker: "04 — PERSONAS",
        title: "Com quem você está falando muda tudo",
        blocks: [
          { kind: "p", text: "Identifique a persona ANTES da call. O que você vai mostrar na plataforma depende disso." },
          { kind: "cards3", items: [
            { t: "Importador / Distribuidor Estabelecido", d: "Já compra do Brasil. Dor: processo lento, dependência de traders que encarecem e opacizam. Argumento: acesso direto ao frigorífico, transparência de preço e specs, velocidade." },
            { t: "Comprador Novo no Brasil", d: "Quer entrar mas não tem rede. Dor: risco, desconfiança, dificuldade de qualificar fornecedores. Argumento: fornecedores verificados, documentação centralizada, sem intermediário para qualificar." },
            { t: "Trading / Intermediário", d: "Compra para revender. Perfil resistente — a Mundus ameaça o modelo dele. Foco em eficiência operacional, NÃO em transparência de preço. Nunca use \"sem intermediários\"." },
          ]},
        ],
      },
      {
        kicker: "05 — PRÉ-CALL",
        title: "Antes de ligar",
        blocks: [
          { kind: "ol", items: [
            { t: "Pesquise o buyer", d: "Quais proteínas compra, de quais origens, volume estimado, mercados que atende. LinkedIn e site." },
            { t: "Identifique a persona", d: "Importador estabelecido (eficiência), novo no Brasil (confiança) ou trading (operação)." },
            { t: "Verifique o histórico no Zoho", d: "Já houve contato anterior? O que foi dito? Qual foi a reação?" },
            { t: "Defina o objetivo real", d: "Não é \"apresentar a Mundus\" — é identificar pelo menos 1 dor real no processo de sourcing atual." },
            { t: "Tenha a plataforma aberta na visão de buyer", d: "Pronto para mostrar SÓ o que for relevante ao que ele disser." },
          ]},
        ],
      },
      {
        kicker: "06 — BASE WMS",
        title: "A base WMS Foods — um ativo estratégico",
        blocks: [
          { kind: "p", text: "A Mundus tem acesso a ~2.500 contatos da WMS Foods — importadores e traders que já conhecem o setor e, muitos deles, já conhecem o Fernando. Essa base é ouro. Mas precisa ser usada com estratégia, não em massa." },
          { kind: "cards3", items: [
            { t: "Caminho 1 — Abordagem Direta", d: "Prospecção individual sem mencionar WMS (Gustavo, Pauli ou Débora). ✅ Não expõe o modelo / Testa o pitch puro. ⚠️ Perde o ativo do relacionamento." },
            { t: "Caminho 2 — Via Relacionamento", d: "Fernando faz contato pessoal com quem tem vínculo próximo. ✅ Alta conversão e credibilidade. ⚠️ Depende do Fernando, expõe tensão WMS vs Mundus, não escala." },
            { t: "Caminho 3 — Híbrido ✓ Recomendado", d: "Contatos próximos de Fernando → caminho 2. Contatos frios → caminho 1. Exige mapeamento prévio da base com Fernando antes de qualquer abordagem." },
          ]},
        ],
      },
      {
        kicker: "07 — ABERTURA",
        title: "Rapport e a pergunta de ouro",
        blocks: [
          { kind: "h3", text: "Rapport — conexão real, não protocolo" },
          { kind: "ul", items: [
            "Evite \"tudo bem?\" genérico.",
            "Conecte com algo do mundo do comprador (histórico no Zoho ou pesquisa prévia).",
          ]},
          { kind: "callout", text: "\"Antes de entrar na Mundus em si, queria entender um pouco mais de como vocês fazem o sourcing hoje — pode ser?\"" },
          { kind: "h3", text: "A pergunta de ouro do buyer" },
          { kind: "quote", text: "\"Como você encontra novos fornecedores hoje? Me conta como é esse processo do começo ao fim.\"" },
          { kind: "p", text: "Se responder superficial:" },
          { kind: "ul", items: [
            "\"E quando você precisa de um corte específico que o seu fornecedor atual não tem — o que você faz?\"",
            "\"Isso acontece com frequência?\"",
          ]},
        ],
      },
      {
        kicker: "08 — OS 6 DESAFIOS",
        title: "Desafios recorrentes no sourcing internacional",
        blocks: [
          { kind: "callout", text: "REGRA DE OURO: explore no máximo 2–3 temas. Vá fundo em cada um. Nunca passe pelos 6 desafios de uma vez." },
          { kind: "p", text: "Abra com: \"Com base nas conversas com importadores desse mercado, identificamos alguns desafios. Antes de entrar neles, queria ouvir você: isso reflete a realidade de vocês ou tem algo diferente?\"" },
          { kind: "h3", text: "1. Sourcing / Operacional ⭐" },
          { kind: "ul", items: [
            "\"Como você encontra novos fornecedores hoje?\"",
            "\"Quanto tempo leva entre identificar um fornecedor e fechar o primeiro container?\"",
          ]},
          { kind: "h3", text: "2. Propostas desfragmentadas" },
          { kind: "ul", items: [
            "\"Você recebe propostas por email, WhatsApp, WeChat — como compara tudo isso?\"",
            "\"Já perdeu uma negociação por não ter conseguido comparar rápido?\"",
          ]},
          { kind: "h3", text: "3. Confiabilidade do fornecedor" },
          { kind: "ul", items: [
            "\"Como você qualifica um fornecedor novo hoje?\"",
            "\"Já teve problema com documentação, planta, certificação?\"",
          ]},
          { kind: "h3", text: "4. Visibilidade de mercado" },
          { kind: "ul", items: [
            "\"Você tem visibilidade do que está disponível no mercado, ou depende do que chega?\"",
          ]},
          { kind: "h3", text: "5. Velocidade / eficiência" },
          { kind: "ul", items: [
            "\"Quanto tempo isso toma? Tem algo que poderia ser mais eficiente?\"",
            "Se responder superficial: \"Pode me dar um exemplo real do dia a dia?\"",
          ]},
          { kind: "h3", text: "6. Ganho pessoal" },
          { kind: "ul", items: [
            "\"Como você é avaliado — por volume, margem, novos fornecedores qualificados?\"",
            "\"Se o processo de sourcing fosse 50% mais rápido, o que isso mudaria no seu dia a dia?\"",
          ]},
        ],
      },
      {
        kicker: "09 — OBJEÇÃO CHICKEN-EGG",
        title: "\"Mas tem fornecedor real aqui?\"",
        blocks: [
          { kind: "p", text: "Essa objeção não se resolve ignorando. E não se resolve mentindo." },
          { kind: "callout", text: "\"Hoje a plataforma está em fase de ativação — temos fornecedores entrando e ofertas reais subindo. Você entraria como early adopter, com acesso direto a quem está chegando agora.\"" },
          { kind: "p", text: "Enquadre como vantagem (early adopter), não como problema. Elimina a desculpa: remove o argumento \"vou esperar a plataforma estar mais cheia\"." },
          { kind: "callout", text: "Nunca diga \"a plataforma está completa\" se não estiver. O buyer vai descobrir — e vai embora." },
        ],
      },
      {
        kicker: "10 — DA CONVERSA À DEMO",
        title: "Como mostrar a plataforma",
        blocks: [
          { kind: "callout", text: "\"Perfeito — isso me ajuda muito a entender. Vou te mostrar só a parte que conecta com o que você comentou, pode ser?\"" },
          { kind: "p", text: "Máximo ~20 minutos de plataforma. Não é tour — é conexão." },
          { kind: "cards3", items: [
            { t: "Falou de sourcing lento", d: "Mostre busca por corte, origem e incoterm + como mandar bid." },
            { t: "Falou de propostas desfragmentadas", d: "Mostre comparação lado a lado de ofertas." },
            { t: "Falou de confiabilidade", d: "Mostre perfil de fornecedor, documentação e certificações centralizadas." },
          ]},
          { kind: "p", text: "Dica: grave um vídeo curto (2–3 min) mostrando a visão do buyer — sem áudio. Vocês narram ao vivo." },
          { kind: "callout", text: "Nunca mostre uma funcionalidade que ele não mencionou. Cada coisa sem conexão é um sinal de que você não estava ouvindo." },
        ],
      },
      {
        kicker: "11 — FECHAMENTO",
        title: "Nunca sair sem próximo passo",
        blocks: [
          { kind: "h3", text: "Perguntas de fechamento" },
          { kind: "ul", items: [
            "\"O que mais fez sentido pra você de tudo que viu hoje?\"",
            "\"Tem algo que você sentiu falta?\"",
            "\"Você tem alguma demanda aberta agora que a gente poderia testar juntos na plataforma?\"",
            "\"Quem do seu time precisaria estar envolvido nessa decisão?\"",
          ]},
          { kind: "h3", text: "Próximo passo concreto" },
          { kind: "ol", items: [
            { t: "Ideal", d: "Simular uma busca ao vivo na call, com filtros reais do produto que ele mencionou." },
            { t: "Se não der tempo", d: "Marcar call no mesmo dia ou dia seguinte para fazer juntos." },
          ]},
          { kind: "callout", text: "REGRA NÃO NEGOCIÁVEL: nunca sair sem próximo passo com data + ação + responsável. \"Vou pensar\" NÃO é próximo passo." },
        ],
      },
      {
        kicker: "12 — PÓS-CALL",
        title: "O que acontece depois determina tudo",
        blocks: [
          { kind: "cards2", items: [
            { t: "Registrar no Zoho — na hora", d: "Nome, cargo, persona identificada, dores mencionadas (palavras exatas do buyer), o que foi mostrado, próximo passo e data." },
            { t: "Email de follow-up — em até 2h", d: "Personalize a dor mencionada. Duas opções de horário, nunca pergunta aberta. \"20 minutos na prática\", não \"reunião\"." },
          ]},
          { kind: "callout", text: "Mais de 3 tentativas sem resposta vira spam e queima o contato. Marque como \"em pausa\" no Zoho com lembrete para 2 semanas." },
        ],
      },
      {
        kicker: "13 — TEMPLATES",
        title: "Mensagens prontas para o buyer",
        blocks: [
          { kind: "h3", text: "① Fez ao vivo — busca/demanda ativa (até 30 min)" },
          { kind: "callout", text: "\"[Nome], sua busca está no ar. Quando aparecer uma oferta que encaixe no que você descreveu, você recebe a notificação direto pela plataforma. Qualquer movimentação, me chama — acompanho com você. [Seu nome] — Mundus Trade / [link]\"" },
          { kind: "h3", text: "② Personalização da dor (obrigatório no follow-up)" },
          { kind: "p", text: "Email sem esse ponto vai para o lixo. Sempre referencie EXATAMENTE a dor que ele mencionou na call." },
          { kind: "h3", text: "③ Reagendamento (após 15 min sem resposta)" },
          { kind: "callout", text: "\"[Nome], parece que ficou complicado hoje — sem problema. Quando funciona melhor pra você essa semana? Tenho disponibilidade [opção 1] ou [opção 2]. [Seu nome] — Mundus Trade\"" },
          { kind: "h3", text: "④ Ancoragem — quer fazer sozinho" },
          { kind: "callout", text: "\"[Nome], imagino que queira ter autonomia — faz todo sentido. Só queria propor: que tal 20 minutos juntos para a primeira busca? Assim você já sai com tudo configurado e qualquer dúvida resolve na hora.\"" },
          { kind: "h3", text: "⑤ Última tentativa (3ª tentativa sem resposta)" },
          { kind: "callout", text: "\"[Nome], se ainda fizer sentido, me dá um horário — me adapto. Se não for mais o momento, também tudo bem — só me avisa pra eu não ficar tentando na hora errada.\" Marque no Zoho como \"em pausa\" com lembrete para 2 semanas." },
        ],
      },
      {
        kicker: "14 — RESUMO",
        title: "Checklist final",
        blocks: [
          { kind: "h3", text: "❌ NÃO FAZER" },
          { kind: "ul", items: [
            "Enviar o PDF institucional sem conversa antes.",
            "Falar mais de 40% do tempo.",
            "Fazer perguntas fechadas (sim/não).",
            "Ligar sem pesquisar o buyer e identificar a persona.",
            "Mostrar funcionalidade que ele não mencionou.",
            "Sair sem próximo passo definido.",
          ]},
          { kind: "h3", text: "✅ FAZER" },
          { kind: "ul", items: [
            "Pesquisar buyer + identificar persona antes da call.",
            "Abrir com rapport real, não protocolo.",
            "Fazer a pergunta de ouro e ficar em silêncio.",
            "Pedir exemplo real do dia a dia de sourcing.",
            "Explorar a dor até o fim — ir fundo em 2–3 temas.",
            "Antecipar a objeção chicken-egg com honestidade + enquadramento de early adopter.",
            "Mostrar só o que conecta com o que ELE falou.",
            "Registrar tudo no Zoho logo depois.",
            "Sair sempre com data + ação + responsável.",
          ]},
          { kind: "callout", text: "ONDE EXISTE INTENÇÃO, EXISTE EVOLUÇÃO." },
        ],
      },
    ],
  },

  en: {
    tagline: "Buyer training — platform discovery call",
    hero: "Turn the buyer approach into a conversation that drives activation. Less pitch, more listening, more curiosity.",
    badge: "INTERNAL MATERIAL | SALES TEAM — BUYER | 2026",
    print: "Print / Save PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Internal training material — Buyer persona",
      "Use before every discovery call with importers",
      "Update whenever you learn something new in the field",
    ],
    signature: "MUNDUS TRADE | BUYER TRAINING | 2026",
    sections: [
      {
        kicker: "00 — DIAGNOSIS",
        title: "What's happening on calls today",
        blocks: [
          { kind: "p", text: "Buyers sign up but nobody activates. The problem isn't the platform — it's how we present it. Today the call is far more focused on explaining the platform than on understanding the client." },
          { kind: "callout", text: "The goal isn't to convince the buyer that Mundus is good — it's to lead them to conclude they need it." },
          { kind: "h3", text: "The silent objection" },
          { kind: "quote", text: "\"But are there real suppliers here? Will this actually work?\"" },
          { kind: "p", text: "This objection isn't solved by explaining the platform. It's solved by getting them to talk about how they buy today — and connecting their pain to the solution." },
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Why listening converts more",
        blocks: [
          { kind: "cards3", items: [
            { t: "Gong", d: "Best calls: client speaks 60–70% of the time. Top performers reach 70–80%." },
            { t: "HubSpot", d: "Effective discovery = more open questions + active listening." },
            { t: "Challenger Sale", d: "The best salespeople don't explain better — they make the client think better." },
          ]},
          { kind: "callout", text: "Calls where the seller speaks more than 60% of the time have 40% lower conversion (Gong)." },
        ],
      },
      {
        kicker: "02 — FRAMEWORKS",
        title: "References behind the method",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Teach and provoke, don't push. Challenge the client to think differently about their own problem." },
            { t: "SPIN Selling", d: "Situation → Problem → Implication → Need-Payoff. Build credibility before presenting the product." },
            { t: "Gap Selling", d: "The sale happens when you deeply understand the client's gap — where they are vs. where they want to be." },
          ]},
          { kind: "table", head: ["Letter", "Type", "Goal"], rows: [
            ["S", "Situation", "Identifies the client's context."],
            ["P", "Problem", "Reveals challenges faced."],
            ["I", "Implication", "Explores consequences of problems."],
            ["N", "Need-Payoff", "Leads the client to recognise the value of the solution."],
          ]},
        ],
      },
      {
        kicker: "03 — BEFORE vs AFTER",
        title: "The logic inversion",
        blocks: [
          { kind: "table", head: ["❌ How it is today", "✅ How it should be"], rows: [
            ["Send the institutional deck (PDF)", "Understand how they buy today before anything else"],
            ["List platform features", "Identify where the sourcing process breaks"],
            ["Talk more than 60% of the time", "Client talks 60–70% of the time"],
            ["Closed questions (\"are you interested?\")", "Open, exploratory questions"],
            ["Leave without a defined next step", "Always leave with date + action + owner"],
          ]},
          { kind: "callout", text: "Connect Mundus to what THEY said — never to what YOU want to show." },
        ],
      },
      {
        kicker: "04 — PERSONAS",
        title: "Who you're talking to changes everything",
        blocks: [
          { kind: "p", text: "Identify the persona BEFORE the call. What you show on the platform depends on it." },
          { kind: "cards3", items: [
            { t: "Established Importer / Distributor", d: "Already buys from Brazil. Pain: slow process, dependence on traders that add cost and opacity. Argument: direct access to plants, price/spec transparency, speed." },
            { t: "New Buyer in Brazil", d: "Wants to enter but has no network. Pain: risk, distrust, difficulty qualifying suppliers. Argument: verified suppliers, centralised documentation, no middleman needed." },
            { t: "Trading / Intermediary", d: "Buys to resell. Resistant profile — Mundus threatens their model. Focus on operational efficiency, NOT price transparency. Never use \"no intermediaries\"." },
          ]},
        ],
      },
      {
        kicker: "05 — PRE-CALL",
        title: "Before you dial",
        blocks: [
          { kind: "ol", items: [
            { t: "Research the buyer", d: "Proteins, origins, estimated volume, markets served. LinkedIn and website." },
            { t: "Identify the persona", d: "Established importer (efficiency), new in Brazil (trust), or trading (operations)." },
            { t: "Check Zoho history", d: "Any prior contact? What was said? What was the reaction?" },
            { t: "Define the real goal", d: "Not \"present Mundus\" — identify at least 1 real pain in their current sourcing process." },
            { t: "Open the platform in buyer view", d: "Ready to show ONLY what's relevant to what they say." },
          ]},
        ],
      },
      {
        kicker: "06 — OPENING",
        title: "Rapport and the golden question",
        blocks: [
          { kind: "ul", items: [
            "Avoid generic \"how are you?\".",
            "Connect with something from the buyer's world (Zoho history or prior research).",
          ]},
          { kind: "callout", text: "\"Before getting into Mundus itself, I'd like to understand more about how you do sourcing today — does that work?\"" },
          { kind: "h3", text: "The buyer's golden question" },
          { kind: "quote", text: "\"How do you find new suppliers today? Walk me through the process from start to finish.\"" },
          { kind: "p", text: "If the answer is shallow:" },
          { kind: "ul", items: [
            "\"And when you need a specific cut your current supplier doesn't have — what do you do?\"",
            "\"Does that happen often?\"",
          ]},
        ],
      },
      {
        kicker: "07 — THE 6 CHALLENGES",
        title: "Recurring challenges in international sourcing",
        blocks: [
          { kind: "callout", text: "GOLDEN RULE: explore 2–3 topics maximum. Go deep on each one. Never run through all 6 at once." },
          { kind: "h3", text: "1. Sourcing / Operations ⭐" },
          { kind: "ul", items: [
            "\"How do you find new suppliers today?\"",
            "\"How long between identifying a supplier and closing the first container?\"",
          ]},
          { kind: "h3", text: "2. Fragmented proposals" },
          { kind: "ul", items: [
            "\"You get proposals by email, WhatsApp, WeChat — how do you compare them all?\"",
            "\"Ever lost a deal because you couldn't compare fast enough?\"",
          ]},
          { kind: "h3", text: "3. Supplier trust" },
          { kind: "ul", items: [
            "\"How do you qualify a new supplier today?\"",
            "\"Ever had issues with documentation, plant, certification?\"",
          ]},
          { kind: "h3", text: "4. Market visibility" },
          { kind: "ul", items: [
            "\"Do you have visibility of what's available, or do you depend on what reaches you?\"",
          ]},
          { kind: "h3", text: "5. Speed / efficiency" },
          { kind: "ul", items: [
            "\"How long does this take? Could it be more efficient?\"",
            "If shallow: \"Can you give me a real day-to-day example?\"",
          ]},
          { kind: "h3", text: "6. Personal gain" },
          { kind: "ul", items: [
            "\"How are you measured — volume, margin, new qualified suppliers?\"",
            "\"If sourcing were 50% faster, what would change in your day-to-day?\"",
          ]},
        ],
      },
      {
        kicker: "08 — CHICKEN-EGG OBJECTION",
        title: "\"Are there real suppliers here?\"",
        blocks: [
          { kind: "p", text: "Don't ignore. Don't lie." },
          { kind: "callout", text: "\"Today the platform is in activation phase — suppliers coming in and real offers going up. You'd come in as an early adopter, with direct access to who's arriving now.\"" },
          { kind: "p", text: "Frame it as an advantage (early adopter), not a problem. Removes the excuse \"I'll wait until it's fuller\"." },
          { kind: "callout", text: "Never say \"the platform is complete\" if it isn't. The buyer will find out — and leave." },
        ],
      },
      {
        kicker: "09 — FROM TALK TO DEMO",
        title: "How to show the platform",
        blocks: [
          { kind: "callout", text: "\"Perfect — that helps me understand. I'll show you just the part that connects to what you mentioned, okay?\"" },
          { kind: "p", text: "Max ~20 minutes of platform. Not a tour — it's connection." },
          { kind: "cards3", items: [
            { t: "Talked about slow sourcing", d: "Show search by cut, origin and incoterm + how to send a bid." },
            { t: "Talked about fragmented proposals", d: "Show side-by-side offer comparison." },
            { t: "Talked about trust", d: "Show supplier profile, centralised documentation and certifications." },
          ]},
          { kind: "callout", text: "Never show a feature they didn't mention. Each disconnected thing signals you weren't listening." },
        ],
      },
      {
        kicker: "10 — CLOSING",
        title: "Never leave without a next step",
        blocks: [
          { kind: "h3", text: "Closing questions" },
          { kind: "ul", items: [
            "\"What made the most sense to you from everything you saw today?\"",
            "\"Anything you felt was missing?\"",
            "\"Do you have an open demand right now we could test together on the platform?\"",
            "\"Who from your team would need to be involved in this decision?\"",
          ]},
          { kind: "callout", text: "NON-NEGOTIABLE RULE: never leave without a next step with date + action + owner. \"I'll think about it\" is NOT a next step." },
        ],
      },
      {
        kicker: "11 — POST-CALL",
        title: "What happens after determines everything",
        blocks: [
          { kind: "cards2", items: [
            { t: "Log in Zoho — immediately", d: "Name, role, persona identified, pains mentioned (the buyer's exact words), what was shown, next step and date." },
            { t: "Follow-up email — within 2h", d: "Personalise the pain mentioned. Two time options, never open-ended. \"20 minutes hands-on\", not \"a meeting\"." },
          ]},
          { kind: "callout", text: "More than 3 attempts without reply becomes spam and burns the contact. Mark \"paused\" in Zoho with a 2-week reminder." },
        ],
      },
      {
        kicker: "12 — SUMMARY",
        title: "Final checklist",
        blocks: [
          { kind: "h3", text: "❌ DON'T" },
          { kind: "ul", items: [
            "Send the institutional PDF without talking first.",
            "Talk more than 40% of the time.",
            "Ask closed (yes/no) questions.",
            "Call without researching the buyer and persona.",
            "Show features they didn't mention.",
            "Leave without a defined next step.",
          ]},
          { kind: "h3", text: "✅ DO" },
          { kind: "ul", items: [
            "Research buyer + identify persona before the call.",
            "Open with real rapport, not protocol.",
            "Ask the golden question and stay silent.",
            "Ask for a real day-to-day example.",
            "Explore pain fully — go deep on 2–3 topics.",
            "Anticipate chicken-egg with honesty + early-adopter framing.",
            "Show only what connects to what THEY said.",
            "Log everything in Zoho right after.",
            "Always leave with date + action + owner.",
          ]},
          { kind: "callout", text: "WHERE THERE IS INTENTION, THERE IS EVOLUTION." },
        ],
      },
    ],
  },

  es: {
    tagline: "Capacitación Buyer — presentación de la plataforma",
    hero: "Convertir la conversación con el buyer en una charla que active. Menos pitch, más escucha, más curiosidad.",
    badge: "MATERIAL INTERNO | EQUIPO COMERCIAL — BUYER | 2026",
    print: "Imprimir / Guardar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Material de capacitación interna — persona Buyer",
      "Úsalo antes de cada llamada de descubrimiento con importadores",
      "Actualízalo cuando aprendas algo nuevo en campo",
    ],
    signature: "MUNDUS TRADE | CAPACITACIÓN BUYER | 2026",
    sections: [
      {
        kicker: "00 — DIAGNÓSTICO",
        title: "El problema actual en las llamadas con buyers",
        blocks: [
          { kind: "p", text: "Los clientes están registrados, pero ninguno activa. El problema no es la plataforma — es cómo la presentamos. Hoy la llamada está centrada en explicar la plataforma más que en entender al cliente." },
          { kind: "callout", text: "El objetivo no es convencer al cliente de que Mundus es buena — es que llegue solo a la conclusión de que la necesita." },
          { kind: "quote", text: "\"¿Pero hay proveedores reales aquí? ¿Esto va a funcionar?\"" },
          { kind: "p", text: "Esta objeción no se resuelve explicando la plataforma. Se resuelve haciendo que él hable de cómo compra hoy — y conectando su dolor con la solución." },
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Por qué escuchar convierte más",
        blocks: [
          { kind: "cards3", items: [
            { t: "Gong", d: "Mejores llamadas: el cliente habla 60–70%. Top performers llegan al 70–80%." },
            { t: "HubSpot", d: "Discovery eficaz = más preguntas abiertas + escucha activa." },
            { t: "Challenger Sale", d: "Los mejores vendedores no explican mejor — hacen pensar mejor al cliente." },
          ]},
          { kind: "callout", text: "Llamadas donde el vendedor habla más del 60% tienen 40% menos conversión (Gong)." },
        ],
      },
      {
        kicker: "02 — FRAMEWORKS",
        title: "Referencias que sostienen el método",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Enseñar y provocar, no empujar." },
            { t: "SPIN Selling", d: "Situation → Problem → Implication → Need-Payoff. Credibilidad antes que producto." },
            { t: "Gap Selling", d: "La venta sucede cuando entiendes profundamente el gap del cliente." },
          ]},
        ],
      },
      {
        kicker: "03 — ANTES vs DESPUÉS",
        title: "La inversión de lógica",
        blocks: [
          { kind: "table", head: ["❌ Hoy", "✅ Como debería ser"], rows: [
            ["Enviar presentación institucional (PDF)", "Entender cómo compra antes de cualquier cosa"],
            ["Listar funcionalidades", "Identificar dónde se traba el sourcing"],
            ["Hablar más del 60%", "El cliente habla 60–70%"],
            ["Preguntas cerradas (¿te interesa?)", "Preguntas abiertas y exploratorias"],
            ["Salir sin próximo paso", "Siempre con fecha + acción + responsable"],
          ]},
        ],
      },
      {
        kicker: "04 — PERSONAS",
        title: "Con quién hablas cambia todo",
        blocks: [
          { kind: "cards3", items: [
            { t: "Importador / Distribuidor establecido", d: "Ya compra Brasil. Dolor: proceso lento, dependencia de traders. Argumento: acceso directo, transparencia, velocidad." },
            { t: "Comprador nuevo en Brasil", d: "Quiere entrar pero no tiene red. Dolor: riesgo, desconfianza. Argumento: proveedores verificados, documentación centralizada." },
            { t: "Trading / Intermediario", d: "Compra para revender. Resistente. Foco en eficiencia operacional, NO en transparencia de precio." },
          ]},
        ],
      },
      {
        kicker: "05 — PRE-CALL",
        title: "Antes de llamar",
        blocks: [
          { kind: "ol", items: [
            { t: "Investiga al buyer", d: "Proteínas, orígenes, volumen, mercados. LinkedIn y sitio." },
            { t: "Identifica la persona", d: "Establecido (eficiencia), nuevo (confianza) o trading (operación)." },
            { t: "Revisa historial en Zoho", d: "¿Hubo contacto previo? ¿Qué se dijo?" },
            { t: "Define el objetivo real", d: "No es \"presentar Mundus\" — es identificar al menos 1 dolor real." },
            { t: "Plataforma abierta en vista buyer", d: "Listo para mostrar SOLO lo relevante." },
          ]},
        ],
      },
      {
        kicker: "06 — APERTURA",
        title: "Rapport y la pregunta de oro",
        blocks: [
          { kind: "callout", text: "\"Antes de entrar en Mundus, me gustaría entender un poco más cómo hacen sourcing hoy — ¿puede ser?\"" },
          { kind: "quote", text: "\"¿Cómo encuentras nuevos proveedores hoy? Cuéntame el proceso de principio a fin.\"" },
          { kind: "p", text: "Si responde superficial: \"¿Y cuando necesitas un corte específico que tu proveedor actual no tiene — qué haces?\" / \"¿Pasa con frecuencia?\"" },
        ],
      },
      {
        kicker: "07 — LOS 6 DESAFÍOS",
        title: "Desafíos recurrentes en sourcing internacional",
        blocks: [
          { kind: "callout", text: "REGLA DE ORO: explora máximo 2–3 temas. Profundiza. Nunca pases por los 6 de una vez." },
          { kind: "ul", items: [
            "Sourcing / Operacional ⭐ — \"¿Cuánto tarda entre identificar y cerrar el primer container?\"",
            "Propuestas desfragmentadas — \"¿Cómo comparas email, WhatsApp, WeChat?\"",
            "Confiabilidad del proveedor — \"¿Cómo califica un proveedor nuevo?\"",
            "Visibilidad de mercado — \"¿Tiene visibilidad o depende de lo que llega?\"",
            "Velocidad — \"¿Algo que podría ser más eficiente?\"",
            "Ganancia personal — \"¿Cómo te miden — volumen, margen, proveedores?\"",
          ]},
        ],
      },
      {
        kicker: "08 — OBJECIÓN CHICKEN-EGG",
        title: "\"¿Hay proveedores reales aquí?\"",
        blocks: [
          { kind: "callout", text: "\"Hoy la plataforma está en activación — entrarías como early adopter, con acceso directo a quien llega ahora.\"" },
          { kind: "p", text: "Encuádralo como ventaja (early adopter), no como problema. Nunca digas que está completa si no lo está." },
        ],
      },
      {
        kicker: "09 — DE LA CONVERSACIÓN A LA DEMO",
        title: "Cómo mostrar la plataforma",
        blocks: [
          { kind: "callout", text: "\"Perfecto — te voy a mostrar solo la parte que conecta con lo que comentaste, ¿puede ser?\"" },
          { kind: "p", text: "Máximo ~20 minutos. No es tour — es conexión. Nunca muestres una funcionalidad que él no mencionó." },
        ],
      },
      {
        kicker: "10 — CIERRE",
        title: "Nunca salir sin próximo paso",
        blocks: [
          { kind: "ul", items: [
            "\"¿Qué fue lo que más te hizo sentido?\"",
            "\"¿Tienes alguna demanda abierta ahora que podamos probar juntos?\"",
            "\"¿Quién de tu equipo necesitaría estar involucrado?\"",
          ]},
          { kind: "callout", text: "REGLA NO NEGOCIABLE: siempre con fecha + acción + responsable. \"Voy a pensar\" NO es próximo paso." },
        ],
      },
      {
        kicker: "11 — POST-CALL",
        title: "Lo que pasa después lo determina todo",
        blocks: [
          { kind: "cards2", items: [
            { t: "Registrar en Zoho — al instante", d: "Nombre, cargo, persona, dolores (palabras exactas), próximo paso y fecha." },
            { t: "Email de follow-up — en 2h", d: "Personaliza el dolor mencionado. Dos opciones de horario. \"20 minutos en la práctica\"." },
          ]},
          { kind: "callout", text: "Más de 3 intentos sin respuesta = spam. Marca \"en pausa\" en Zoho con recordatorio a 2 semanas." },
        ],
      },
      {
        kicker: "12 — RESUMEN",
        title: "Checklist final",
        blocks: [
          { kind: "h3", text: "❌ NO HACER" },
          { kind: "ul", items: [
            "Enviar el PDF institucional sin conversar antes.",
            "Hablar más del 40% del tiempo.",
            "Preguntas cerradas (sí/no).",
            "Llamar sin investigar al buyer.",
            "Mostrar funcionalidades no mencionadas.",
          ]},
          { kind: "h3", text: "✅ HACER" },
          { kind: "ul", items: [
            "Investigar e identificar persona antes.",
            "Abrir con rapport real.",
            "Hacer la pregunta de oro y callar.",
            "Explorar el dolor hasta el fondo.",
            "Mostrar solo lo que conecta con lo que ÉL dijo.",
            "Siempre con fecha + acción + responsable.",
          ]},
          { kind: "callout", text: "DONDE HAY INTENCIÓN, HAY EVOLUCIÓN." },
        ],
      },
    ],
  },

  zh: {
    tagline: "买家培训 — 平台介绍通话",
    hero: "把对买家的接触变成能促成激活的对话。少推销、多倾听、多好奇。",
    badge: "内部资料 | 销售团队 — 买家 | 2026",
    print: "打印 / 保存 PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "内部培训资料 — 买家画像",
      "每次与进口商进行发现通话前使用",
      "在实践中学到新东西时随时更新",
    ],
    signature: "MUNDUS TRADE | 买家培训 | 2026",
    sections: [
      {
        kicker: "00 — 诊断",
        title: "当前买家通话的问题",
        blocks: [
          { kind: "p", text: "客户已注册,但无人激活。问题不在平台,而在我们的介绍方式。今天的通话更多在解释平台,而不是理解客户。" },
          { kind: "callout", text: "目标不是说服客户 Mundus 好 — 而是让他自己得出"我需要它"的结论。" },
          { kind: "quote", text: "\"这里真的有供应商吗?这真的能用吗?\"" },
          { kind: "p", text: "这个异议不能靠解释平台解决,而要让他讲今天怎么采购 — 然后把他的痛点连接到方案。" },
        ],
      },
      {
        kicker: "01 — 基准",
        title: "为什么倾听转化更高",
        blocks: [
          { kind: "cards3", items: [
            { t: "Gong", d: "最好的通话:客户说话占 60–70%。顶尖销售达到 70–80%。" },
            { t: "HubSpot", d: "有效的发现 = 更多开放式问题 + 主动倾听。" },
            { t: "Challenger Sale", d: "最好的销售不是解释得最好,而是让客户思考得最好。" },
          ]},
          { kind: "callout", text: "销售说话超过 60% 的通话,转化率低 40%(Gong)。" },
        ],
      },
      {
        kicker: "02 — 方法论",
        title: "支撑方法的框架",
        blocks: [
          { kind: "cards3", items: [
            { t: "Challenger Sale", d: "教导和挑战,不要推销。" },
            { t: "SPIN Selling", d: "情境→问题→影响→需求回报。先建立可信度。" },
            { t: "Gap Selling", d: "深入理解客户的差距 — 现状与目标之间。" },
          ]},
        ],
      },
      {
        kicker: "03 — 之前 vs 之后",
        title: "逻辑的反转",
        blocks: [
          { kind: "table", head: ["❌ 现状", "✅ 应该这样"], rows: [
            ["发送公司介绍 PDF", "先理解他今天怎么采购"],
            ["列举平台功能", "找出采购流程的卡点"],
            ["说话超过 60%", "客户说话 60–70%"],
            ["封闭式问题", "开放式探索问题"],
            ["没有明确下一步就结束", "每次都带着日期+行动+负责人离开"],
          ]},
        ],
      },
      {
        kicker: "04 — 客户画像",
        title: "对话对象决定一切",
        blocks: [
          { kind: "cards3", items: [
            { t: "成熟进口商 / 分销商", d: "已采购巴西。痛点:流程慢、依赖中间商。论点:直接对接、透明度、速度。" },
            { t: "巴西市场新买家", d: "想进入但没有人脉。痛点:风险、不信任。论点:已验证的供应商、文档集中。" },
            { t: "贸易商 / 中间商", d: "购买转售。抗拒型 — Mundus 威胁其模式。聚焦运营效率,不要谈价格透明度。" },
          ]},
        ],
      },
      {
        kicker: "05 — 通话前",
        title: "拨号之前",
        blocks: [
          { kind: "ol", items: [
            { t: "研究买家", d: "蛋白种类、来源、估计销量、服务市场。LinkedIn 和官网。" },
            { t: "识别画像", d: "成熟进口商、巴西新手或贸易商。" },
            { t: "查看 Zoho 历史", d: "之前有过接触吗?说了什么?" },
            { t: "明确真正目标", d: "不是"介绍 Mundus" — 而是找到至少 1 个真实痛点。" },
            { t: "以买家视角打开平台", d: "随时展示与他所说相关的内容。" },
          ]},
        ],
      },
      {
        kicker: "06 — 开场",
        title: "建立联系与黄金问题",
        blocks: [
          { kind: "callout", text: "\"在进入 Mundus 之前,我想多了解一下你们今天是怎么做采购的 — 可以吗?\"" },
          { kind: "quote", text: "\"你今天是怎么找到新供应商的?从头到尾给我讲讲这个流程。\"" },
          { kind: "p", text: "如果回答很表面:\"当你需要一个现有供应商没有的特定切块时,你怎么办?\" / \"这种情况经常发生吗?\"" },
        ],
      },
      {
        kicker: "07 — 六大挑战",
        title: "国际采购中的常见挑战",
        blocks: [
          { kind: "callout", text: "黄金规则:最多探索 2–3 个主题,深入挖掘。绝不一次过完六个。" },
          { kind: "ul", items: [
            "采购/运营 ⭐ — \"从识别供应商到关闭第一个柜要多久?\"",
            "提案碎片化 — \"邮件、微信、WhatsApp 你怎么比较?\"",
            "供应商可信度 — \"你怎么评估新供应商?\"",
            "市场可见性 — \"你能看到市场上什么货,还是被动等?\"",
            "速度 — \"有什么可以更高效的?\"",
            "个人收益 — \"你怎么被考核 — 销量、利润、新供应商?\"",
          ]},
        ],
      },
      {
        kicker: "08 — 鸡蛋异议",
        title: "\"这里真的有供应商吗?\"",
        blocks: [
          { kind: "callout", text: "\"平台目前处于激活阶段 — 你以早期采用者身份进入,直接接触正在入驻的供应商。\"" },
          { kind: "p", text: "把它定位为优势(早期采用者),而不是问题。绝不要在平台未满时说\"平台已经完整\"。" },
        ],
      },
      {
        kicker: "09 — 从对话到演示",
        title: "如何展示平台",
        blocks: [
          { kind: "callout", text: "\"太好了 — 我只展示与你提到的内容相关的部分,可以吗?\"" },
          { kind: "p", text: "最多约 20 分钟。不是导览 — 是连接。绝不展示他没提到的功能。" },
        ],
      },
      {
        kicker: "10 — 收尾",
        title: "绝不在没有下一步的情况下离开",
        blocks: [
          { kind: "ul", items: [
            "\"今天看到的所有东西里,什么最有意义?\"",
            "\"你现在有什么开放需求,我们可以一起在平台上测试?\"",
            "\"你团队里谁需要参与这个决定?\"",
          ]},
          { kind: "callout", text: "不可协商:始终带着日期+行动+负责人离开。\"我考虑一下\"不是下一步。" },
        ],
      },
      {
        kicker: "11 — 通话后",
        title: "通话后的动作决定一切",
        blocks: [
          { kind: "cards2", items: [
            { t: "立即在 Zoho 中记录", d: "姓名、职位、画像、痛点(买家原话)、所展示内容、下一步与日期。" },
            { t: "2 小时内跟进邮件", d: "个性化引用提到的痛点。两个时间选项。\"20 分钟实操\",不是\"会议\"。" },
          ]},
          { kind: "callout", text: "3 次以上无回应 = 垃圾邮件,会烧掉联系人。在 Zoho 标为"暂停",2 周后提醒。" },
        ],
      },
      {
        kicker: "12 — 总结",
        title: "最终清单",
        blocks: [
          { kind: "h3", text: "❌ 不要做" },
          { kind: "ul", items: [
            "对话前发送公司 PDF。",
            "说话超过 40% 时间。",
            "封闭式(是/否)问题。",
            "不研究买家就打电话。",
            "展示未被提及的功能。",
          ]},
          { kind: "h3", text: "✅ 要做" },
          { kind: "ul", items: [
            "通话前研究买家并识别画像。",
            "用真实的连接开场,而非礼仪。",
            "问黄金问题并保持沉默。",
            "深入挖掘痛点。",
            "只展示与他所说相关的内容。",
            "始终带着日期+行动+负责人离开。",
          ]},
          { kind: "callout", text: "有意图,就有进化。" },
        ],
      },
    ],
  },
};

export function BuyerTrainingDocument() {
  return <AdminDocView content={CONTENT} />;
}