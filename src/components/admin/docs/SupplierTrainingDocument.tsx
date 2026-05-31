import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

const CONTENT: Record<Lang, DocContent> = {
  pt: {
    tagline: "Treinamento Supplier — apresentação da plataforma",
    hero: "Como transformar a call da Mundus em uma conversa que gera ativação. Menos pitch, mais escuta, mais curiosidade.",
    badge: "MATERIAL INTERNO | TIME COMERCIAL — SUPPLIER | 2026",
    print: "Imprimir / Salvar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Material de treinamento interno — persona Supplier (frigoríficos)",
      "Use antes de toda call de discovery com fornecedores",
      "Atualize sempre que aprender algo novo em campo",
    ],
    signature: "MUNDUS TRADE | TREINAMENTO SUPPLIER | 2026",
    sections: [
      {
        kicker: "00 — DIAGNÓSTICO",
        title: "Por que estamos aqui",
        blocks: [
          { kind: "p", text: "Clientes estão cadastrados, mas nenhum ativou. O problema não é a plataforma — é como estamos apresentando ela. Hoje a call está muito mais centrada em explicar a plataforma do que em entender o frigorífico." },
          { kind: "p", text: "Isso pode gerar um efeito sem querer: o cliente entra mais como ouvinte do que como participante — e isso reduz o nível de conexão e de urgência." },
          { kind: "callout", text: "O objetivo não é convencer o cliente de que a Mundus é boa — é fazer ele chegar na conclusão de que ele precisa dela." },
          { kind: "h3", text: "Os 3 erros mais comuns" },
          { kind: "ul", items: [
            "Falar mais que o cliente.",
            "Fazer perguntas fechadas (sim/não).",
            "Fazer tour completo da plataforma.",
            "Sair sem próximo passo e call agendada.",
          ]},
          { kind: "p", text: "O risco: o cliente concorda… mas não sente. E quando ele não sente a dor, não muda comportamento — exatamente o que vemos depois (não sobe oferta). Isso não é falta de esforço, é falta de método." },
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
            { t: "Gap Selling", d: "A venda acontece quando você entende o gap do cliente — onde ele está vs. onde quer chegar." },
          ]},
          { kind: "table", head: ["Letra", "Tipo", "Objetivo"], rows: [
            ["S", "Situation", "Identifica o contexto do frigorífico."],
            ["P", "Problem", "Revela desafios enfrentados na exportação."],
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
            ["Explicar tudo sobre a plataforma", "Entender a dor primeiro"],
            ["Mundus fala mais de 70% do tempo", "Cliente fala 60–70% do tempo"],
            ["Perguntas fechadas (sim/não)", "Perguntas abertas e exploratórias"],
            ["Apresentar sem contexto do cliente", "Conectar a Mundus ao que ELE falou"],
            ["Sair sem próximo passo definido", "Sempre sair com data + ação + responsável"],
          ]},
          { kind: "callout", text: "Benchmark Gong: melhores calls têm o cliente falando 60–70% do tempo." },
        ],
      },
      {
        kicker: "04 — A EVOLUÇÃO DO SETOR",
        title: "Passado → Presente: o slide de ouro",
        blocks: [
          { kind: "p", text: "O setor de proteína animal evoluiu em tecnologia de produção, qualidade e escala. Mas a forma de negociar internacionalmente continuou no passado: e-mail, planilhas desorganizadas e comunicação fragmentada entre continentes." },
          { kind: "callout", text: "A Mundus surge para alinhar a eficiência da negociação com a excelência da produção." },
          { kind: "h3", text: "Use o slide para provocar — não para explicar" },
          { kind: "ul", items: [
            "\"O setor de carnes já chegou nesse 'presente' ou ainda está no modelo antigo?\"",
            "\"Onde ainda está mais 'manual' na operação de vocês?\"",
          ]},
          { kind: "p", text: "Se ele responder superficial: \"Pode me dar um exemplo real do dia a dia?\" / \"E isso acontece com frequência?\"" },
        ],
      },
      {
        kicker: "05 — PRÉ-CALL",
        title: "Antes de ligar",
        blocks: [
          { kind: "ol", items: [
            { t: "Pesquise o frigorífico", d: "Produtos, mercados atendidos, SIF ativo, certificações." },
            { t: "Identifique a persona", d: "Dono (resultado), Gerente de Exportação (eficiência), Trader (resistente — abordagem diferente)." },
            { t: "Verifique o histórico no Zoho", d: "Já houve contato anterior? O que foi dito?" },
            { t: "Defina o objetivo real", d: "Não é \"apresentar a Mundus\" — é identificar pelo menos 1 dor real." },
            { t: "Tenha a plataforma aberta", d: "Pronto para mostrar SÓ o que for relevante." },
          ]},
        ],
      },
      {
        kicker: "06 — ABERTURA",
        title: "Rapport e entrada no tema",
        blocks: [
          { kind: "p", text: "Rapport não é protocolo — é conexão real. Evite \"tudo bem?\" genérico. Conecte com algo do mundo do cliente (histórico no Zoho ou pesquisa prévia)." },
          { kind: "callout", text: "\"Antes de entrar na Mundus em si, queria entender um pouco mais de como vocês operam hoje — pode ser?\"" },
          { kind: "p", text: "Após a pergunta: faça silêncio e deixe ele responder, mesmo que seja um \"aham\"." },
        ],
      },
      {
        kicker: "07 — DESAFIOS",
        title: "Os 6 desafios enfrentados",
        blocks: [
          { kind: "callout", text: "REGRA DE OURO: explore no máximo 2–3 temas. Vá fundo em cada um. Nunca passe pelos 6 desafios de uma vez." },
          { kind: "h3", text: "1. Operacional / acúmulo de funções" },
          { kind: "ul", items: [
            "\"O comercial de vocês faz prospecção, negociação e comunicação interna ao mesmo tempo?\"",
            "\"Quanto tempo do dia se vai só respondendo mensagem?\"",
          ]},
          { kind: "h3", text: "2. Comunicação fragmentada" },
          { kind: "ul", items: [
            "\"Como vocês organizam as conversas entre email, WhatsApp e WeChat?\"",
            "\"Já perdeu negociação por mensagem que ficou perdida?\"",
          ]},
          { kind: "h3", text: "3. Falta de transparência sobre o comprador" },
          { kind: "ul", items: [
            "\"Como vocês qualificam um comprador novo hoje?\"",
            "\"Já fechou com alguém que depois sumiu ou deu problema?\"",
          ]},
          { kind: "h3", text: "4. Velocidade das negociações" },
          { kind: "ul", items: [
            "\"Quanto tempo costuma levar entre primeiro contato e fechar um container?\"",
            "\"Onde isso mais trava?\"",
          ]},
          { kind: "h3", text: "5. Dependência de intermediários" },
          { kind: "ul", items: [
            "\"Qual a fatia hoje que ainda passa por trader/intermediário?\"",
            "\"O que você faz hoje pra se proteger?\"",
          ]},
          { kind: "h3", text: "6. Visibilidade de mercado" },
          { kind: "ul", items: [
            "\"Hoje você tem visibilidade do que o mercado está demandando, ou depende do que chega até você?\"",
            "\"Já aconteceu de ter produto e não saber que tinha comprador procurando?\"",
          ]},
        ],
      },
      {
        kicker: "08 — DISCOVERY → PLATAFORMA",
        title: "Como mostrar a plataforma (different mindset)",
        blocks: [
          { kind: "p", text: "Máximo ~20 minutos de plataforma. Não é tour — é conexão. Mostre só o que conecta com o que ELE falou." },
          { kind: "cards3", items: [
            { t: "Falou de comunicação fragmentada", d: "Mostre o fluxo de negociação centralizado e o histórico de conversas." },
            { t: "Falou de comprador desconhecido", d: "Mostre perfil do buyer, documentos, mercados que atende." },
            { t: "Falou de lentidão", d: "Mostre fluxo de oferta → bid → contraproposta → fechamento." },
          ]},
          { kind: "callout", text: "Nunca mostre uma funcionalidade que ele não mencionou. Cada coisa sem conexão é um sinal de que você não estava ouvindo." },
        ],
      },
      {
        kicker: "09 — FECHAMENTO",
        title: "Simule uma oferta ao vivo",
        blocks: [
          { kind: "ol", items: [
            { t: "Ideal — simular subindo uma oferta", d: "Mostre funcionamento e agilidade. Faça pausas e pergunte se está claro." },
            { t: "Se não der tempo", d: "Marque call de cadastro guiado no mesmo dia ou seguinte." },
          ]},
          { kind: "h3", text: "Perguntas de fechamento" },
          { kind: "ul", items: [
            "\"Tem algo que você sentiu falta?\"",
            "\"Vamos testar com uma primeira oferta real?\"",
            "\"Quem seria a melhor pessoa do seu time pra fazer isso junto com a gente?\"",
            "\"Podemos marcar um próximo passo pra fazer isso juntos?\"",
          ]},
          { kind: "callout", text: "REGRA NÃO NEGOCIÁVEL: nunca sair sem próximo passo com data + ação + responsável." },
        ],
      },
      {
        kicker: "10 — PÓS-CALL",
        title: "O que acontece depois determina tudo",
        blocks: [
          { kind: "p", text: "O pós-call determina se o próximo passo vai acontecer ou vai sumir." },
          { kind: "cards3", items: [
            { t: "Registrar no Zoho — na hora", d: "Persona, dores mencionadas (palavras exatas), o que foi mostrado, próximo passo e data." },
            { t: "Mensagem rápida — em até 30 min", d: "WhatsApp curto referenciando algo que ele disse + ação combinada." },
            { t: "Email — em até 2h", d: "Confirmar próximo passo. Duas opções de horário, nunca pergunta aberta. '20 minutos na prática', não 'reunião'." },
          ]},
          { kind: "callout", text: "Reengajamento com novidade — não com 'só passando pra ver se pensou'. Você traz algo, não pede algo." },
        ],
      },
      {
        kicker: "11 — CAMINHOS",
        title: "3 caminhos pós-call",
        blocks: [
          { kind: "cards3", items: [
            { t: "Caminho 1 — Fez ao vivo", d: "Oferta publicada na call. Manda mensagem em até 30 min: '[Nome], oferta no ar!'. Acompanha de perto qualquer movimento." },
            { t: "Caminho 2 — Marcou mas pode falhar", d: "Confirme nova data com firmeza: 'Só confirmando: [dia], [data], às [hora] ainda funciona?'. Se não responder em 48h → migra pro caminho 3." },
            { t: "Caminho 3 — Quer fazer sozinho", d: "Ancoragem: 'Imagino que queira autonomia — faz sentido. Que tal 20 min juntos para a primeira oferta?'. Após 7 dias sem resposta, pausa e retoma em 2 semanas com novidade real." },
          ]},
        ],
      },
      {
        kicker: "12 — TEMPLATES",
        title: "Mensagens prontas para o supplier",
        blocks: [
          { kind: "h3", text: "① Cliente engajado — WhatsApp (até 1h)" },
          { kind: "callout", text: "\"[Nome], obrigado pela conversa de hoje. Conforme combinamos, fica de pé [próximo passo] em [dia/horário]. Qualquer coisa, me chama. [Seu nome] — Mundus Trade\"" },
          { kind: "h3", text: "② Confirmação firme — 24h antes" },
          { kind: "callout", text: "\"[Nome], só confirmando nosso horário de [dia], [data], às [horário]. Tudo certo da sua parte?\" — Assuma que sim, peça só a confirmação." },
          { kind: "h3", text: "③ Cliente morno — WhatsApp (mesmo dia, até 3h)" },
          { kind: "callout", text: "\"[Nome], obrigado pela conversa. Pensei aqui depois da call e quis te trazer [novidade real do setor]. Faz sentido a gente conversar 20 min essa semana?\"" },
          { kind: "h3", text: "④ Reengajamento (3 dias sem resposta)" },
          { kind: "p", text: "Assunto: \"Uma informação que pode ser relevante para vocês — [nome do frigorífico]\"" },
          { kind: "callout", text: "Nunca mencione que está \"fazendo follow-up\". Você está trazendo uma novidade — esse enquadramento muda completamente como ele lê o email." },
          { kind: "h3", text: "⑤ Última tentativa (após 7d em pausa)" },
          { kind: "callout", text: "Mais de 3 tentativas sem resposta vira spam e queima o contato. Marque no Zoho como \"em pausa\" e coloque lembrete pra 2 semanas com novidade real." },
        ],
      },
      {
        kicker: "13 — RESUMO",
        title: "Checklist final",
        blocks: [
          { kind: "h3", text: "❌ NÃO FAZER" },
          { kind: "ul", items: [
            "Cortar o cliente ou completar a frase dele.",
            "Fazer tour completo da plataforma.",
            "Fazer perguntas fechadas (sim/não).",
            "Ligar sem pesquisar o frigorífico antes.",
            "Mostrar funcionalidade que ele não mencionou.",
            "Sair sem próximo passo definido.",
          ]},
          { kind: "h3", text: "✅ FAZER" },
          { kind: "ul", items: [
            "Pesquisar o frigorífico e identificar a persona antes da call.",
            "Abrir com rapport real, não protocolo.",
            "Pedir exemplo real do dia a dia.",
            "Mostrar só o que conecta com o que ELE falou.",
            "Registrar tudo no Zoho logo depois.",
            "Perguntar → esperar → aprofundar.",
            "Explorar a dor até o fim.",
            "Sair sempre com data + ação definida.",
          ]},
          { kind: "callout", text: "ONDE EXISTE INTENÇÃO, EXISTE EVOLUÇÃO." },
        ],
      },
    ],
  },

  en: {
    tagline: "Supplier training — platform discovery call",
    hero: "Turn the Mundus call into a conversation that drives activation. Less pitch, more listening, more curiosity.",
    badge: "INTERNAL MATERIAL | SALES TEAM — SUPPLIER | 2026",
    print: "Print / Save PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Internal training material — Supplier persona (meat processors)",
      "Use before every discovery call with suppliers",
      "Update whenever you learn something new in the field",
    ],
    signature: "MUNDUS TRADE | SUPPLIER TRAINING | 2026",
    sections: [
      {
        kicker: "00 — DIAGNOSIS",
        title: "Why we're here",
        blocks: [
          { kind: "p", text: "Suppliers sign up but nobody activates. The problem isn't the platform — it's how we present it. The call is far more focused on explaining the platform than on understanding the processor." },
          { kind: "callout", text: "The goal isn't to convince the client that Mundus is good — it's to lead them to conclude they need it." },
          { kind: "h3", text: "The 3 most common mistakes" },
          { kind: "ul", items: [
            "Talking more than the client.",
            "Asking closed (yes/no) questions.",
            "Giving a full platform tour.",
            "Ending without a scheduled next step.",
          ]},
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
        title: "Reference methodologies",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Teach and provoke, don't push. Challenge the client to think differently about their problem." },
            { t: "SPIN Selling", d: "Situation → Problem → Implication → Need-Payoff. Builds credibility before presenting the product." },
            { t: "Gap Selling", d: "Sales happen when you deeply understand the client's gap — where they are vs. where they want to be." },
          ]},
        ],
      },
      {
        kicker: "03 — BEFORE vs AFTER",
        title: "The logic inversion",
        blocks: [
          { kind: "table", head: ["❌ Today", "✅ How it should be"], rows: [
            ["Explain everything about the platform", "Understand the pain first"],
            ["Mundus speaks 70%+ of the time", "Client speaks 60–70%"],
            ["Closed questions", "Open, exploratory questions"],
            ["Present without client context", "Connect Mundus to what THEY said"],
            ["End with no next step", "Always leave with date + action + owner"],
          ]},
        ],
      },
      {
        kicker: "04 — INDUSTRY EVOLUTION",
        title: "Past → Present: the golden slide",
        blocks: [
          { kind: "p", text: "The animal protein sector has evolved in production tech, quality and global scale. But international negotiation stayed in the past: email, messy spreadsheets, fragmented cross-continent communication." },
          { kind: "callout", text: "Mundus aligns negotiation efficiency with production excellence." },
          { kind: "ul", items: [
            "\"Has the meat industry reached this 'present' or is it still in the old model?\"",
            "\"Where is your operation still most 'manual'?\"",
          ]},
        ],
      },
      {
        kicker: "05 — PRE-CALL",
        title: "Before the call",
        blocks: [
          { kind: "ol", items: [
            { t: "Research the processor", d: "Products, target markets, active SIF, certifications." },
            { t: "Identify the persona", d: "Owner (results), Export Manager (efficiency), Trader (resistant — different approach)." },
            { t: "Check Zoho history", d: "Any previous contact? What was said?" },
            { t: "Define the real goal", d: "Not \"present Mundus\" — identify at least 1 real pain." },
            { t: "Have the platform open", d: "Ready to show ONLY what is relevant." },
          ]},
        ],
      },
      {
        kicker: "06 — OPENING",
        title: "Rapport and entry",
        blocks: [
          { kind: "p", text: "Rapport isn't protocol — it's real connection. Avoid generic \"how are you?\". Connect to something in the client's world." },
          { kind: "callout", text: "\"Before we get into Mundus, I'd like to understand a bit more about how you operate today — okay?\"" },
          { kind: "p", text: "After the question: stay silent and let them respond." },
        ],
      },
      {
        kicker: "07 — CHALLENGES",
        title: "The 6 challenges",
        blocks: [
          { kind: "callout", text: "GOLDEN RULE: explore at most 2–3 themes. Go deep on each. Never cover all 6 at once." },
          { kind: "h3", text: "1. Operational overload" },
          { kind: "ul", items: ["\"Does your sales team prospect, negotiate and handle internal comms all at once?\""] },
          { kind: "h3", text: "2. Fragmented communication" },
          { kind: "ul", items: ["\"How do you organize conversations across email, WhatsApp and WeChat?\""] },
          { kind: "h3", text: "3. Lack of buyer transparency" },
          { kind: "ul", items: ["\"How do you qualify a new buyer today?\""] },
          { kind: "h3", text: "4. Negotiation speed" },
          { kind: "ul", items: ["\"How long from first contact to closing a container? Where does it get stuck?\""] },
          { kind: "h3", text: "5. Dependence on intermediaries" },
          { kind: "ul", items: ["\"What share still goes through a trader/intermediary?\""] },
          { kind: "h3", text: "6. Market visibility" },
          { kind: "ul", items: ["\"Do you have visibility of what the market is demanding, or depend on what reaches you?\""] },
        ],
      },
      {
        kicker: "08 — DISCOVERY → DEMO",
        title: "How to show the platform",
        blocks: [
          { kind: "p", text: "Max ~20 minutes on the platform. Not a tour — a connection. Show only what links to what THEY said." },
          { kind: "callout", text: "Never show a feature they didn't mention. Each disconnected thing signals you weren't listening." },
        ],
      },
      {
        kicker: "09 — CLOSING",
        title: "Simulate an offer live",
        blocks: [
          { kind: "ol", items: [
            { t: "Ideal", d: "Publish an offer live on the call to show speed and clarity. Pause and check understanding." },
            { t: "If no time", d: "Book a guided onboarding the same day or next." },
          ]},
          { kind: "ul", items: [
            "\"Did anything feel missing?\"",
            "\"Let's try a first real offer?\"",
            "\"Who on your team should be in the next step?\"",
          ]},
          { kind: "callout", text: "NON-NEGOTIABLE: never end without date + action + owner." },
        ],
      },
      {
        kicker: "10 — POST-CALL",
        title: "What happens next decides everything",
        blocks: [
          { kind: "cards3", items: [
            { t: "Log in Zoho — immediately", d: "Persona, exact words of pain, what you showed, next step + date." },
            { t: "Quick WhatsApp — within 30 min", d: "Reference something they said + agreed action." },
            { t: "Email — within 2h", d: "Confirm next step. Two time options, never open-ended. \"20 minutes hands-on\", not \"meeting\"." },
          ]},
        ],
      },
      {
        kicker: "11 — PATHS",
        title: "3 post-call paths",
        blocks: [
          { kind: "cards3", items: [
            { t: "Path 1 — Done live", d: "Offer published in call. Send msg within 30 min: \"[Name], offer is live!\"." },
            { t: "Path 2 — Booked but at risk", d: "Confirm firmly: \"Just confirming [day], [date] at [time] still works?\". No reply in 48h → move to Path 3." },
            { t: "Path 3 — Wants to do it alone", d: "Anchor: \"Makes sense — but 20 min together for the first offer?\". 7 days silent → pause, retry in 2 weeks with real news." },
          ]},
        ],
      },
      {
        kicker: "12 — TEMPLATES",
        title: "Ready-to-send messages",
        blocks: [
          { kind: "h3", text: "① Engaged — WhatsApp (within 1h)" },
          { kind: "callout", text: "\"[Name], thanks for the conversation today. As agreed, [next step] on [day/time] is set. Anything, ping me. [Your name] — Mundus Trade\"" },
          { kind: "h3", text: "② Firm confirmation — 24h before" },
          { kind: "callout", text: "\"[Name], just confirming our [day], [date] at [time]. All good on your end?\" — Assume yes, ask only for confirmation." },
          { kind: "h3", text: "③ Lukewarm — same day, within 3h" },
          { kind: "callout", text: "\"[Name], thanks for chatting. I thought after the call and wanted to share [real industry news]. Can we talk 20 min this week?\"" },
          { kind: "h3", text: "④ Re-engagement (3 days silent)" },
          { kind: "p", text: "Subject: \"Some info that may be relevant to you — [processor name]\"" },
          { kind: "callout", text: "Never say you're \"following up\". You're bringing news — that framing changes how they read the email." },
        ],
      },
      {
        kicker: "13 — SUMMARY",
        title: "Final checklist",
        blocks: [
          { kind: "h3", text: "❌ DON'T" },
          { kind: "ul", items: [
            "Interrupt or finish their sentence.",
            "Give the full platform tour.",
            "Ask closed (yes/no) questions.",
            "Call without researching the processor.",
            "Show features they didn't mention.",
            "End without a defined next step.",
          ]},
          { kind: "h3", text: "✅ DO" },
          { kind: "ul", items: [
            "Research processor + identify persona before the call.",
            "Open with real rapport.",
            "Ask for real day-to-day examples.",
            "Show only what connects to what THEY said.",
            "Log everything in Zoho right after.",
            "Ask → wait → go deeper.",
            "Always leave with date + action.",
          ]},
          { kind: "callout", text: "WHERE THERE IS INTENTION, THERE IS EVOLUTION." },
        ],
      },
    ],
  },

  es: {
    tagline: "Entrenamiento Supplier — presentación de la plataforma",
    hero: "Cómo transformar la call de Mundus en una conversación que genera activación. Menos pitch, más escucha, más curiosidad.",
    badge: "MATERIAL INTERNO | EQUIPO COMERCIAL — SUPPLIER | 2026",
    print: "Imprimir / Guardar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Material de entrenamiento interno — persona Supplier (frigoríficos)",
      "Usar antes de cada call de discovery con proveedores",
      "Actualizar siempre que aprenda algo nuevo en campo",
    ],
    signature: "MUNDUS TRADE | ENTRENAMIENTO SUPPLIER | 2026",
    sections: [
      {
        kicker: "00 — DIAGNÓSTICO",
        title: "Por qué estamos aquí",
        blocks: [
          { kind: "p", text: "Los clientes están registrados pero nadie activa. El problema no es la plataforma — es cómo la presentamos. Hoy la call se centra más en explicar la plataforma que en entender al frigorífico." },
          { kind: "callout", text: "El objetivo no es convencer al cliente de que Mundus es buena — es hacer que él concluya que la necesita." },
          { kind: "h3", text: "Los 3 errores más comunes" },
          { kind: "ul", items: [
            "Hablar más que el cliente.",
            "Hacer preguntas cerradas (sí/no).",
            "Hacer tour completo de la plataforma.",
            "Salir sin próximo paso agendado.",
          ]},
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Por qué escuchar más convierte más",
        blocks: [
          { kind: "cards3", items: [
            { t: "Gong", d: "Mejores calls: el cliente habla 60–70% del tiempo." },
            { t: "HubSpot", d: "Discovery eficaz = preguntas abiertas + escucha activa." },
            { t: "Challenger Sale", d: "Los mejores vendedores hacen que el cliente piense mejor." },
          ]},
          { kind: "callout", text: "Calls donde el vendedor habla más del 60% del tiempo convierten 40% menos (Gong)." },
        ],
      },
      {
        kicker: "02 — FRAMEWORKS",
        title: "Referencias del método",
        blocks: [
          { kind: "cards3", items: [
            { t: "Challenger Sale", d: "Enseñar y provocar, no empujar." },
            { t: "SPIN Selling", d: "Situation → Problem → Implication → Need-Payoff." },
            { t: "Gap Selling", d: "La venta ocurre cuando entiendes el gap del cliente." },
          ]},
        ],
      },
      {
        kicker: "03 — ANTES vs DESPUÉS",
        title: "La inversión de lógica",
        blocks: [
          { kind: "table", head: ["❌ Hoy", "✅ Cómo debería ser"], rows: [
            ["Explicar todo sobre la plataforma", "Entender el dolor primero"],
            ["Mundus habla más del 70%", "Cliente habla 60–70%"],
            ["Preguntas cerradas", "Preguntas abiertas"],
            ["Presentar sin contexto", "Conectar con lo que ÉL dijo"],
            ["Salir sin próximo paso", "Salir con fecha + acción + responsable"],
          ]},
        ],
      },
      {
        kicker: "04 — EVOLUCIÓN DEL SECTOR",
        title: "Pasado → Presente: el slide de oro",
        blocks: [
          { kind: "p", text: "El sector cárnico evolucionó en producción, calidad y escala. Pero la forma de negociar internacionalmente quedó en el pasado: email, planillas, comunicación fragmentada." },
          { kind: "callout", text: "Mundus alinea la eficiencia de la negociación con la excelencia de la producción." },
        ],
      },
      {
        kicker: "05 — PRE-CALL",
        title: "Antes de llamar",
        blocks: [
          { kind: "ol", items: [
            { t: "Investigar el frigorífico", d: "Productos, mercados, SIF activo." },
            { t: "Identificar persona", d: "Dueño / Gerente Export / Trader." },
            { t: "Revisar Zoho", d: "¿Hubo contacto previo?" },
            { t: "Definir objetivo real", d: "Identificar al menos 1 dolor real." },
            { t: "Plataforma abierta", d: "Lista para mostrar SOLO lo relevante." },
          ]},
        ],
      },
      {
        kicker: "06 — APERTURA",
        title: "Rapport y entrada",
        blocks: [
          { kind: "callout", text: "\"Antes de entrar en Mundus, me gustaría entender un poco más cómo operan hoy — ¿puede ser?\"" },
          { kind: "p", text: "Después de la pregunta: silencio. Deje que responda." },
        ],
      },
      {
        kicker: "07 — DESAFÍOS",
        title: "Los 6 desafíos",
        blocks: [
          { kind: "callout", text: "REGLA DE ORO: explore máximo 2–3 temas. Vaya a fondo. Nunca los 6 a la vez." },
          { kind: "ul", items: [
            "Sobrecarga operacional.",
            "Comunicación fragmentada (email/WhatsApp/WeChat).",
            "Falta de transparencia sobre el comprador.",
            "Velocidad de negociación.",
            "Dependencia de intermediarios.",
            "Visibilidad de mercado.",
          ]},
        ],
      },
      {
        kicker: "08 — DISCOVERY → PLATAFORMA",
        title: "Cómo mostrar la plataforma",
        blocks: [
          { kind: "p", text: "Máximo ~20 min. No es tour, es conexión. Muestre solo lo que conecta con lo que ÉL dijo." },
          { kind: "callout", text: "Nunca muestre una función que él no mencionó." },
        ],
      },
      {
        kicker: "09 — CIERRE",
        title: "Simule una oferta en vivo",
        blocks: [
          { kind: "ul", items: [
            "\"¿Hay algo que sintió que faltó?\"",
            "\"¿Probamos con una primera oferta real?\"",
            "\"¿Quién de su equipo debería estar?\"",
          ]},
          { kind: "callout", text: "REGLA NO NEGOCIABLE: salir siempre con fecha + acción + responsable." },
        ],
      },
      {
        kicker: "10 — POST-CALL",
        title: "Lo que pasa después lo decide todo",
        blocks: [
          { kind: "cards3", items: [
            { t: "Zoho — al instante", d: "Persona, palabras exactas, próximo paso." },
            { t: "WhatsApp — en 30 min", d: "Referencia algo que dijo + acción acordada." },
            { t: "Email — en 2h", d: "Dos opciones de horario, nunca abierto." },
          ]},
        ],
      },
      {
        kicker: "11 — CAMINOS",
        title: "3 caminos post-call",
        blocks: [
          { kind: "cards3", items: [
            { t: "Camino 1 — Hizo en vivo", d: "Oferta publicada. Mensaje en 30 min." },
            { t: "Camino 2 — Agendó pero en riesgo", d: "Confirme con firmeza. 48h sin respuesta → Camino 3." },
            { t: "Camino 3 — Quiere hacerlo solo", d: "Ancla: \"20 min juntos para la primera\". 7d sin respuesta → pausa 2 semanas con novedad real." },
          ]},
        ],
      },
      {
        kicker: "12 — TEMPLATES",
        title: "Mensajes listos",
        blocks: [
          { kind: "h3", text: "① Comprometido — WhatsApp (1h)" },
          { kind: "callout", text: "\"[Nombre], gracias por la conversación. Queda en pie [próximo paso] en [día/hora]. Cualquier cosa, me avisa.\"" },
          { kind: "h3", text: "② Confirmación firme — 24h antes" },
          { kind: "callout", text: "\"[Nombre], confirmando [día] a las [hora]. ¿Todo bien?\"" },
          { kind: "h3", text: "③ Reenganche (3 días)" },
          { kind: "p", text: "Asunto: \"Una información que puede ser relevante — [frigorífico]\"" },
        ],
      },
      {
        kicker: "13 — RESUMEN",
        title: "Checklist final",
        blocks: [
          { kind: "h3", text: "❌ NO HACER" },
          { kind: "ul", items: [
            "Interrumpir.",
            "Tour completo.",
            "Preguntas cerradas.",
            "Llamar sin investigar.",
            "Salir sin próximo paso.",
          ]},
          { kind: "h3", text: "✅ HACER" },
          { kind: "ul", items: [
            "Investigar e identificar persona.",
            "Rapport real.",
            "Pedir ejemplo del día a día.",
            "Mostrar solo lo conectado.",
            "Registrar en Zoho.",
            "Salir con fecha + acción.",
          ]},
          { kind: "callout", text: "DONDE HAY INTENCIÓN, HAY EVOLUCIÓN." },
        ],
      },
    ],
  },

  zh: {
    tagline: "Supplier 培训 — 平台介绍",
    hero: "把 Mundus 通话变成一场能驱动激活的对话。少推销，多倾听，多好奇。",
    badge: "内部资料 | 销售团队 — SUPPLIER | 2026",
    print: "打印 / 保存 PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "内部培训材料 — Supplier 角色（肉类加工厂）",
      "每次与供应商的 discovery 通话前使用",
      "在实地学到新知识时随时更新",
    ],
    signature: "MUNDUS TRADE | SUPPLIER 培训 | 2026",
    sections: [
      {
        kicker: "00 — 诊断",
        title: "我们为什么在这里",
        blocks: [
          { kind: "p", text: "供应商已注册但无人激活。问题不在平台本身——而在我们如何呈现它。今天的通话更多是在解释平台，而不是理解客户。" },
          { kind: "callout", text: "目标不是说服客户 Mundus 很好——而是让他自己得出他需要它的结论。" },
          { kind: "h3", text: "3 个最常见错误" },
          { kind: "ul", items: [
            "比客户说得更多。",
            "提封闭式问题（是/否）。",
            "做完整的平台演示。",
            "结束时没有下一步。",
          ]},
        ],
      },
      {
        kicker: "01 — 基准",
        title: "为什么多倾听转化更高",
        blocks: [
          { kind: "cards3", items: [
            { t: "Gong", d: "最佳通话：客户说话占 60–70% 时间。" },
            { t: "HubSpot", d: "有效 discovery = 开放式问题 + 主动倾听。" },
            { t: "Challenger Sale", d: "最好的销售让客户思考得更好。" },
          ]},
          { kind: "callout", text: "卖家说话超过 60% 的通话转化率低 40%（Gong）。" },
        ],
      },
      {
        kicker: "02 — 方法论",
        title: "支撑方法的参考",
        blocks: [
          { kind: "cards3", items: [
            { t: "Challenger Sale", d: "教导和挑战，而非推销。" },
            { t: "SPIN Selling", d: "Situation → Problem → Implication → Need-Payoff。" },
            { t: "Gap Selling", d: "理解客户的差距——现状与目标之间。" },
          ]},
        ],
      },
      {
        kicker: "03 — 前 vs 后",
        title: "逻辑的反转",
        blocks: [
          { kind: "table", head: ["❌ 今天", "✅ 应该如何"], rows: [
            ["解释平台的一切", "先理解痛点"],
            ["Mundus 说话超过 70%", "客户说话 60–70%"],
            ["封闭式问题", "开放式问题"],
            ["无背景陈述", "连接到他说过的内容"],
            ["没有下一步", "始终带着日期+行动+负责人"],
          ]},
        ],
      },
      {
        kicker: "04 — 行业演进",
        title: "过去 → 现在：黄金幻灯片",
        blocks: [
          { kind: "p", text: "动物蛋白行业在生产技术、质量和全球规模上有了巨大进步。但国际谈判方式停留在过去：邮件、混乱的表格、跨大陆的零散沟通。" },
          { kind: "callout", text: "Mundus 让谈判效率与生产卓越对齐。" },
        ],
      },
      {
        kicker: "05 — 通话前",
        title: "拨打电话之前",
        blocks: [
          { kind: "ol", items: [
            { t: "调研加工厂", d: "产品、市场、有效 SIF、认证。" },
            { t: "识别角色", d: "老板（结果）/出口经理（效率）/贸易商（抗拒）。" },
            { t: "查看 Zoho 历史", d: "之前是否有联系？" },
            { t: "定义真正目标", d: "至少识别 1 个真实痛点。" },
            { t: "打开平台", d: "准备好仅展示相关内容。" },
          ]},
        ],
      },
      {
        kicker: "06 — 开场",
        title: "建立关系和切入",
        blocks: [
          { kind: "callout", text: "「在进入 Mundus 之前，我想多了解一下您今天的运营方式——可以吗？」" },
          { kind: "p", text: "问完后：保持沉默，让他回答。" },
        ],
      },
      {
        kicker: "07 — 挑战",
        title: "6 项挑战",
        blocks: [
          { kind: "callout", text: "黄金法则：最多探索 2–3 个主题，每个深入。绝不一次性涵盖全部 6 项。" },
          { kind: "ul", items: [
            "运营超负荷。",
            "沟通碎片化（邮件/WhatsApp/WeChat）。",
            "对买家缺乏透明度。",
            "谈判速度。",
            "对中间商的依赖。",
            "市场可见度。",
          ]},
        ],
      },
      {
        kicker: "08 — Discovery → 平台",
        title: "如何展示平台",
        blocks: [
          { kind: "p", text: "平台展示最多 ~20 分钟。不是导览，是连接。只展示与他说过的内容相关的功能。" },
          { kind: "callout", text: "绝不展示他没提到的功能。" },
        ],
      },
      {
        kicker: "09 — 收尾",
        title: "现场模拟一个 offer",
        blocks: [
          { kind: "ul", items: [
            "「您觉得有什么遗漏的吗？」",
            "「我们试试发布第一个真实 offer？」",
            "「您团队中谁应该参与下一步？」",
          ]},
          { kind: "callout", text: "不可妥协：永远不要在没有日期+行动+负责人的情况下结束。" },
        ],
      },
      {
        kicker: "10 — 通话后",
        title: "之后发生的决定一切",
        blocks: [
          { kind: "cards3", items: [
            { t: "Zoho — 立即", d: "角色、原话痛点、下一步与日期。" },
            { t: "WhatsApp — 30 分钟内", d: "引用他说的话 + 约定行动。" },
            { t: "Email — 2 小时内", d: "两个时间选项，绝不开放式。" },
          ]},
        ],
      },
      {
        kicker: "11 — 路径",
        title: "3 条通话后路径",
        blocks: [
          { kind: "cards3", items: [
            { t: "路径 1 — 现场完成", d: "通话中已发布 offer。30 分钟内发消息。" },
            { t: "路径 2 — 已预约但有风险", d: "坚定确认。48 小时无回应 → 转路径 3。" },
            { t: "路径 3 — 想自己来", d: "锚定：「20 分钟一起做第一个 offer」。7 天无回应 → 暂停 2 周后带真实新闻回访。" },
          ]},
        ],
      },
      {
        kicker: "12 — 模板",
        title: "现成消息",
        blocks: [
          { kind: "h3", text: "① 积极客户 — WhatsApp（1 小时内）" },
          { kind: "callout", text: "「[姓名]，感谢今天的对话。如约定，[下一步] 在 [日期/时间] 进行。有任何事，随时联系。」" },
          { kind: "h3", text: "② 坚定确认 — 提前 24 小时" },
          { kind: "callout", text: "「[姓名]，确认 [日期] [时间]。您这边都还好吗？」" },
          { kind: "h3", text: "③ 重新激活（3 天无回应）" },
          { kind: "p", text: "主题：「可能对您有用的一条信息 — [加工厂名]」" },
        ],
      },
      {
        kicker: "13 — 总结",
        title: "最终清单",
        blocks: [
          { kind: "h3", text: "❌ 不要" },
          { kind: "ul", items: [
            "打断或替客户说完。",
            "做完整平台演示。",
            "提封闭式问题。",
            "没调研就打电话。",
            "结束时没有下一步。",
          ]},
          { kind: "h3", text: "✅ 要做" },
          { kind: "ul", items: [
            "调研加工厂并识别角色。",
            "真实的关系建立。",
            "请求日常实例。",
            "只展示有关联的内容。",
            "在 Zoho 中记录。",
            "始终带着日期+行动离场。",
          ]},
          { kind: "callout", text: "有意图之处，便有进化。" },
        ],
      },
    ],
  },
};

export function SupplierTrainingDocument() {
  return <AdminDocView content={CONTENT} />;
}