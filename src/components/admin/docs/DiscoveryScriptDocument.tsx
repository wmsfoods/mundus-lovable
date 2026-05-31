import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

const CONTENT: Record<Lang, DocContent> = {
  pt: {
    tagline: "Script de discovery — call comercial Mundus",
    hero: "Como conduzir uma call de descoberta para que o cliente chegue sozinho à conclusão de que precisa da Mundus.",
    badge: "MATERIAL INTERNO | TIME COMERCIAL | 2026",
    print: "Imprimir / Salvar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Material de treinamento interno",
      "Use antes de toda call de discovery",
      "Atualize sempre que aprender algo novo na entrevista",
    ],
    signature: "MUNDUS TRADE | SCRIPT DE DISCOVERY | 2026",
    sections: [
      {
        kicker: "00 — PROBLEMA",
        title: "O que está acontecendo nas calls hoje",
        blocks: [
          { kind: "p", text: "Hoje a call está muito mais centrada em explicar a plataforma do que em entender o cliente. E isso gera um efeito sem querer: o cliente entra mais como ouvinte do que como participante. Isso reduz o nível de conexão e de urgência." },
          { kind: "callout", text: "Discovery não é sobre explicar — é sobre descobrir. O objetivo não é convencer o cliente de que a Mundus é boa, é fazer ele chegar na conclusão de que ele precisa dela." },
          { kind: "h3", text: "Sintomas observados" },
          { kind: "ul", items: [
            "Muitas perguntas fechadas (sim / não).",
            "Algumas respostas sendo interrompidas.",
            "Validação guiada (\"você sofre isso, né?\").",
            "Risco: o cliente concorda, mas não sente. Quando ele não sente a dor, ele não muda comportamento — que é exatamente o que vemos depois (oferta não sobe).",
          ]},
          { kind: "h3", text: "A inversão de lógica" },
          { kind: "ul", items: [
            "Menos pitch.",
            "Mais escuta.",
            "Mais curiosidade.",
            "Referência prática: em discovery, o ideal é o cliente falar 70–80% do tempo.",
          ]},
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Estudo de mercado: por que 80/20",
        blocks: [
          { kind: "p", text: "Não existe lei universal, mas os benchmarks de mercado são claros:" },
          { kind: "ul", items: [
            "Gong (milhares de calls analisadas): as melhores têm cliente falando 60–70%. Top performers chegam perto de 70–80%.",
            "HubSpot: discovery eficaz = mais perguntas abertas + escuta ativa.",
          ]},
          { kind: "quote", text: "Os melhores vendedores não são os que explicam melhor — são os que fazem o cliente pensar melhor." },
        ],
      },
      {
        kicker: "02 — MÉTODO",
        title: "Selling Through Curiosity + 80/20",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Ensinar + provocar, não empurrar." },
            { t: "SPIN Selling", d: "Base inteira em perguntas: Situação, Problema, Implicação, Need-Payoff." },
            { t: "Gap Selling", d: "A venda acontece quando você entende profundamente o \"gap\" do cliente." },
          ]},
          { kind: "h3", text: "Estrutura SPIN" },
          { kind: "table", head: ["Letra", "Tipo de pergunta", "Objetivo"], rows: [
            ["S", "Situation", "Identifica o contexto do cliente."],
            ["P", "Problem", "Revela desafios enfrentados."],
            ["I", "Implication", "Explora consequências dos problemas."],
            ["N", "Need-Payoff", "Leva o cliente a reconhecer o valor da solução."],
          ]},
          { kind: "callout", text: "A estrutura visa construir credibilidade e entendimento antes de apresentar o produto. Abordagem consultiva, centrada no cliente." },
        ],
      },
      {
        kicker: "03 — ABERTURA",
        title: "Como abrir a call",
        blocks: [
          { kind: "ul", items: [
            "O deck não é para apresentar. É para provocar conversa.",
            "Cada slide é uma pergunta, não uma explicação.",
            "Se vocês falarem mais que o cliente, vocês \"perderam\" a call.",
            "De preferência não apresentar a tela de boas-vindas.",
          ]},
          { kind: "h3", text: "Faça rapport, conecte-se" },
          { kind: "p", text: "Quando entrar no tema, use:" },
          { kind: "callout", text: "\"Antes de entrar na Mundus em si, queria entender um pouco mais de como vocês operam hoje — pode ser?\" Faça silêncio e deixe ele responder, mesmo que seja um \"aham\"." },
        ],
      },
      {
        kicker: "04 — OS 6 DESAFIOS",
        title: "Como conduzir os 6 problemas do setor",
        blocks: [
          { kind: "callout", text: "REGRA DE OURO: não passar pelos 6 + explorar 2 a 3 no máximo + ir a fundo." },
          { kind: "p", text: "Abra com: \"Queria validar com você se alguns desses pontos fazem sentido — ou se a realidade de vocês é diferente.\" Depois vai bloco por bloco e escolhe no máximo 2." },
          { kind: "table", head: ["Bloco", "Como abrir", "Como aprofundar"], rows: [
            ["1. Comunicação fragmentada", "\"Hoje vocês usam mais e-mail, WhatsApp, WeChat… como você gerencia tudo isso?\"", "\"Isso atrapalha ou já está ok pra vocês?\""],
            ["2. Negociação lenta", "\"Quanto tempo, em média, vocês levam pra fechar um container hoje?\"", "\"E por que leva esse tempo?\" — NUNCA sugerir número."],
            ["3. Retrabalho", "\"Vocês acabam mandando muita coisa repetida (ficha técnica, foto, etc)?\"", "\"Isso é algo que incomoda ou já faz parte do processo?\""],
            ["4. Falta de transparência", "\"Vocês conseguem ter visibilidade clara de quem está comprando, histórico, comportamento?\"", "Deixar o cliente desenvolver."],
            ["5. Visibilidade de mercado", "\"Hoje você tem visibilidade do que o mercado está demandando ou depende do que chega até você?\"", "\"Já aconteceu de você ter produto e não saber que tinha comprador procurando?\""],
            ["6. Riscos", "\"Quais são os maiores riscos que você gerencia hoje numa exportação?\"", "\"Já teve algum problema mais sério?\" + \"O que você faz hoje pra se proteger?\" — puxa emocional (medo), muito forte."],
          ]},
          { kind: "h3", text: "Perguntas bônus" },
          { kind: "ul", items: [
            "\"O que mais te estressa no dia a dia da exportação?\"",
            "\"Se você pudesse eliminar uma parte do processo, qual seria?\"",
          ]},
          { kind: "h3", text: "Ganho pessoal — OURO" },
          { kind: "callout", text: "\"Se essa operação fosse mais eficiente — menos retrabalho, mais negócio fechado — o que isso mudaria pra você no dia a dia?\" OU \"Como você é cobrado hoje — volume, eficiência, novos clientes?\"" },
        ],
      },
      {
        kicker: "05 — PASSADO vs PRESENTE",
        title: "Slide OURO para provocar",
        blocks: [
          { kind: "p", text: "Mostre a comparação: Passado (táxi, telefone fixo, agência de viagem) → Presente (Uber, iFood, Booking, Airbnb)." },
          { kind: "h3", text: "Em vez de explicar, pergunte" },
          { kind: "ul", items: [
            "\"Quando você olha pra isso… você sente que o setor de carnes já chegou nesse 'presente' ou ainda está mais no modelo antigo?\"",
            "\"Onde você acha que ainda está mais 'manual' hoje na operação de vocês?\"",
            "\"Na prática, no dia a dia de vocês… como funciona hoje?\"",
          ]},
          { kind: "h3", text: "Se ele responder superficial" },
          { kind: "ul", items: [
            "\"Pode me dar um exemplo real do dia a dia?\"",
            "\"E isso acontece com frequência?\"",
          ]},
          { kind: "callout", text: "Mudança de hábito: deixe de afirmar (\"como a Mundus faz hoje\") e passe a fazer perguntas cirúrgicas ABERTAS." },
        ],
      },
      {
        kicker: "06 — MOMENTO CRÍTICO",
        title: "Quando o cliente revelar a dor",
        blocks: [
          { kind: "p", text: "Se ele falar palavras como: \"e-mail\", \"WeChat\", \"demora\", \"China\", \"fuso\" — você entra com perguntas de risco para transformar relato em dor real:" },
          { kind: "ul", items: [
            "\"Como isso impacta no fechamento?\"",
            "\"Você já perdeu negócio por causa disso?\"",
            "\"Isso te atrasa quanto, mais ou menos?\"",
            "\"Isso acontece com frequência? Me fale mais sobre isso.\"",
          ]},
          { kind: "callout", text: "Isso é o que transforma um relato em uma dor real. Sem dor real, não há mudança de comportamento." },
        ],
      },
      {
        kicker: "07 — TRANSIÇÃO",
        title: "Quando o cliente já falou muito",
        blocks: [
          { kind: "callout", text: "\"Perfeito — isso ajuda muito a entender. Já já vou te mostrar como a Mundus entra exatamente nesses pontos.\" \"Vou te mostrar só a parte que conecta com o que você comentou, pode ser?\"" },
          { kind: "p", text: "Isso evita virar tour completo da plataforma." },
        ],
      },
      {
        kicker: "08 — SLIDE FINAL",
        title: "Conectar, não explicar",
        blocks: [
          { kind: "p", text: "Agora você NÃO explica tudo — você conecta cada funcionalidade ao que ELE falou:" },
          { kind: "cards3", items: [
            { t: "Se ele falou de fuso", d: "\"Você comentou do fuso — hoje a Mundus automatiza essa negociação, então você não precisa esperar resposta…\"" },
            { t: "Se falou de tempo (velocidade)", d: "\"Você comentou que demora X — hoje a gente vê negociações acontecendo em minutos…\"" },
            { t: "Se falou de retrabalho (centralização)", d: "\"Você comentou que precisa mandar muita informação — aqui tudo já fica centralizado…\"" },
          ]},
          { kind: "callout", text: "É um pitch personalizado, baseado no que ELE falou." },
        ],
      },
      {
        kicker: "09 — PRÓXIMO PASSO",
        title: "Como fechar a call",
        blocks: [
          { kind: "h3", text: "Sempre sair com próximo passo" },
          { kind: "ul", items: [
            "\"Faz sentido testarmos isso com uma primeira oferta real?\"",
            "\"Quem seria a melhor pessoa do seu time pra subir isso com a gente?\"",
            "\"Podemos marcar um próximo passo pra fazer isso juntos?\"",
          ]},
        ],
      },
      {
        kicker: "10 — CHECKLIST",
        title: "Checklist final da call",
        blocks: [
          { kind: "h3", text: "❌ NÃO FAZER" },
          { kind: "ul", items: [
            "Cortar o cliente.",
            "Completar frase.",
            "Sugerir resposta (\"24h? 48h?\").",
            "Passar rápido pelos slides.",
            "Falar mais de 40% do tempo.",
          ]},
          { kind: "h3", text: "✅ FAZER" },
          { kind: "ul", items: [
            "Perguntar → esperar → aprofundar.",
            "Pedir exemplo real.",
            "Explorar a dor até o fim.",
            "Conectar a solução com o que ELE falou.",
            "Sair com próximo passo.",
          ]},
        ],
      },
    ],
  },

  en: {
    tagline: "Discovery script — Mundus commercial call",
    hero: "How to lead a discovery call so the client reaches the conclusion themselves that they need Mundus.",
    badge: "INTERNAL MATERIAL | SALES TEAM | 2026",
    print: "Print / Save PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Internal training material",
      "Use before every discovery call",
      "Update whenever you learn something new in interview",
    ],
    signature: "MUNDUS TRADE | DISCOVERY SCRIPT | 2026",
    sections: [
      {
        kicker: "00 — THE PROBLEM",
        title: "What's happening on calls today",
        blocks: [
          { kind: "p", text: "Today the call is far more focused on explaining the platform than on understanding the client. The unintended effect: the client enters as a listener, not a participant. That reduces connection and urgency." },
          { kind: "callout", text: "Discovery isn't about explaining — it's about discovering. The goal isn't to convince the client that Mundus is good. It's to lead them to conclude that they need it." },
          { kind: "h3", text: "Observed symptoms" },
          { kind: "ul", items: [
            "Too many closed (yes/no) questions.",
            "Replies being interrupted.",
            "Guided validation (\"you suffer from this, right?\").",
            "Risk: the client agrees but doesn't feel it. Without real pain, no behaviour change.",
          ]},
          { kind: "h3", text: "The logic to invert" },
          { kind: "ul", items: [
            "Less pitch.",
            "More listening.",
            "More curiosity.",
            "Benchmark: in discovery the client should talk 70–80% of the time.",
          ]},
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Why 80/20",
        blocks: [
          { kind: "ul", items: [
            "Gong (thousands of calls analysed): the best calls have the client speaking 60–70%. Top performers reach 70–80%.",
            "HubSpot: effective discovery = more open questions + active listening.",
          ]},
          { kind: "quote", text: "The best salespeople aren't those who explain best — they're those who make the client think best." },
        ],
      },
      {
        kicker: "02 — METHOD",
        title: "Selling Through Curiosity + 80/20",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Teach and provoke, don't push." },
            { t: "SPIN Selling", d: "Built entirely on questions: Situation, Problem, Implication, Need-Payoff." },
            { t: "Gap Selling", d: "The sale happens when you deeply understand the client's \"gap\"." },
          ]},
          { kind: "h3", text: "SPIN structure" },
          { kind: "table", head: ["Letter", "Question type", "Goal"], rows: [
            ["S", "Situation", "Identifies the client's context."],
            ["P", "Problem", "Reveals current challenges."],
            ["I", "Implication", "Explores consequences of problems."],
            ["N", "Need-Payoff", "Leads the client to recognise the value of the solution."],
          ]},
          { kind: "callout", text: "The structure builds credibility and understanding before presenting the product — consultative, client-centred." },
        ],
      },
      {
        kicker: "03 — OPENING",
        title: "How to open the call",
        blocks: [
          { kind: "ul", items: [
            "The deck isn't for presenting. It's to provoke conversation.",
            "Every slide is a question, not an explanation.",
            "If you talk more than the client, you \"lost\" the call.",
            "Preferably don't show the welcome screen.",
          ]},
          { kind: "p", text: "Build rapport, connect. When you enter the topic, use:" },
          { kind: "callout", text: "\"Before we get into Mundus itself, I'd like to understand a bit more about how you operate today — does that work?\" Stay silent and let them answer, even if it's just an \"uh-huh\"." },
        ],
      },
      {
        kicker: "04 — THE 6 CHALLENGES",
        title: "How to lead the 6 industry problems",
        blocks: [
          { kind: "callout", text: "GOLDEN RULE: don't run through all 6. Explore 2–3 at most. Go deep." },
          { kind: "p", text: "Open with: \"I'd like to validate with you whether some of these points make sense, or if your reality is different.\" Then go block by block — pick at most 2." },
          { kind: "table", head: ["Block", "How to open", "How to deepen"], rows: [
            ["1. Fragmented communication", "\"Today you use email, WhatsApp, WeChat… how do you manage all that?\"", "\"Does that get in the way or is it already fine for you?\""],
            ["2. Slow negotiation", "\"On average, how long does it take you to close a container today?\"", "\"And why does it take that long?\" — NEVER suggest a number."],
            ["3. Rework", "\"Do you end up sending a lot of repeated info (specs, photos, etc)?\"", "\"Does it bother you, or is it just part of the process?\""],
            ["4. Lack of transparency", "\"Do you have clear visibility of who's buying, history, behaviour?\"", "Let the client elaborate."],
            ["5. Market visibility", "\"Do you have visibility of what the market is demanding, or do you depend on what reaches you?\"", "\"Has it ever happened that you had product and didn't know there was a buyer looking?\""],
            ["6. Risks", "\"What are the biggest risks you manage today in an export?\"", "\"Have you had a serious problem?\" + \"What do you do today to protect yourself?\" — pulls emotion (fear), very strong."],
          ]},
          { kind: "h3", text: "Bonus questions" },
          { kind: "ul", items: [
            "\"What stresses you most in day-to-day export operations?\"",
            "\"If you could eliminate one part of the process, what would it be?\"",
          ]},
          { kind: "h3", text: "Personal gain — GOLD" },
          { kind: "callout", text: "\"If this operation were more efficient — less rework, more deals closed — what would change for you day-to-day?\" OR \"How are you measured today — volume, efficiency, new clients?\"" },
        ],
      },
      {
        kicker: "05 — PAST vs PRESENT",
        title: "The GOLD slide to provoke",
        blocks: [
          { kind: "p", text: "Show the comparison: Past (taxi, landline phone, travel agency) → Present (Uber, iFood, Booking, Airbnb)." },
          { kind: "h3", text: "Instead of explaining, ask" },
          { kind: "ul", items: [
            "\"When you look at this… do you feel the meat sector has reached the 'present' or is still in the old model?\"",
            "\"Where do you think your operation is still most 'manual' today?\"",
            "\"In practice, day-to-day… how does it actually work for you today?\"",
          ]},
          { kind: "h3", text: "If the answer is shallow" },
          { kind: "ul", items: [
            "\"Can you give me a real example from day-to-day?\"",
            "\"And does that happen often?\"",
          ]},
          { kind: "callout", text: "Shift the habit: stop asserting (\"how Mundus does it today\") and start asking surgical, OPEN questions." },
        ],
      },
      {
        kicker: "06 — CRITICAL MOMENT",
        title: "When the client reveals pain",
        blocks: [
          { kind: "p", text: "If they say words like \"email\", \"WeChat\", \"slow\", \"China\", \"time zone\" — step in with risk questions to turn a report into real pain:" },
          { kind: "ul", items: [
            "\"How does that impact your closings?\"",
            "\"Have you ever lost a deal because of it?\"",
            "\"By how much does that delay you, roughly?\"",
            "\"Does that happen often? Tell me more.\"",
          ]},
          { kind: "callout", text: "This is what turns a report into real pain. Without real pain, no behaviour change." },
        ],
      },
      {
        kicker: "07 — TRANSITION",
        title: "After the client has talked a lot",
        blocks: [
          { kind: "callout", text: "\"Perfect — that helps a lot. In a moment I'll show you how Mundus comes in exactly on those points.\" \"I'll only show you the part that connects to what you mentioned, okay?\"" },
          { kind: "p", text: "This avoids turning into a full product tour." },
        ],
      },
      {
        kicker: "08 — FINAL SLIDE",
        title: "Connect, don't explain",
        blocks: [
          { kind: "p", text: "Now you do NOT explain everything — you connect each feature to what THEY said:" },
          { kind: "cards3", items: [
            { t: "If they mentioned time zone", d: "\"You mentioned the time zone — today Mundus automates that negotiation, so you don't have to wait for a reply…\"" },
            { t: "If they mentioned time (speed)", d: "\"You said it takes X — today we see deals happening in minutes…\"" },
            { t: "If they mentioned rework (centralisation)", d: "\"You said you need to send a lot of info — here everything is centralised…\"" },
          ]},
          { kind: "callout", text: "It's a personalised pitch, based on what THEY said." },
        ],
      },
      {
        kicker: "09 — NEXT STEP",
        title: "How to close the call",
        blocks: [
          { kind: "h3", text: "Always leave with a next step" },
          { kind: "ul", items: [
            "\"Does it make sense to test this with a first real offer?\"",
            "\"Who would be the best person on your team to run this with us?\"",
            "\"Can we book a next step to do this together?\"",
          ]},
        ],
      },
      {
        kicker: "10 — CHECKLIST",
        title: "Final call checklist",
        blocks: [
          { kind: "h3", text: "❌ DO NOT" },
          { kind: "ul", items: [
            "Cut the client off.",
            "Finish their sentence.",
            "Suggest the answer (\"24h? 48h?\").",
            "Rush through the slides.",
            "Talk more than 40% of the time.",
          ]},
          { kind: "h3", text: "✅ DO" },
          { kind: "ul", items: [
            "Ask → wait → deepen.",
            "Ask for a real example.",
            "Explore the pain to the end.",
            "Connect the solution to what THEY said.",
            "Leave with a next step.",
          ]},
        ],
      },
    ],
  },

  es: {
    tagline: "Script de discovery — call comercial Mundus",
    hero: "Cómo conducir una call de descubrimiento para que el cliente llegue por sí mismo a la conclusión de que necesita Mundus.",
    badge: "MATERIAL INTERNO | EQUIPO COMERCIAL | 2026",
    print: "Imprimir / Guardar PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "Material de entrenamiento interno",
      "Úselo antes de cada call de discovery",
      "Actualice cuando aprenda algo nuevo",
    ],
    signature: "MUNDUS TRADE | SCRIPT DE DISCOVERY | 2026",
    sections: [
      {
        kicker: "00 — PROBLEMA",
        title: "Qué está pasando en las calls hoy",
        blocks: [
          { kind: "p", text: "Hoy la call está mucho más centrada en explicar la plataforma que en entender al cliente. Efecto involuntario: el cliente entra como oyente, no como participante. Eso reduce conexión y urgencia." },
          { kind: "callout", text: "Discovery no es explicar — es descubrir. El objetivo no es convencer al cliente de que Mundus es buena. Es que él llegue a la conclusión de que la necesita." },
          { kind: "ul", items: [
            "Muchas preguntas cerradas (sí/no).",
            "Respuestas interrumpidas.",
            "Validación guiada (\"sufres esto, ¿verdad?\").",
            "Riesgo: el cliente concuerda pero no siente. Sin dolor real, no hay cambio de comportamiento.",
          ]},
          { kind: "ul", items: [
            "Menos pitch.",
            "Más escucha.",
            "Más curiosidad.",
            "Benchmark: en discovery, el cliente debe hablar 70–80% del tiempo.",
          ]},
        ],
      },
      {
        kicker: "01 — BENCHMARKS",
        title: "Por qué 80/20",
        blocks: [
          { kind: "ul", items: [
            "Gong (miles de calls analizadas): las mejores tienen al cliente hablando 60–70%. Top performers llegan a 70–80%.",
            "HubSpot: discovery eficaz = más preguntas abiertas + escucha activa.",
          ]},
          { kind: "quote", text: "Los mejores vendedores no son los que explican mejor, son los que hacen al cliente pensar mejor." },
        ],
      },
      {
        kicker: "02 — MÉTODO",
        title: "Selling Through Curiosity + 80/20",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "Enseñar y provocar, no empujar." },
            { t: "SPIN Selling", d: "Basado en preguntas: Situación, Problema, Implicación, Need-Payoff." },
            { t: "Gap Selling", d: "La venta sucede cuando entiende profundamente el \"gap\" del cliente." },
          ]},
          { kind: "table", head: ["Letra", "Tipo", "Objetivo"], rows: [
            ["S", "Situation", "Identifica el contexto."],
            ["P", "Problem", "Revela desafíos."],
            ["I", "Implication", "Explora consecuencias."],
            ["N", "Need-Payoff", "Lleva al cliente a reconocer el valor de la solución."],
          ]},
        ],
      },
      {
        kicker: "03 — APERTURA",
        title: "Cómo abrir la call",
        blocks: [
          { kind: "ul", items: [
            "El deck no es para presentar. Es para provocar conversación.",
            "Cada slide es una pregunta, no una explicación.",
            "Si hablan más que el cliente, perdieron la call.",
          ]},
          { kind: "callout", text: "\"Antes de entrar en Mundus, me gustaría entender un poco más cómo operan ustedes hoy — ¿puede ser?\" Haga silencio y deje que responda." },
        ],
      },
      {
        kicker: "04 — LOS 6 DESAFÍOS",
        title: "Cómo conducir los 6 problemas del sector",
        blocks: [
          { kind: "callout", text: "REGLA DE ORO: no pasar por los 6. Explorar 2 a 3 máximo. Ir a fondo." },
          { kind: "table", head: ["Bloque", "Cómo abrir", "Cómo profundizar"], rows: [
            ["1. Comunicación fragmentada", "\"Hoy usan e-mail, WhatsApp, WeChat… ¿cómo gestionan todo eso?\"", "\"¿Eso molesta o ya está bien para ustedes?\""],
            ["2. Negociación lenta", "\"¿Cuánto tiempo, en promedio, les lleva cerrar un contenedor?\"", "\"¿Y por qué tarda eso?\" — NUNCA sugerir número."],
            ["3. Retrabajo", "\"¿Terminan enviando mucha información repetida?\"", "\"¿Eso molesta o ya es parte del proceso?\""],
            ["4. Falta de transparencia", "\"¿Tienen visibilidad clara de quién compra, historial?\"", "Dejar al cliente desarrollar."],
            ["5. Visibilidad de mercado", "\"¿Tienen visibilidad de lo que el mercado demanda?\"", "\"¿Les pasó tener producto y no saber que había comprador buscando?\""],
            ["6. Riesgos", "\"¿Cuáles son los mayores riesgos que gestionan hoy?\"", "\"¿Tuvieron algún problema serio?\" — apela al miedo."],
          ]},
          { kind: "callout", text: "Ganancia personal — ORO: \"Si esta operación fuera más eficiente, ¿qué cambiaría para usted en el día a día?\"" },
        ],
      },
      {
        kicker: "05 — PASADO vs PRESENTE",
        title: "El slide ORO para provocar",
        blocks: [
          { kind: "p", text: "Muestre la comparación: Pasado (taxi, teléfono fijo, agencia de viajes) → Presente (Uber, iFood, Booking, Airbnb)." },
          { kind: "ul", items: [
            "\"¿Siente que el sector de carnes ya llegó a ese 'presente' o aún está en el modelo antiguo?\"",
            "\"¿Dónde cree que su operación sigue siendo más 'manual' hoy?\"",
          ]},
        ],
      },
      {
        kicker: "06 — MOMENTO CRÍTICO",
        title: "Cuando el cliente revela el dolor",
        blocks: [
          { kind: "p", text: "Si dice \"email\", \"WeChat\", \"demora\", \"China\", \"huso horario\" — entre con preguntas de riesgo:" },
          { kind: "ul", items: [
            "\"¿Cómo impacta eso en el cierre?\"",
            "\"¿Perdió negocio por eso?\"",
            "\"¿Cuánto le atrasa, más o menos?\"",
            "\"¿Pasa con frecuencia? Cuénteme más.\"",
          ]},
        ],
      },
      {
        kicker: "07 — TRANSICIÓN",
        title: "Después de que el cliente habló mucho",
        blocks: [
          { kind: "callout", text: "\"Perfecto — eso ayuda mucho a entender. En seguida le muestro cómo Mundus entra justo en esos puntos.\" \"Le voy a mostrar sólo la parte que conecta con lo que comentó.\"" },
        ],
      },
      {
        kicker: "08 — SLIDE FINAL",
        title: "Conectar, no explicar",
        blocks: [
          { kind: "cards3", items: [
            { t: "Si habló de huso horario", d: "\"Usted comentó del huso — hoy Mundus automatiza esa negociación.\"" },
            { t: "Si habló de tiempo", d: "\"Comentó que demora X — hoy vemos negociaciones en minutos.\"" },
            { t: "Si habló de retrabajo", d: "\"Aquí toda la información queda centralizada.\"" },
          ]},
        ],
      },
      {
        kicker: "09 — PRÓXIMO PASO",
        title: "Cerrar siempre con próximo paso",
        blocks: [
          { kind: "ul", items: [
            "\"¿Tiene sentido probarlo con una primera oferta real?\"",
            "\"¿Quién sería la mejor persona de su equipo para subirlo con nosotros?\"",
            "\"¿Podemos agendar un próximo paso?\"",
          ]},
        ],
      },
      {
        kicker: "10 — CHECKLIST",
        title: "Checklist final",
        blocks: [
          { kind: "h3", text: "❌ NO HACER" },
          { kind: "ul", items: [
            "Cortar al cliente.",
            "Completar la frase.",
            "Sugerir respuesta.",
            "Pasar rápido por los slides.",
            "Hablar más del 40% del tiempo.",
          ]},
          { kind: "h3", text: "✅ HACER" },
          { kind: "ul", items: [
            "Preguntar → esperar → profundizar.",
            "Pedir ejemplo real.",
            "Explorar el dolor hasta el fin.",
            "Conectar la solución con lo que ÉL dijo.",
            "Salir con próximo paso.",
          ]},
        ],
      },
    ],
  },

  zh: {
    tagline: "Discovery 脚本 — Mundus 商务通话",
    hero: "如何引导发现式通话，让客户自己得出需要 Mundus 的结论。",
    badge: "内部材料 | 销售团队 | 2026",
    print: "打印 / 保存 PDF",
    footer_kicker: "Mundus Trade",
    footer_lines: [
      "内部培训材料",
      "每次 discovery 通话前使用",
      "学到新东西时及时更新",
    ],
    signature: "MUNDUS TRADE | DISCOVERY 脚本 | 2026",
    sections: [
      {
        kicker: "00 — 问题",
        title: "如今通话中正在发生什么",
        blocks: [
          { kind: "p", text: "目前通话过于专注于解释平台，而不是理解客户。无意的效果：客户成为听众而非参与者，连接和紧迫感都被削弱。" },
          { kind: "callout", text: "Discovery 不是解释 — 而是发现。目标不是说服客户 Mundus 很好，而是让他得出自己需要它的结论。" },
          { kind: "ul", items: [
            "封闭式问题过多（是/否）。",
            "客户回答被打断。",
            "引导式确认（\"你也遇到这个对吧？\"）。",
            "风险：客户同意但没感觉。没有真实痛点就没有行为改变。",
          ]},
          { kind: "ul", items: [
            "少推销。",
            "多倾听。",
            "多好奇。",
            "基准：在 discovery 中，客户应说 70–80% 的时间。",
          ]},
        ],
      },
      {
        kicker: "01 — 基准",
        title: "为何 80/20",
        blocks: [
          { kind: "ul", items: [
            "Gong（分析数千通话）：最佳通话客户讲 60–70%。顶尖表现者达到 70–80%。",
            "HubSpot：高效 discovery = 更多开放式问题 + 主动倾听。",
          ]},
          { kind: "quote", text: "最好的销售不是讲得最好的，而是让客户想得最好的。" },
        ],
      },
      {
        kicker: "02 — 方法",
        title: "好奇式销售 + 80/20",
        blocks: [
          { kind: "cards3", items: [
            { t: "The Challenger Sale", d: "教导 + 挑战，不推销。" },
            { t: "SPIN Selling", d: "完全基于问题：情境、问题、影响、收益。" },
            { t: "Gap Selling", d: "深入理解客户的\"差距\"时才会发生销售。" },
          ]},
          { kind: "table", head: ["字母", "类型", "目标"], rows: [
            ["S", "Situation", "识别客户的背景。"],
            ["P", "Problem", "揭示挑战。"],
            ["I", "Implication", "探索问题的后果。"],
            ["N", "Need-Payoff", "让客户认识到解决方案的价值。"],
          ]},
        ],
      },
      {
        kicker: "03 — 开场",
        title: "如何开始通话",
        blocks: [
          { kind: "ul", items: [
            "幻灯片不是用来展示，是用来引发对话。",
            "每张幻灯片是一个问题，而非解释。",
            "如果你说得比客户多，就\"输了\"这通通话。",
          ]},
          { kind: "callout", text: "\"在进入 Mundus 之前，我想先了解一下你们今天是如何运营的 — 可以吗？\" 保持沉默，让对方回答。" },
        ],
      },
      {
        kicker: "04 — 六大挑战",
        title: "如何引导行业六大问题",
        blocks: [
          { kind: "callout", text: "黄金法则：不要把六个全走完。最多探索 2–3 个。深入挖掘。" },
          { kind: "table", head: ["模块", "如何开场", "如何深入"], rows: [
            ["1. 沟通碎片化", "\"今天你们用邮件、WhatsApp、微信… 怎么管理这些？\"", "\"这碍事吗，还是已经习惯了？\""],
            ["2. 谈判缓慢", "\"平均要多长时间才能成交一个货柜？\"", "\"为什么要那么久？\" — 切勿给出数字。"],
            ["3. 重复劳动", "\"你们是不是经常重复发送同样的信息？\"", "\"这困扰你们吗？\""],
            ["4. 缺乏透明度", "\"你们能清楚看到谁在买、历史、行为吗？\"", "让客户展开。"],
            ["5. 市场可见度", "\"你们对市场需求有可见度，还是依赖找上门的需求？\"", "\"有没有发生过你有货但不知道有买家在找？\""],
            ["6. 风险", "\"今天你们出口业务管理的最大风险是什么？\"", "\"曾经出过严重问题吗？\" — 引发恐惧情绪，非常有力。"],
          ]},
          { kind: "callout", text: "个人收益 — 黄金问题：\"如果这个流程更高效，对你日常工作会有什么改变？\"" },
        ],
      },
      {
        kicker: "05 — 过去 vs 现在",
        title: "用于挑战的黄金幻灯片",
        blocks: [
          { kind: "p", text: "展示对比：过去（出租车、固定电话、旅行社）→ 现在（Uber、Booking、Airbnb）。" },
          { kind: "ul", items: [
            "\"看着这个 — 你觉得肉类行业已经到了'现在'，还是仍停留在旧模式？\"",
            "\"你认为你们运营中哪里仍然最'手工'？\"",
          ]},
        ],
      },
      {
        kicker: "06 — 关键时刻",
        title: "当客户透露痛点时",
        blocks: [
          { kind: "p", text: "如果他说\"邮件\"\"微信\"\"延迟\"\"中国\"\"时差\"，进入风险问题：" },
          { kind: "ul", items: [
            "\"这对成交有什么影响？\"",
            "\"曾因此失去生意吗？\"",
            "\"大约延迟多少？\"",
            "\"经常发生吗？详细说说。\"",
          ]},
        ],
      },
      {
        kicker: "07 — 过渡",
        title: "当客户说了很多之后",
        blocks: [
          { kind: "callout", text: "\"很好 — 这帮我理解了很多。稍后我会展示 Mundus 如何切入这些点。\" \"我只展示与你提到的相关部分，可以吗？\"" },
        ],
      },
      {
        kicker: "08 — 最后幻灯片",
        title: "连接，不解释",
        blocks: [
          { kind: "cards3", items: [
            { t: "如果谈到时差", d: "\"你提到时差 — Mundus 自动化了那个谈判，你不必等回复。\"" },
            { t: "如果谈到时间（速度）", d: "\"你说要 X 时间 — 我们看到交易在几分钟内完成。\"" },
            { t: "如果谈到重复劳动（集中）", d: "\"这里所有信息都已集中。\"" },
          ]},
        ],
      },
      {
        kicker: "09 — 下一步",
        title: "通话结束总要留下下一步",
        blocks: [
          { kind: "ul", items: [
            "\"用一个真实的报价测试一下，可以吗？\"",
            "\"你团队里谁最适合一起跟进？\"",
            "\"我们能约一次下一步会面吗？\"",
          ]},
        ],
      },
      {
        kicker: "10 — 清单",
        title: "最终通话清单",
        blocks: [
          { kind: "h3", text: "❌ 不要做" },
          { kind: "ul", items: [
            "打断客户。",
            "替他完成句子。",
            "建议答案（\"24h？48h？\"）。",
            "快速走完幻灯片。",
            "说话超过 40% 的时间。",
          ]},
          { kind: "h3", text: "✅ 要做" },
          { kind: "ul", items: [
            "提问 → 等待 → 深入。",
            "请求真实例子。",
            "把痛点挖到底。",
            "把方案与他所说的连接。",
            "总要留下下一步。",
          ]},
        ],
      },
    ],
  },
};

export function DiscoveryScriptDocument() {
  return <AdminDocView content={CONTENT} />;
}