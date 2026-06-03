import { AdminDocView, type DocContent, type Lang } from "./AdminDocRenderer";

// Single PT content reused for all languages until full translations land.
// Structure mirrors BrandbookDocument so look-and-feel is identical.
const PT: DocContent = {
  tagline: "Guia de conversas — referência interna",
  hero: "Como falar sobre a Mundus Trade — por persona. Elevator pitch, dores, benefícios, perguntas e objeções.",
  badge: "DOCUMENTO INTERNO | OPERADORES MUNDUS | 2026",
  print: "Imprimir / Salvar PDF",
  footer_kicker: "Mundus Trade",
  footer_lines: [
    "Mundus Trade LLC · Ocoee, Florida, USA",
    "Guia operacional · Versão 2.0",
    "Atualize sempre que houver mudança em persona, argumento ou abordagem",
  ],
  signature: "MUNDUS TRADE | GUIA DE CONVERSAS | 2026",
  sections: [
    {
      kicker: "00 — COMO USAR",
      title: "Como usar este guia",
      blocks: [
        { kind: "lede", text: "Este guia foi criado para que qualquer pessoa do time saiba exatamente o que dizer dependendo de com quem está falando. Cada persona tem elevator pitch, dores, benefícios, como abrir a conversa e como lidar com objeções." },
        { kind: "callout", text: "Regra de ouro: nunca fale de funcionalidade. Fale do que muda para aquela pessoa." },
        { kind: "cards2", items: [
          { t: "S1 — Dono / Diretor do Frigorífico", d: "Supplier. Decide se a empresa entra. Argumento: dinheiro e concorrência." },
          { t: "S2 — Gerente de Exportação", d: "Supplier. Responde pelo resultado. Argumento: controle e visibilidade." },
          { t: "S3 — Trader / Operador", d: "Supplier. A conversa mais delicada. Argumento: aliviar o trabalho dele." },
          { t: "B1 — Decisor / Dono da Importadora", d: "Buyer. Barreira de entrada mais baixa. Argumento: custo zero e transparência." },
        ]},
        { kind: "callout", text: "Regra de uso das perguntas: uma abre dor, uma mede intensidade, uma posiciona a Mundus. Nunca as três de uma vez — mandar uma, esperar resposta, continuar." },
      ],
    },
    {
      kicker: "01 — PERGUNTAS POR PERSONA",
      title: "Três perguntas por persona (WhatsApp ou telefone)",
      blocks: [
        { kind: "p", text: "Nunca jogar as três de uma vez. Uma por mensagem ou chamada, na ordem. Esperar resposta antes de continuar." },
        { kind: "table", head: ["Persona", "P1 — Abre dor", "P2 — Mede intensidade", "P3 — Posiciona"], rows: [
          ["S1 Dono / Diretor", "Com tudo que está acontecendo de cota e mercado esse ano, como vocês estão se posicionando pra garantir que estão pegando o melhor preço nos mercados que ainda têm janela?", "Quando você olha pro seu time de exportação hoje, você sente que tem visibilidade real do que está sendo negociado e a que preço?", "Tem algo específico que você precisaria ver pra sentir que uma ferramenta nova realmente vale o seu tempo?"],
          ["S2 Gerente de Exportação", "Quando você precisa entender como estão indo as negociações do seu time — preços, o que fechou, o que perdeu — como você consegue essa visão hoje? Tem centralizado?", "Já aconteceu de perder uma janela de mercado porque a informação demorou ou o follow-up caiu no meio? Como isso impacta o resultado do time?", "Se o time conseguisse fechar mais sem depender de você em cada passo — e você tivesse visibilidade em tempo real — isso mudaria como você lidera?"],
          ["S3 Trader / Operador", "Quando chegam propostas de mercados diferentes ao mesmo tempo, como você lida hoje com o cálculo e o follow-up? Qual é a parte que mais consome seu tempo?", "Já aconteceu de perder um negócio porque a resposta demorou — sua ou do comprador? O que aconteceu?", "O que precisaria mudar no seu dia a dia pra você conseguir fechar mais sem aumentar o volume de trabalho?"],
          ["B1 Decisor / Importadora", "Quando você está cotando de vários fornecedores ao mesmo tempo, como você consegue comparar e tomar a decisão? O que mais atrapalha?", "Você já perdeu uma boa oportunidade de compra porque não conseguiu fechar rápido o suficiente?", "Se você pudesse ver o preço e a certificação do fornecedor antes de qualquer negociação, isso mudaria algo na sua decisão?"],
        ]},
      ],
    },
    {
      kicker: "02 — STATUS DE CAMPO",
      title: "Status das abordagens — Suppliers",
      blocks: [
        { kind: "table", head: ["Quem", "Persona", "Status", "Objeção / contexto", "Oportunidade"], rows: [
          ["Vitória do Paraguai (Naira)", "Gerente de Export.", "Reunião realizada", "Volume pequeno, clientes com contrato. Vê como complementar.", "Uso imediato: sobras de cortes sem cliente regular."],
          ["Mercúrio Alimentos (Patrícia)", "Dona / Decisora", "Reunião a confirmar", "Correria e viagens — baixa prioridade, não rejeição.", "Adorou a plataforma na primeira apresentação. Quer avançar."],
          ["Boveleu (Helder)", "Dono / Decisor", "Visita presencial pendente", "Sempre na correria. Subiu oferta uma vez e sumiu.", "Fernando tem relacionamento direto. Celular disponível."],
          ["Barra Mansa (Sato)", "Dono", "Contato reativado", "Não identificada ainda.", "Entrou em contato espontaneamente — provavelmente via post."],
          ["Frisa (Giancarlo)", "Gerente de Export.", "Pendente", "Baixa prioridade. Padrão 'próxima semana' sem confirmar.", "Contato aberto via Câmara Árabe. Perfil relevante."],
          ["Friato", "Dono", "Reunião realizada", "Desconforto em colocar clientes na plataforma. Acha alto 0,30% pra frango.", "Disse que vai enviar 3 bids."],
        ]},
      ],
    },
    {
      kicker: "03 — STATUS DE CAMPO",
      title: "Status das abordagens — Buyers",
      blocks: [
        { kind: "table", head: ["Quem", "Perfil", "Status", "Objeção / contexto", "Oportunidade"], rows: [
          ["Motassen (Palestina)", "Comprador Operacional", "Entrou na plataforma", "Traders não respondem a tempo, oferta some ao fechar.", "Sem medo de perder supplier. Histórico gera confiança automática."],
          ["Ibrahim (Palestina)", "Comprador Operacional", "Entrou na plataforma", "Condicionou uso ativo ao volume de ofertas disponíveis.", "Mercado pequeno. Aberto a diversificar fornecedores."],
          ["Sherwin (Hong Kong)", "Compradora Sênior, 30 anos", "Conversa realizada, não ativou", "Desconfia de frigorífico que nunca apareceu em feira.", "Maior dor: container mix com múltiplos fornecedores — Mundus resolve."],
          ["Chris (Canadá)", "Buyer grande, 20+ cont./mês", "Reunião agendada c/ Gustavo", "Valoriza contato humano. Conhece modelo via Trade Café.", "Maior comprador no radar. Conversão = prova de conceito forte."],
          ["André Tarchich (Arábia Saudita)", "Trader / Buyer", "Sem retorno", "Não atende ligação, demora no e-mail.", "Tem demandas ativas no mercado."],
          ["Base Pauli (70 contatos)", "Buyers internacionais", "15% retorno positivo", "'Frio demais' / 'Amo conexões humanas' / 'Compras fechadas até maio'.", "LinkedIn e telefone funcionaram. E-mail não performa."],
        ]},
      ],
    },
    {
      kicker: "04 — S1 DONO DO FRIGORÍFICO",
      title: "S1 — Dono / Diretor do Frigorífico",
      blocks: [
        { kind: "p", text: "Decide se a empresa entra na Mundus — mas não executa. Quer dinheiro no bolso, reputação e estar à frente da concorrência. O argumento que chega até ele precisa ser de negócio, não de tecnologia." },
        { kind: "h3", text: "Elevator pitch — 'O que é a Mundus?' · 30 seg" },
        { kind: "quote", text: "A Mundus é um marketplace B2B de carne — conecta seu frigorífico direto com importadores verificados no mundo todo, sem intermediário. Você publica sua oferta, define seu preço, e o sistema negocia por você 24 horas por dia. Você só paga quando o negócio fechar." },
        { kind: "p", text: "Parar aqui e deixar ele reagir. Não continuar explicando." },
        { kind: "h3", text: "Numa feira ou evento · 60 seg" },
        { kind: "quote", text: "Seu time hoje negocia por e-mail, WhatsApp e planilha com compradores que ele já conhece. O problema é que existem compradores pagando mais — em Filipinas, Oriente Médio, Indonésia — que ele nunca vai alcançar pelo network atual. A Mundus resolve isso: você publica uma vez, chega para importadores verificados no mundo todo, e o sistema negocia dentro dos seus parâmetros. Nada de mensalidade — 0,30% só quando fechar." },
        { kind: "p", text: "CTA: 'Posso te mostrar como está a plataforma hoje?'" },
        { kind: "h3", text: "Já conhece mas não ativou" },
        { kind: "quote", text: "Desde que você se cadastrou, já tem frigorífico publicando oferta e importador navegando. O mercado está se movendo lá dentro — mas só quem tem oferta ativa aparece. Seu concorrente que subiu essa semana já está visível para compradores que você nunca alcançou." },
        { kind: "h3", text: "Dores — o que trava o Dono hoje" },
        { kind: "table", head: ["Dor", "Detalhe"], rows: [
          ["Opera no escuro sobre preços", "Vende achando que está bem, mas o concorrente pode estar ganhando mais no mesmo corte no mesmo mercado — e ele nunca fica sabendo."],
          ["Quer mais opções de comprador", "Mesmo com carteira cheia, está sempre buscando quem paga mais — feira, rede de relacionamento, contatos de contatos."],
          ["Não confia no processo do time", "Vê o gerente e o trader no e-mail e WhatsApp, sabe que tem falha, mas não tem visibilidade do que está acontecendo de verdade."],
          ["Vulnerabilidade geopolítica concentrada", "Cota da China acabou, embargo, doença sanitária — se depende de 1 ou 2 mercados, o negócio trava do dia para a noite."],
          ["Dependência de feiras", "Vai à feira não porque quer, mas porque é o único canal que funciona — caro, pontual e limitado ao network atual."],
        ]},
        { kind: "h3", text: "Benefícios — o que muda com a Mundus" },
        { kind: "table", head: ["Antes da Mundus", "Com a Mundus"], rows: [
          ["Vende para quem conhece, ao preço que o trader fecha", "Acessa demanda global em tempo real. Sabe o que o mercado paga antes de fechar."],
          ["Sem visibilidade do que o time está negociando", "Histórico centralizado: o que foi negociado, por quem e a qual preço."],
          ["Se a cota da China fecha, o negócio trava", "Quando a cota fecha, já tem demanda mapeada em mercados alternativos."],
          ["Depende de feira para acessar comprador novo", "Oferta publicada uma vez alcança compradores verificados no mundo todo."],
          ["Sem mensalidade — 0,30% só quando fechar", "Risco zero para testar. Se não fechar, não pagou nada."],
        ]},
        { kind: "h3", text: "Como abrir a conversa" },
        { kind: "p", text: "Comece pelo mercado e pelo concorrente — não pela plataforma. Isso traz urgência." },
        { kind: "quote", text: "[NOME], tenho acompanhado o que está acontecendo com as cotas e os mercados esse ano. Você tem sentido isso na ponta? Eu queria entender melhor como vocês estão se posicionando agora — e te mostrar o que a Mundus já está entregando para frigoríficos que estavam na mesma situação." },
        { kind: "p", text: "Tom: par a par, estratégico. Se ele abre sobre dor — escuta, não vende. A plataforma aparece quando o problema já está na mesa." },
        { kind: "h3", text: "Objeções e como lidar" },
        { kind: "table", head: ["Objeção", "Como responder"], rows: [
          ["'Já tenho mais clientes do que consigo atender.'", "Isso significa que você pode escolher quem paga mais. Mas só consegue fazer isso se tiver acesso a todas as opções. Hoje você vende para quem conhece, não necessariamente para quem paga o melhor preço agora."],
          ["'Não tenho tempo, meu time já está sobrecarregado.'", "Você não opera — seu trader opera. A Mundus tira trabalho do time, não adiciona. E você passa a ter visibilidade das negociações sem entrar em cada conversa."],
          ["'Prefiro esperar estar mais estável antes de testar.'", "Por isso o modelo é sem mensalidade — você só paga quando fechar negócio. O risco de testar é zero. O risco de esperar enquanto o concorrente já está lá dentro é outro assunto."],
          ["'Meu mercado é específico, não sei se tem buyer pra minha proteína.'", "Essa é exatamente a informação que a Mundus tem — o que está sendo demandado, em qual mercado, a qual preço. Antes de assumir que não tem, vale ver o que está ativo agora."],
          ["'Não vou colocar meus clientes lá dentro.'", "A plataforma não expõe seu cliente para concorrente. O que você vê são demandas de mercado, não o contato do seu buyer. Você decide o que aceita."],
        ]},
        { kind: "callout", text: "Lembrete: não fale de funcionalidade. Ele não quer saber como a plataforma funciona. Quer saber quanto vai ganhar a mais e o que o concorrente já está fazendo." },
      ],
    },
    {
      kicker: "05 — S2 GERENTE DE EXPORTAÇÃO",
      title: "S2 — Gerente de Exportação",
      blocks: [
        { kind: "p", text: "É quem responde pelo resultado da exportação — mas não executa e não decide sozinho. Está no meio: o dono cobra de cima, o trader executa embaixo. Quer que a equipe feche mais sem precisar dele em cada passo. O argumento precisa mostrar controle e resultado — não tecnologia." },
        { kind: "h3", text: "Elevator pitch — 'O que é a Mundus?' · 45 seg" },
        { kind: "quote", text: "A Mundus centraliza tudo que o seu time faz hoje espalhado em e-mail, WhatsApp e planilha. O trader define os parâmetros uma vez e o sistema negocia por ele 24 horas. Você passa a ter visibilidade do que está sendo negociado, por quem e a qual preço, sem precisar entrar em cada conversa." },
        { kind: "p", text: "Parar aqui. Se perguntar como funciona, mostrar oferta ativa. Dado real vale mais que explicação." },
        { kind: "h3", text: "Numa feira ou evento · 60 seg" },
        { kind: "quote", text: "Você provavelmente tem um trader que resolve tudo na cabeça dele — calcula frete no Excel, dá follow-up por WhatsApp e WeChat ao mesmo tempo, perde timing quando o comprador some por dois dias. O problema não é o trader, é o processo. A Mundus tira o retrabalho do prato dele e te dá visibilidade do que está acontecendo em tempo real. Seu time fecha mais. Você sabe o que está fechando." },
        { kind: "p", text: "CTA: 'Posso te mostrar como um frigorífico já está usando?'" },
        { kind: "h3", text: "Dores — o que trava o Gerente hoje" },
        { kind: "table", head: ["Dor", "Detalhe"], rows: [
          ["Não enxerga o que o time está fazendo", "Dados fragmentados — proposta em e-mail, status em WhatsApp, histórico em planilha. Pede relatório e recebe planilha manual."],
          ["Depende do trader para tudo", "Se o trader está ocupado, sobrecarregado ou de férias, a operação trava. Não tem processo — tem pessoa."],
          ["Perde negócio por lentidão de resposta", "O comprador está em outro fuso. O trader demora. Quando responde, o preço mudou ou o container já foi vendido."],
          ["Quer crescer sem contratar", "Quer que o time feche mais volume sem aumentar headcount. Hoje o gargalo é operacional, não comercial."],
          ["Vulnerabilidade geopolítica sem antídoto", "China fechou cota, surgiu embargo. Precisa mover volume para outro mercado rápido — mas não tem visibilidade de onde está a demanda agora."],
        ]},
        { kind: "h3", text: "Benefícios — o que muda com a Mundus" },
        { kind: "table", head: ["Antes da Mundus", "Com a Mundus"], rows: [
          ["Sem visibilidade do que o time está negociando", "Histórico centralizado: o que foi negociado, por quem e a qual preço. Decide com dado."],
          ["Trader precisa do gerente em cada passo", "Sistema negocia dentro dos parâmetros que o trader define. Time fecha mais sem interrupção."],
          ["Perde janela de preço por fuso ou lentidão", "Negociação automática 24/7 — sistema responde enquanto o trader dorme."],
          ["Acessa só compradores do network atual", "Chega em Filipinas, Indonésia, Oriente Médio sem depender de feira ou contato de contato."],
          ["Quando a China fecha, não sabe para onde mover", "Quando a cota fecha, já tem demanda mapeada em mercados alternativos — sem correr na última hora."],
        ]},
        { kind: "h3", text: "Objeções e como lidar" },
        { kind: "table", head: ["Objeção", "Como responder"], rows: [
          ["'Meu trader já tem um processo que funciona.'", "Com certeza — e não é pra mudar o que funciona. A Mundus não substitui o processo dele, tira o retrabalho. O que ele gasta tempo fazendo no Excel ou no WhatsApp, o sistema faz automaticamente. O relacionamento continua sendo dele."],
          ["'Não tenho tempo pra implementar uma ferramenta nova agora.'", "Você não implementa — seu trader usa. A primeira oferta leva 15 minutos. Depois disso, ele clona e atualiza. Não tem onboarding, não tem treinamento. A gente acompanha a primeira vez."],
          ["'Preciso ver resultado antes de engajar o time.'", "Por isso o modelo é sem mensalidade — você só paga quando fechar negócio. O risco de testar é zero. E hoje já tem oferta ativa na plataforma e comprador navegando."],
          ["'Meu dono ainda não deu sinal verde.'", "Aqui entra Fernando diretamente — de par a par com o dono, sem passar pelo gerente. Não forçar essa conversa pelo gerente se o dono ainda não foi abordado."],
          ["[Silêncio, 'vou ver', resposta vaga]", "Não forçar. Perguntar: 'O que faria isso fazer sentido pra você agora?' — e ouvir. Pode ser o trader resistindo, o dono que não sabe, ou timing."],
        ]},
        { kind: "callout", text: "Lembrete: o gerente quer resultado que apareça no nome dele. O argumento mais forte é o que ele vai poder mostrar pro dono. Fale de controle, visibilidade e volume fechado." },
      ],
    },
    {
      kicker: "06 — S3 TRADER / OPERADOR",
      title: "S3 — Trader / Operador (a conversa mais delicada)",
      blocks: [
        { kind: "p", text: "É quem faz a venda acontecer no dia a dia — e onde a ativação trava ou acontece. Tem medo de ser substituído, mas não vai dizer isso. Resiste em silêncio quando a Mundus chega por cima. A chave é chegar como parceiro curioso sobre o trabalho dele — não como quem quer convencê-lo de nada." },
        { kind: "h3", text: "Elevator pitch — 'O que é a Mundus?' · 45 seg" },
        { kind: "quote", text: "A Mundus é uma plataforma que automatiza a parte chata do seu trabalho — calcula frete, recebe propostas e negocia dentro dos parâmetros que você define. O seu relacionamento com os clientes continua sendo seu. A Mundus adiciona compradores extras que você não alcançaria pelo seu network, sem tirar nada do que você já tem." },
        { kind: "p", text: "'Parte chata' é intencional — deixa ele perguntar o que é a parte chata para ele." },
        { kind: "h3", text: "Numa feira ou evento · 60 seg" },
        { kind: "quote", text: "Sabe quando você recebe 20 propostas ao mesmo tempo de mercados diferentes, tem que calcular frete por item, dar follow-up em WhatsApp e WeChat, e ainda o cara some por dois dias? A Mundus resolve isso — o sistema negocia dentro dos seus parâmetros, 24 horas por dia, e você acorda com o negócio encaminhado." },
        { kind: "p", text: "CTA: 'Como é que você lida com isso hoje?' — faz ele falar do problema. Não avança para demo antes disso." },
        { kind: "h3", text: "Dores — o que trava o Trader hoje" },
        { kind: "table", head: ["Dor", "Detalhe"], rows: [
          ["Processo manual absurdo", "Recebe 30 propostas para 5 containers, calcula frete no Excel, dá follow-up por WhatsApp e WeChat ao mesmo tempo — tudo na cabeça ou em planilha."],
          ["Perde timing por lentidão de resposta", "O buyer está em outro fuso, demora, e quando finalmente volta o preço já mudou ou o container já foi vendido para outro."],
          ["Informações quebradas em todo lugar", "Proposta em e-mail, status em WhatsApp, histórico em planilha — abre 10 telas para fechar 1 negócio."],
          ["Não alcança compradores fora do network", "Vende para quem já conhece — não por falta de vontade, mas porque não tem como chegar em quem não está na rede dele."],
          ["Medo de substituição (não vai dizer isso)", "Se a Mundus chegou por ordem do dono ou do gerente, a resistência é automática. Precisa ser incluído, não empurrado."],
        ]},
        { kind: "h3", text: "Benefícios — o que muda com a Mundus" },
        { kind: "table", head: ["Antes da Mundus", "Com a Mundus"], rows: [
          ["Calcula frete manualmente para cada proposta no Excel", "Sistema calcula dentro dos parâmetros que ele define. Ele revisa, não executa."],
          ["Fica esperando resposta no WhatsApp / WeChat", "Negocia 24h por dia dentro dos limites pré-definidos. Ele acorda com o negócio encaminhado."],
          ["Atende só quem já está no seu contato", "Acessa compradores verificados que nunca teriam chegado até ele pelo network atual."],
          ["Perde negócio quando está ocupado com outro", "A plataforma responde em minutos — ele não precisa estar disponível o tempo todo."],
          ["Perde crédito do volume — relevância ameaçada", "A Mundus não tira o crédito das vendas dele — aumenta o volume que ele consegue fechar."],
        ]},
        { kind: "h3", text: "Objeções e como lidar" },
        { kind: "table", head: ["Objeção", "Como responder"], rows: [
          ["'Já tenho um jeito que funciona.'", "Com certeza — e não é pra mudar o que funciona. A ideia é tirar o que consome tempo sem agregar. Você quer gastar energia calculando frete no Excel ou negociando com o comprador certo?"],
          ["'Meus clientes preferem WhatsApp / WeChat.'", "Seus clientes atuais continuam exatamente como estão — você continua no WhatsApp com eles. A Mundus traz compradores novos, os que você não teria alcançado de outra forma."],
          ["'Não tenho tempo para aprender uma ferramenta nova.'", "Por isso o onboarding é simples. Você publica a primeira oferta em minutos. A gente acompanha a primeira vez se quiser."],
          ["'A plataforma vai tirar meu trabalho.'", "A plataforma automatiza a parte repetitiva. O seu trabalho é o relacionamento e o fechamento — isso continua sendo seu. A Mundus só tira o que te impede de fechar mais."],
          ["'Eu gosto da conexão humana com os clientes.'", "Seus clientes atuais continuam como estão. A conexão humana é o diferencial seu — a Mundus só adiciona compradores novos que você não alcançaria de outra forma."],
        ]},
        { kind: "callout", text: "Lembrete crítico: abordagem top-down gera resistência automática. Se a Mundus chegou por ordem do dono/gerente — Fernando entra na conversa diretamente, de par a par, sem script." },
      ],
    },
    {
      kicker: "07 — B1 BUYER",
      title: "B1 — Decisor / Dono da Importadora",
      blocks: [
        { kind: "p", text: "Decide se a empresa usa a Mundus ou não. Está afogado em propostas desfragmentadas de dezenas de fornecedores — cada um num formato diferente. Compra de quem já conhece não por preguiça, mas porque humanamente não consegue comparar tudo. A barreira de entrada é a mais baixa das quatro personas." },
        { kind: "callout", text: "As conversas com buyers acontecem em inglês — os pitches abaixo trazem a versão original em inglês com tradução em português." },
        { kind: "h3", text: "Elevator pitch — 'What is Mundus?' · 30 seg" },
        { kind: "quote", text: "Mundus is a B2B marketplace where you buy directly from verified meat producers — no traders, no middlemen. All offers are standardized, pricing is visible before you negotiate, and you can close in minutes instead of days. It's completely free for buyers." },
        { kind: "p", text: "PT: Marketplace B2B onde você compra direto de frigoríficos verificados — sem intermediário. Preço visível antes de negociar. Gratuito para compradores. Parar e deixar reagir." },
        { kind: "h3", text: "At a trade show · 45 seg" },
        { kind: "quote", text: "You probably receive offers from dozens of suppliers in completely different formats — spreadsheets, emails, WhatsApp messages. Mundus puts all of that in one place, standardized, with pricing visible upfront. Only verified producers, no trading companies in between. And you can post what you're looking for — suppliers come to you." },
        { kind: "p", text: "CTA: 'Want to see what's available right now?' — abre a plataforma e mostra oferta ativa." },
        { kind: "h3", text: "Dores — o que trava o Buyer hoje" },
        { kind: "table", head: ["Dor", "Detalhe"], rows: [
          ["Afogado em propostas desfragmentadas", "Recebe de dezenas de fornecedores cada um num formato diferente — é humanamente impossível comparar tudo. Acaba comprando de quem já conhece."],
          ["Não sabe se está pagando preço justo", "Mercado fechado por relacionamento — sem benchmark real. Negocia sem saber o que o mercado pratica de verdade."],
          ["Não sabe se o fornecedor é frigorífico de verdade", "Trading se passando por produtor. Passou a confiar só em quem já trabalhou antes."],
          ["Perde timing por lentidão", "Quer fechar, manda mensagem, o fornecedor demora — quando responde o preço mudou ou o produto foi vendido."],
          ["Operação toda por e-mail e WhatsApp", "Status de carga, documentação, pagamento — nenhum lugar centralizado. Retrabalho constante."],
        ]},
        { kind: "h3", text: "Benefícios — o que muda com a Mundus" },
        { kind: "table", head: ["Antes da Mundus", "Com a Mundus"], rows: [
          ["Recebe proposta de cada fornecedor num formato diferente", "Todas as ofertas padronizadas: produto, preço, incoterm, porto e specs técnicas."],
          ["Não sabe quem é trading e quem é frigorífico de verdade", "Só frigoríficos verificados. Vê o SIF, o número da fábrica e o histórico de negociações."],
          ["Espera dias por resposta — perde a janela de preço", "Negociação em minutos. O que hoje leva 3 dias acontece em 10 minutos."],
          ["Depende do próprio network para encontrar novo fornecedor", "Pode publicar o que quer comprar. Os frigoríficos vêm até ele."],
          ["Custo de acesso a qualquer plataforma ou trader", "Acesso gratuito. Custo zero. Nenhum risco para experimentar."],
        ]},
        { kind: "h3", text: "Objeções e como lidar" },
        { kind: "table", head: ["Objeção", "Como responder"], rows: [
          ["'Já tenho meus fornecedores de confiança.'", "Seus fornecedores continuam — a Mundus não tira ninguém. Mas quando um deles atrasar, tiver problema sanitário ou não tiver o volume que você precisa, você vai querer ter uma alternativa verificada pronta. E não custa nada estar cadastrado."],
          ["'Como sei que os frigoríficos são reais e não trading?'", "Na Mundus só frigorífico vende — trading não tem acesso como supplier. Você vê o número da fábrica, o SIF, a habilitação para exportação. É verificável antes de qualquer negociação."],
          ["'Não tenho tempo agora para mais uma plataforma.'", "O cadastro leva menos de 5 minutos. Você não precisa fazer nada depois — quando aparecer algo que te interessa, você recebe. E pode postar o que quer comprar em um clique."],
          ["'Prefiro e-mail / WhatsApp, é mais fácil.'", "Seu fluxo atual continua como está — a Mundus não pede que você mude nada. Você usa quando quiser comparar opções ou encontrar algo novo. E é de graça."],
          ["'Estou satisfeito com minha estrutura atual.'", "Perfeito — e não é pra trocar o que funciona. A Mundus é a alternativa que você ainda não tem: quando o fornecedor atrasar ou o preço sair fora, você já tem uma opção verificada pronta."],
        ]},
        { kind: "callout", text: "Lembrete: para o buyer não existe argumento contra entrar na Mundus — custo zero, acesso direto ao frigorífico, preço visível. O que fecha é mostrar oferta real na plataforma." },
      ],
    },
    {
      kicker: "08 — RESUMO",
      title: "Para não esquecer — argumentos que fecham",
      blocks: [
        { kind: "cards2", items: [
          { t: "S1 Dono do Frigorífico", d: "Fale de dinheiro e concorrência — não de tecnologia. Argumento mais forte: o que o concorrente está fazendo enquanto ele espera. Nunca explique funcionalidade." },
          { t: "S2 Gerente de Exportação", d: "Fale de resultado que aparece no nome dele. Argumento mais forte: controle, visibilidade e volume fechado. Se o dono não deu sinal verde, Fernando entra direto." },
          { t: "S3 Trader / Operador", d: "Comece pelo trabalho dele — não pela Mundus. Nunca chegue por cima (por ordem do dono). Se resistir em silêncio: Fernando entra direto, par a par." },
          { t: "B1 Decisor da Importadora", d: "Direto ao ponto — barreira é baixa. Mostre oferta real na plataforma. Custo zero + âncora WMS Foods são os dois argumentos que fecham." },
        ]},
      ],
    },
  ],
};

const EN: DocContent = {
  ...PT,
  tagline: "Conversation guide — internal reference",
  hero: "How to talk about Mundus Trade — by persona. Elevator pitch, pains, benefits, questions and objections.",
  badge: "INTERNAL DOCUMENT | MUNDUS OPERATORS | 2026",
  print: "Print / Save PDF",
  footer_lines: [
    "Mundus Trade LLC · Ocoee, Florida, USA",
    "Operational guide · Version 2.0",
    "Update whenever a persona, argument or approach changes",
  ],
  signature: "MUNDUS TRADE | CONVERSATION GUIDE | 2026",
};

const ES: DocContent = {
  ...PT,
  tagline: "Guía de conversaciones — referencia interna",
  hero: "Cómo hablar de Mundus Trade — por persona. Elevator pitch, dolores, beneficios, preguntas y objeciones.",
  badge: "DOCUMENTO INTERNO | OPERADORES MUNDUS | 2026",
  print: "Imprimir / Guardar PDF",
  footer_lines: [
    "Mundus Trade LLC · Ocoee, Florida, USA",
    "Guía operacional · Versión 2.0",
    "Actualizar siempre que cambie una persona, argumento o enfoque",
  ],
  signature: "MUNDUS TRADE | GUÍA DE CONVERSACIONES | 2026",
};

const ZH: DocContent = {
  ...PT,
  tagline: "对话指南 — 内部参考",
  hero: "如何按角色谈论 Mundus Trade — 电梯演讲、痛点、收益、提问和异议处理。",
  badge: "内部文档 | MUNDUS 运营团队 | 2026",
  print: "打印 / 保存 PDF",
  footer_lines: [
    "Mundus Trade LLC · 美国佛罗里达州 Ocoee",
    "运营指南 · 版本 2.0",
    "每当角色、论点或方法发生变化时请更新",
  ],
  signature: "MUNDUS TRADE | 对话指南 | 2026",
};

const CONTENT: Record<Lang, DocContent> = { pt: PT, en: EN, es: ES, zh: ZH };

export function PersonasGuideDocument() {
  return <AdminDocView content={CONTENT} />;
}
