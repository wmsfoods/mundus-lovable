import { useState } from "react";
import { Printer } from "lucide-react";
import "@/styles/mundus-docs.css";

type Lang = "pt" | "en" | "es" | "zh";

const LANGS: Array<{ k: Lang; flag: string; label: string }> = [
  { k: "en", flag: "🇺🇸", label: "English" },
  { k: "pt", flag: "🇧🇷", label: "Português" },
  { k: "es", flag: "🇪🇸", label: "Español" },
  { k: "zh", flag: "🇨🇳", label: "中文" },
];

type Doc = {
  tagline: string;
  hero: string;
  badge: string;
  // 01
  s01_kicker: string;
  s01_title: string;
  s01_lede: string;
  s01_cards: Array<{ t: string; d: string }>;
  // 02
  s02_kicker: string;
  s02_title: string;
  s02_sub: string;
  s02_story: string;
  s02_features: Array<{ icon: string; t: string; d: string }>;
  // 03
  s03_kicker: string;
  s03_title: string;
  s03_blocks: Array<{ t: string; d: string }>;
  s03_footer: string;
  // 04
  s04_kicker: string;
  s04_title: string;
  s04_lede: string;
  s04_table_head: [string, string, string];
  s04_rows: Array<[string, string, string]>;
  // 05
  s05_kicker: string;
  s05_title: string;
  s05_lede: string;
  s05_steps: Array<{ t: string; d: string }>;
  // 06
  s06_kicker: string;
  s06_title: string;
  s06_zeros: Array<{ big: string; t: string; d: string }>;
  s06_footer: string;
  // 07
  s07_kicker: string;
  s07_title: string;
  s07_lede: string;
  s07_logos: string;
  s07_note: string;
  // 08
  s08_kicker: string;
  s08_title: string;
  s08_lede: string;
  s08_steps: Array<{ t: string; d: string }>;
  s08_demo_t: string;
  s08_demo_d: string;
  channels: string;
  print: string;
};

const CONTENT: Record<Lang, Doc> = {
  pt: {
    tagline: "Venda sua carne para o mundo. Direto. Sem intermediários.",
    hero: "Marketplace B2B de proteínas animais — conectando frigoríficos verificados a importadores globais.",
    badge: "DOCUMENTO PARA SUPPLIERS | 2026",
    s01_kicker: "01 — O PONTO DE PARTIDA",
    s01_title: "Como o mercado de exportação de carne opera hoje",
    s01_lede: "Quem exporta carne reconhece esse quadro. Quem está pensando em exportar, vai reconhecer em breve.",
    s01_cards: [
      { t: "Você negocia sem saber o preço real", d: "Sua referência de preço vem do trader — que tem interesse direto em pagar menos. Cada negócio fechado pode ter dinheiro deixado na mesa. Você nunca saberá quanto." },
      { t: "Para chegar em novos mercados, você precisa de intermediário", d: "Filipinas, Indonésia, Oriente Médio, África — demanda real, compradores reais. Mas o acesso passa por quem cobra spread em cada operação sem agregar valor proporcional." },
      { t: "Sua operação não tem histórico. Tem e-mail.", d: "O que foi negociado, por quem, a qual preço, com qual comprador — está fragmentado em caixas de entrada e conversas de WhatsApp. Quando algo dá errado, não há como auditar." },
      { t: "Quando uma cota fecha, você não tem para onde correr", d: "Sem visibilidade antecipada de demanda em mercados alternativos, cada fechamento de cota vira crise. Volume parado, receita perdida, prazo perdido." },
      { t: "Retrabalho constante em cada operação", d: "Cada proposta, cada follow-up, cada atualização de status — tudo manual, tudo de novo, sem registro centralizado. Tempo gasto que não gera inteligência para a próxima negociação." },
    ],
    s02_kicker: "02 — A SOLUÇÃO",
    s02_title: "A Mundus Trade",
    s02_sub: "Marketplace B2B onde frigoríficos verificados publicam ofertas e recebem bids de importadores globais — diretamente, sem trader no meio, com histórico completo de cada negociação.",
    s02_story: "A Mundus não foi criada por uma equipe de tecnologia que identificou uma oportunidade de mercado. Foi criada por Fernando Nascimento — 30 anos de operação em exportação internacional de proteínas animais. De dentro das negociações, das cotas, dos traders, dos spreads que nunca aparecem no contrato. A plataforma resolve o que ele viu de perto durante três décadas: frigoríficos que exportam bem mas não têm controle. Traders que capturam margem sem entregar inteligência. Mercados acessíveis que ficam invisíveis por falta de canal direto.",
    s02_features: [
      { icon: "🌍", t: "Compradores verificados", d: "Importadores ativos em mais de 10 países. Todos verificados antes de operar." },
      { icon: "💰", t: "Você só paga se fechar", d: "Zero de mensalidade. Zero de taxa. 0,30% apenas sobre negócios concluídos." },
      { icon: "🔒", t: "Verificação completa", d: "Compradores e fornecedores passam por verificação documental antes de operar." },
    ],
    s03_kicker: "03 — CREDIBILIDADE",
    s03_title: "Respaldo institucional",
    s03_blocks: [
      { t: "Câmara Árabe Brasileira de Comércio (CABC)", d: "Membro oficial da CABC — uma das principais instituições de promoção comercial entre o Brasil e os países do Oriente Médio e Norte da África. Quando você negocia pela Mundus, opera com respaldo institucional nos mercados que mais importam para exportação de proteínas animais." },
      { t: "Rede de associações internacionais", d: "Relacionamento ativo com associações setoriais e câmaras de comércio internacionais — garantindo que sua empresa tenha acesso a mercados com credibilidade verificável. 30 anos de network no setor. Ativado agora em favor de quem está dentro da plataforma." },
    ],
    s03_footer: "",
    s04_kicker: "04 — BENEFÍCIOS POR CARGO",
    s04_title: "O que muda para cada pessoa no seu time",
    s04_lede: "A plataforma resolve problemas diferentes para cada cargo — ao mesmo tempo.",
    s04_table_head: ["Diretor / Dono", "Gerente de Exportação", "Trader Interno"],
    s04_rows: [
      ["Sabe o preço real que o mercado está pagando — não o preço que o trader quis mostrar.", "Publica uma oferta completa em menos de 15 minutos.", "Acessa mercados que antes só existiam via intermediário."],
      ["Expande para novos mercados sem depender de intermediário.", "Recebe bids de compradores verificados globalmente — sem precisar prospectar.", "Negocia com dado e histórico — não com memória e achismo."],
      ["Sabe o que o time está negociando, com quem e a qual preço — em tempo real.", "Histórico centralizado de cada negociação: produto, preço, incoterm, porto, comprador, data.", "Fecha mais volume com menos esforço operacional."],
      ["Quando a cota da China fecha, já tem alternativa mapeada. Não corre.", "Visibilidade antecipada de demanda para planejar antes de precisar.", "A Mundus potencializa o trabalho do trader. Não o substitui."],
    ],
    s05_kicker: "05 — OPERAÇÃO",
    s05_title: "Como funciona na prática",
    s05_lede: "Em menos de 30 minutos você já está operando. O processo inteiro acontece dentro da plataforma.",
    s05_steps: [
      { t: "Cadastro e verificação — feito uma vez", d: "Processo 100% online. Dados da empresa, documentação, habilitações de exportação. Verificado pela equipe Mundus antes de ativar. Feito uma vez." },
      { t: "Publique sua oferta", d: "Produto, preço mínimo, incoterm, porto de origem, specs técnicas. Menos de 15 minutos. Visível para importadores verificados em mais de 10 países imediatamente." },
      { t: "Receba bids", d: "Compradores verificados encontram sua oferta e fazem propostas diretamente — sem intermediário, sem filtro, sem spread invisível." },
      { t: "Negocie e feche", d: "Proposta, contraproposta e fechamento dentro da plataforma. Tudo registrado: produto, preço, comprador, data. Histórico permanente acessível para toda a equipe autorizada." },
    ],
    s06_kicker: "06 — CUSTO",
    s06_title: "Modelo de negócio: você só paga quando fechar",
    s06_zeros: [
      { big: "$0", t: "Mensalidade", d: "Sem assinatura. Sem plano mensal. Acesso completo à plataforma sem custo recorrente." },
      { big: "$0", t: "Taxa de entrada", d: "Sem taxa de cadastro. Você verifica sua empresa e começa a operar no mesmo dia." },
      { big: "0,30%", t: "Só se fechar negócio", d: "A Mundus cobra 0,30% sobre o valor do negócio fechado. Se não fechar, não cobra nada." },
    ],
    s06_footer: "A Mundus só ganha quando você ganha. Sem negócio fechado, custo zero.",
    s07_kicker: "07 — PROVA SOCIAL",
    s07_title: "Quem já está dentro",
    s07_lede: "Frigoríficos com SIF verificado e importadores ativos em mais de 10 países já operam na plataforma.",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "Todos os participantes passam por verificação documental antes de operar. Você negocia com quem tem capacidade real de comprar. Os compradores negociam com frigoríficos habilitados para exportar.",
    s08_kicker: "08 — PRÓXIMO PASSO",
    s08_title: "Como começar",
    s08_lede: "O cadastro leva menos de 5 minutos. Sua primeira oferta pode estar no ar hoje.",
    s08_steps: [
      { t: "Acesse app.mundustrade.com", d: "Clique em 'Cadastrar como Supplier', preencha os dados da sua empresa e envie a documentação. Processo 100% online." },
      { t: "Publique sua primeira oferta", d: "Produto, preço mínimo, incoterm e porto de origem. Em menos de 10 minutos sua oferta já está visível para compradores verificados no mundo todo." },
      { t: "Receba propostas e feche", d: "Compradores enviam bids diretamente para você. Você negocia, contrapõe e fecha." },
    ],
    s08_demo_t: "Tem dúvidas antes de começar?",
    s08_demo_d: "Nossa equipe está disponível para uma demonstração gratuita da plataforma.",
    channels: "Canais de contato",
    print: "Imprimir / Salvar PDF",
  },
  en: {
    tagline: "Sell your meat to the world. Direct. No middlemen.",
    hero: "B2B marketplace for animal protein — connecting verified slaughterhouses to global importers.",
    badge: "SUPPLIER DOCUMENT | 2026",
    s01_kicker: "01 — THE STARTING POINT",
    s01_title: "How the meat export market operates today",
    s01_lede: "Anyone exporting meat recognizes this picture. Anyone considering it, will recognize it soon.",
    s01_cards: [
      { t: "You negotiate without knowing the real price", d: "Your price reference comes from the trader — who has a direct interest in paying you less. Every closed deal may leave money on the table. You will never know how much." },
      { t: "To reach new markets, you need an intermediary", d: "Philippines, Indonesia, Middle East, Africa — real demand, real buyers. But access goes through someone charging a spread on each operation without adding proportional value." },
      { t: "Your operation has no history. It has email.", d: "What was negotiated, by whom, at what price, with which buyer — fragmented across inboxes and WhatsApp threads. When something goes wrong, there's no way to audit." },
      { t: "When a quota closes, you have nowhere to run", d: "Without early demand visibility in alternative markets, every quota closure becomes a crisis. Stalled volume, lost revenue, missed deadlines." },
      { t: "Constant rework on every operation", d: "Every proposal, every follow-up, every status update — all manual, all again, with no centralized record. Time spent that produces no intelligence for the next negotiation." },
    ],
    s02_kicker: "02 — THE SOLUTION",
    s02_title: "Mundus Trade",
    s02_sub: "B2B marketplace where verified slaughterhouses publish offers and receive bids from global importers — directly, no trader in between, with full history of every negotiation.",
    s02_story: "Mundus wasn't built by a tech team that spotted a market opportunity. It was built by Fernando Nascimento — 30 years operating in international animal protein exports. From inside the negotiations, the quotas, the traders, the spreads that never appear in the contract. The platform solves what he saw up close for three decades: slaughterhouses that export well but have no control. Traders capturing margin without delivering intelligence. Reachable markets that stay invisible for lack of a direct channel.",
    s02_features: [
      { icon: "🌍", t: "Verified buyers", d: "Active importers in more than 10 countries. All verified before operating." },
      { icon: "💰", t: "You only pay if you close", d: "Zero subscription. Zero fee. Only 0.30% on closed deals." },
      { icon: "🔒", t: "Full verification", d: "Buyers and suppliers go through document verification before operating." },
    ],
    s03_kicker: "03 — CREDIBILITY",
    s03_title: "Institutional backing",
    s03_blocks: [
      { t: "Arab Brazilian Chamber of Commerce (CABC)", d: "Official CABC member — one of the leading trade-promotion institutions between Brazil and the Middle East and North Africa. When you negotiate through Mundus, you operate with institutional backing in the markets that matter most for animal protein exports." },
      { t: "International association network", d: "Active relationships with industry associations and international chambers of commerce — ensuring your company has access to markets with verifiable credibility. 30 years of network in the sector. Activated now in favor of those inside the platform." },
    ],
    s03_footer: "",
    s04_kicker: "04 — BENEFITS BY ROLE",
    s04_title: "What changes for each person on your team",
    s04_lede: "The platform solves different problems for each role — all at once.",
    s04_table_head: ["Director / Owner", "Export Manager", "Internal Trader"],
    s04_rows: [
      ["Knows the real price the market is paying — not the price the trader chose to show.", "Publishes a complete offer in less than 15 minutes.", "Accesses markets that previously existed only through an intermediary."],
      ["Expands into new markets without depending on an intermediary.", "Receives bids from globally verified buyers — no prospecting needed.", "Negotiates with data and history — not memory and guesswork."],
      ["Knows what the team is negotiating, with whom and at what price — in real time.", "Centralized history of every negotiation: product, price, incoterm, port, buyer, date.", "Closes more volume with less operational effort."],
      ["When China's quota closes, an alternative is already mapped. No scrambling.", "Early demand visibility to plan before you need to.", "Mundus amplifies the trader's work. It does not replace it."],
    ],
    s05_kicker: "05 — HOW IT WORKS",
    s05_title: "How it works in practice",
    s05_lede: "In under 30 minutes you're already operating. The entire process happens inside the platform.",
    s05_steps: [
      { t: "Sign-up and verification — done once", d: "100% online process. Company data, documentation, export approvals. Verified by the Mundus team before activation. Done once." },
      { t: "Publish your offer", d: "Product, minimum price, incoterm, origin port, technical specs. Under 15 minutes. Visible to verified importers in more than 10 countries immediately." },
      { t: "Receive bids", d: "Verified buyers find your offer and submit proposals directly — no intermediary, no filter, no invisible spread." },
      { t: "Negotiate and close", d: "Proposal, counter and closing inside the platform. Everything logged: product, price, buyer, date. Permanent history accessible to your entire authorized team." },
    ],
    s06_kicker: "06 — COST",
    s06_title: "Business model: you only pay when you close",
    s06_zeros: [
      { big: "$0", t: "Subscription", d: "No subscription. No monthly plan. Full platform access with no recurring cost." },
      { big: "$0", t: "Entry fee", d: "No sign-up fee. You verify your company and start operating the same day." },
      { big: "0.30%", t: "Only if you close", d: "Mundus charges 0.30% on the value of the closed deal. If it doesn't close, you pay nothing." },
    ],
    s06_footer: "Mundus only wins when you win. No deal closed, zero cost.",
    s07_kicker: "07 — SOCIAL PROOF",
    s07_title: "Who's already inside",
    s07_lede: "Slaughterhouses with verified SIF and active importers in more than 10 countries already operate on the platform.",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "Every participant goes through document verification before operating. You negotiate with someone who has real buying capacity. Buyers negotiate with slaughterhouses approved to export.",
    s08_kicker: "08 — NEXT STEP",
    s08_title: "How to start",
    s08_lede: "Sign-up takes less than 5 minutes. Your first offer can go live today.",
    s08_steps: [
      { t: "Go to app.mundustrade.com", d: "Click 'Sign up as Supplier', fill in your company data and upload documents. 100% online." },
      { t: "Publish your first offer", d: "Product, minimum price, incoterm and origin port. In under 10 minutes your offer is visible to verified buyers worldwide." },
      { t: "Receive proposals and close", d: "Buyers send bids directly to you. You negotiate, counter and close." },
    ],
    s08_demo_t: "Questions before you start?",
    s08_demo_d: "Our team is available for a free live demo of the platform.",
    channels: "Contact channels",
    print: "Print / Save PDF",
  },
  es: {
    tagline: "Venda su carne al mundo. Directo. Sin intermediarios.",
    hero: "Marketplace B2B de proteínas animales — conectando frigoríficos verificados con importadores globales.",
    badge: "DOCUMENTO PARA SUPPLIERS | 2026",
    s01_kicker: "01 — EL PUNTO DE PARTIDA",
    s01_title: "Cómo opera hoy el mercado de exportación de carne",
    s01_lede: "Quien exporta carne reconoce este cuadro. Quien está pensando en exportar, lo reconocerá pronto.",
    s01_cards: [
      { t: "Negocia sin saber el precio real", d: "Su referencia de precio viene del trader — que tiene interés directo en pagarle menos. Cada negocio cerrado puede dejar dinero sobre la mesa. Nunca sabrá cuánto." },
      { t: "Para llegar a nuevos mercados, necesita intermediario", d: "Filipinas, Indonesia, Medio Oriente, África — demanda real, compradores reales. Pero el acceso pasa por quien cobra spread en cada operación sin agregar valor proporcional." },
      { t: "Su operación no tiene historial. Tiene e-mail.", d: "Lo que se negoció, por quién, a qué precio, con qué comprador — está fragmentado en bandejas de entrada y conversaciones de WhatsApp. Cuando algo sale mal, no hay cómo auditar." },
      { t: "Cuando una cuota cierra, no tiene a dónde correr", d: "Sin visibilidad anticipada de demanda en mercados alternativos, cada cierre de cuota se vuelve crisis. Volumen detenido, ingresos perdidos, plazos perdidos." },
      { t: "Retrabajo constante en cada operación", d: "Cada propuesta, cada follow-up, cada actualización de estado — todo manual, todo de nuevo, sin registro centralizado. Tiempo gastado que no genera inteligencia para la próxima negociación." },
    ],
    s02_kicker: "02 — LA SOLUCIÓN",
    s02_title: "Mundus Trade",
    s02_sub: "Marketplace B2B donde frigoríficos verificados publican ofertas y reciben bids de importadores globales — directamente, sin trader en el medio, con historial completo de cada negociación.",
    s02_story: "Mundus no fue creada por un equipo de tecnología que detectó una oportunidad de mercado. Fue creada por Fernando Nascimento — 30 años operando en exportación internacional de proteínas animales. Desde dentro de las negociaciones, las cuotas, los traders, los spreads que nunca aparecen en el contrato. La plataforma resuelve lo que vio de cerca durante tres décadas: frigoríficos que exportan bien pero no tienen control. Traders que capturan margen sin entregar inteligencia. Mercados accesibles que quedan invisibles por falta de canal directo.",
    s02_features: [
      { icon: "🌍", t: "Compradores verificados", d: "Importadores activos en más de 10 países. Todos verificados antes de operar." },
      { icon: "💰", t: "Solo paga si cierra", d: "Cero mensualidad. Cero tarifa. Solo 0,30% sobre negocios concluidos." },
      { icon: "🔒", t: "Verificación completa", d: "Compradores y proveedores pasan por verificación documental antes de operar." },
    ],
    s03_kicker: "03 — CREDIBILIDAD",
    s03_title: "Respaldo institucional",
    s03_blocks: [
      { t: "Cámara Árabe Brasileña de Comercio (CABC)", d: "Miembro oficial de la CABC — una de las principales instituciones de promoción comercial entre Brasil y los países de Medio Oriente y Norte de África. Cuando negocia por Mundus, opera con respaldo institucional en los mercados que más importan para la exportación de proteínas animales." },
      { t: "Red de asociaciones internacionales", d: "Relación activa con asociaciones sectoriales y cámaras de comercio internacionales — garantizando que su empresa tenga acceso a mercados con credibilidad verificable. 30 años de network en el sector. Activado ahora en favor de quienes están dentro de la plataforma." },
    ],
    s03_footer: "",
    s04_kicker: "04 — BENEFICIOS POR CARGO",
    s04_title: "Qué cambia para cada persona de su equipo",
    s04_lede: "La plataforma resuelve problemas distintos para cada cargo — al mismo tiempo.",
    s04_table_head: ["Director / Dueño", "Gerente de Exportación", "Trader Interno"],
    s04_rows: [
      ["Sabe el precio real que el mercado está pagando — no el que el trader quiso mostrar.", "Publica una oferta completa en menos de 15 minutos.", "Accede a mercados que antes solo existían vía intermediario."],
      ["Expande hacia nuevos mercados sin depender de intermediario.", "Recibe bids de compradores verificados globalmente — sin prospectar.", "Negocia con dato e historial — no con memoria y suposición."],
      ["Sabe qué está negociando el equipo, con quién y a qué precio — en tiempo real.", "Historial centralizado de cada negociación: producto, precio, incoterm, puerto, comprador, fecha.", "Cierra más volumen con menos esfuerzo operacional."],
      ["Cuando la cuota de China cierra, ya tiene alternativa mapeada. No corre.", "Visibilidad anticipada de demanda para planear antes de necesitar.", "Mundus potencia el trabajo del trader. No lo sustituye."],
    ],
    s05_kicker: "05 — OPERACIÓN",
    s05_title: "Cómo funciona en la práctica",
    s05_lede: "En menos de 30 minutos ya está operando. Todo el proceso ocurre dentro de la plataforma.",
    s05_steps: [
      { t: "Registro y verificación — hecho una vez", d: "Proceso 100% online. Datos de la empresa, documentación, habilitaciones de exportación. Verificado por el equipo Mundus antes de activar. Hecho una vez." },
      { t: "Publique su oferta", d: "Producto, precio mínimo, incoterm, puerto de origen, specs técnicas. Menos de 15 minutos. Visible para importadores verificados en más de 10 países inmediatamente." },
      { t: "Reciba bids", d: "Compradores verificados encuentran su oferta y hacen propuestas directamente — sin intermediario, sin filtro, sin spread invisible." },
      { t: "Negocie y cierre", d: "Propuesta, contrapropuesta y cierre dentro de la plataforma. Todo registrado: producto, precio, comprador, fecha. Historial permanente accesible para todo el equipo autorizado." },
    ],
    s06_kicker: "06 — COSTO",
    s06_title: "Modelo de negocio: solo paga cuando cierra",
    s06_zeros: [
      { big: "$0", t: "Mensualidad", d: "Sin suscripción. Sin plan mensual. Acceso completo a la plataforma sin costo recurrente." },
      { big: "$0", t: "Tarifa de entrada", d: "Sin tarifa de registro. Verifica su empresa y empieza a operar el mismo día." },
      { big: "0,30%", t: "Solo si cierra negocio", d: "Mundus cobra 0,30% sobre el valor del negocio cerrado. Si no cierra, no cobra nada." },
    ],
    s06_footer: "Mundus solo gana cuando usted gana. Sin negocio cerrado, costo cero.",
    s07_kicker: "07 — PRUEBA SOCIAL",
    s07_title: "Quién ya está dentro",
    s07_lede: "Frigoríficos con SIF verificado e importadores activos en más de 10 países ya operan en la plataforma.",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "Todos los participantes pasan por verificación documental antes de operar. Usted negocia con quien tiene capacidad real de comprar. Los compradores negocian con frigoríficos habilitados para exportar.",
    s08_kicker: "08 — PRÓXIMO PASO",
    s08_title: "Cómo empezar",
    s08_lede: "El registro toma menos de 5 minutos. Su primera oferta puede estar al aire hoy.",
    s08_steps: [
      { t: "Entre a app.mundustrade.com", d: "Haga clic en 'Registrarse como Supplier', complete los datos de su empresa y envíe la documentación. Proceso 100% online." },
      { t: "Publique su primera oferta", d: "Producto, precio mínimo, incoterm y puerto de origen. En menos de 10 minutos su oferta ya está visible para compradores verificados en todo el mundo." },
      { t: "Reciba propuestas y cierre", d: "Los compradores envían bids directamente a usted. Negocia, contraproponga y cierra." },
    ],
    s08_demo_t: "¿Tiene dudas antes de empezar?",
    s08_demo_d: "Nuestro equipo está disponible para una demostración gratuita de la plataforma.",
    channels: "Canales de contacto",
    print: "Imprimir / Guardar PDF",
  },
  zh: {
    tagline: "把您的肉卖向世界。直接。无中间商。",
    hero: "动物蛋白B2B交易市场——将经认证的屠宰场直接连接到全球进口商。",
    badge: "供应商文档 | 2026",
    s01_kicker: "01 — 起点",
    s01_title: "今天的肉类出口市场如何运作",
    s01_lede: "出口肉类的人会认出这幅画面。正在考虑出口的人，很快也会认出。",
    s01_cards: [
      { t: "您在不知道真实价格的情况下进行谈判", d: "您的价格参考来自贸易商——他们有直接的少付动机。每笔成交都可能留下资金。您永远不知道留下了多少。" },
      { t: "要进入新市场，您需要中间商", d: "菲律宾、印度尼西亚、中东、非洲——真实需求，真实买家。但通道掌握在每次操作收取价差却不增加相应价值的人手中。" },
      { t: "您的运营没有历史。只有邮件。", d: "什么被谈判、由谁、以什么价格、与哪个买家——分散在收件箱和WhatsApp对话中。出问题时无法审计。" },
      { t: "配额关闭时，您无处可逃", d: "没有替代市场的提前需求可视性，每次配额关闭都成为危机。停滞的量、损失的收入、错过的期限。" },
      { t: "每次操作都在重复劳动", d: "每个报价、每次跟进、每次状态更新——全部手动、全部从头来过，无集中记录。耗费的时间未能为下一次谈判产生智能。" },
    ],
    s02_kicker: "02 — 解决方案",
    s02_title: "Mundus Trade",
    s02_sub: "经认证的屠宰场在B2B交易市场发布报价并接收来自全球进口商的出价——直接进行，无中间贸易商，每次谈判都有完整历史。",
    s02_story: "Mundus 不是由发现市场机会的技术团队创建的。它是由 Fernando Nascimento 创建的——拥有30年国际动物蛋白出口经验。来自谈判内部、配额、贸易商以及合同中从未出现的价差。该平台解决了他三十年来近距离看到的问题：出口表现良好但缺乏控制的屠宰场；获取利润却不提供智能的贸易商；因缺乏直接渠道而仍然不可见的可触及市场。",
    s02_features: [
      { icon: "🌍", t: "经认证的买家", d: "10多个国家的活跃进口商。所有买家在运营前均经过认证。" },
      { icon: "💰", t: "只有成交才付费", d: "零月费。零费用。仅对已完成交易收取 0.30%。" },
      { icon: "🔒", t: "完整认证", d: "买家和供应商在运营前均通过单证认证。" },
    ],
    s03_kicker: "03 — 可信度",
    s03_title: "机构背书",
    s03_blocks: [
      { t: "巴西-阿拉伯商会 (CABC)", d: "CABC 正式会员——促进巴西与中东、北非地区商业往来的主要机构之一。当您通过 Mundus 谈判时，您在动物蛋白出口最重要的市场上拥有机构背书。" },
      { t: "国际协会网络", d: "与行业协会和国际商会保持活跃关系——确保您的公司能进入具有可验证可信度的市场。30年的行业网络，如今为平台内的成员激活。" },
    ],
    s03_footer: "",
    s04_kicker: "04 — 按岗位的优势",
    s04_title: "对您团队中每位成员意味着什么",
    s04_lede: "该平台同时为不同岗位解决不同的问题。",
    s04_table_head: ["董事 / 业主", "出口经理", "内部交易员"],
    s04_rows: [
      ["知道市场真正支付的价格——而不是贸易商想展示的价格。", "在15分钟内发布完整的报价。", "进入以前仅通过中间商存在的市场。"],
      ["无需依赖中间商即可扩展到新市场。", "接收来自全球经认证买家的出价——无需勘探。", "用数据和历史进行谈判——而非记忆和猜测。"],
      ["实时了解团队正在谈判什么、与谁、以何种价格。", "每次谈判的集中历史：产品、价格、贸易术语、港口、买家、日期。", "以更少的运营努力完成更多的成交量。"],
      ["当中国配额关闭时，已有替代方案。无需匆忙。", "提前的需求可视性，提前规划。", "Mundus 增强交易员的工作。不会取而代之。"],
    ],
    s05_kicker: "05 — 运营",
    s05_title: "实际如何运作",
    s05_lede: "在不到30分钟内您即可开始运营。整个流程都在平台内进行。",
    s05_steps: [
      { t: "注册与认证——一次完成", d: "100% 在线流程。公司资料、单证、出口资质。在激活前由 Mundus 团队认证。一次完成。" },
      { t: "发布您的报价", d: "产品、最低价格、贸易术语、原产港口、技术规格。不到15分钟。立即对10多个国家的经认证进口商可见。" },
      { t: "接收出价", d: "经认证的买家找到您的报价并直接提出方案——无中间商、无过滤、无隐形价差。" },
      { t: "谈判并成交", d: "在平台内进行报价、还价和成交。全部记录：产品、价格、买家、日期。永久历史可供您整个授权团队访问。" },
    ],
    s06_kicker: "06 — 成本",
    s06_title: "商业模式：成交才付费",
    s06_zeros: [
      { big: "$0", t: "月费", d: "无订阅。无月度计划。完整访问平台，无任何经常性费用。" },
      { big: "$0", t: "入门费", d: "无注册费。您验证公司并当天开始运营。" },
      { big: "0.30%", t: "成交才付", d: "Mundus 对已完成交易的金额收取 0.30%。如果未成交，不收取任何费用。" },
    ],
    s06_footer: "Mundus 只有在您赢时才会赢。没有成交，零成本。",
    s07_kicker: "07 — 社会认证",
    s07_title: "已经加入的成员",
    s07_lede: "拥有经认证 SIF 的屠宰场和10多个国家的活跃进口商已经在平台上运营。",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "所有参与者在运营前均通过单证认证。您与有真实采购能力的人谈判。买家与获得出口资质的屠宰场谈判。",
    s08_kicker: "08 — 下一步",
    s08_title: "如何开始",
    s08_lede: "注册不到5分钟。您的第一个报价今天即可上线。",
    s08_steps: [
      { t: "访问 app.mundustrade.com", d: "点击「以供应商身份注册」，填写公司资料并上传单证。100% 在线流程。" },
      { t: "发布您的第一个报价", d: "产品、最低价格、贸易术语和原产港口。不到10分钟，您的报价即对全球经认证买家可见。" },
      { t: "接收方案并成交", d: "买家直接向您发送出价。您谈判、还价并成交。" },
    ],
    s08_demo_t: "开始前有疑问？",
    s08_demo_d: "我们的团队随时可以为您免费现场演示平台。",
    channels: "联系方式",
    print: "打印 / 保存 PDF",
  },
};

export function SupplierGuideDocument() {
  const [lang, setLang] = useState<Lang>("pt");
  const c = CONTENT[lang];

  return (
    <div className="mw-docs-wrap">
      {/* Toolbar */}
      <div className="mw-docs-toolbar no-print">
        <div className="mw-docs-langs">
          {LANGS.map((l) => (
            <button
              key={l.k}
              type="button"
              onClick={() => setLang(l.k)}
              className={`mw-docs-lang ${lang === l.k ? "active" : ""}`}
            >
              <span style={{ fontSize: 14 }}>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
        <button type="button" className="mw-docs-print" onClick={() => window.print()}>
          <Printer size={14} /> {c.print}
        </button>
      </div>

      {/* Document */}
      <article className="mw-doc" lang={lang}>
        {/* Cover */}
        <header className="mw-doc-cover">
          <div className="mw-doc-tagline">{c.tagline}</div>
          <h1 className="mw-doc-hero">{c.hero}</h1>
          <div className="mw-doc-badge">{c.badge}</div>
        </header>

        {/* 01 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s01_kicker}</div>
          <h2 className="mw-doc-h2">{c.s01_title}</h2>
          <p className="mw-doc-lede">{c.s01_lede}</p>
          <div className="mw-doc-grid-2">
            {c.s01_cards.slice(0, 4).map((card, i) => (
              <div key={i} className="mw-doc-card">
                <div className="mw-doc-card-t">{card.t}</div>
                <div className="mw-doc-card-d">{card.d}</div>
              </div>
            ))}
          </div>
          {c.s01_cards[4] && (
            <div className="mw-doc-card mw-doc-card-wide">
              <div className="mw-doc-card-t">{c.s01_cards[4].t}</div>
              <div className="mw-doc-card-d">{c.s01_cards[4].d}</div>
            </div>
          )}
        </section>

        {/* 02 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s02_kicker}</div>
          <h2 className="mw-doc-h2">{c.s02_title}</h2>
          <p className="mw-doc-sub">{c.s02_sub}</p>
          <p className="mw-doc-body">{c.s02_story}</p>
          <div className="mw-doc-grid-3">
            {c.s02_features.map((f, i) => (
              <div key={i} className="mw-doc-feature">
                <div className="mw-doc-feature-icon">{f.icon}</div>
                <div className="mw-doc-feature-t">{f.t}</div>
                <div className="mw-doc-feature-d">{f.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s03_kicker}</div>
          <h2 className="mw-doc-h2">{c.s03_title}</h2>
          <div className="mw-doc-grid-2">
            {c.s03_blocks.map((b, i) => (
              <div key={i} className="mw-doc-card">
                <div className="mw-doc-card-t">{b.t}</div>
                <div className="mw-doc-card-d">{b.d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 04 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s04_kicker}</div>
          <h2 className="mw-doc-h2">{c.s04_title}</h2>
          <p className="mw-doc-lede">{c.s04_lede}</p>
          <table className="mw-doc-table">
            <thead>
              <tr>
                <th>{c.s04_table_head[0]}</th>
                <th>{c.s04_table_head[1]}</th>
                <th>{c.s04_table_head[2]}</th>
              </tr>
            </thead>
            <tbody>
              {c.s04_rows.map((row, i) => (
                <tr key={i}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 05 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s05_kicker}</div>
          <h2 className="mw-doc-h2">{c.s05_title}</h2>
          <p className="mw-doc-lede">{c.s05_lede}</p>
          <ol className="mw-doc-steps">
            {c.s05_steps.map((s, i) => (
              <li key={i}>
                <span className="mw-doc-step-n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="mw-doc-step-t">{s.t}</div>
                  <div className="mw-doc-step-d">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 06 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s06_kicker}</div>
          <h2 className="mw-doc-h2">{c.s06_title}</h2>
          <div className="mw-doc-grid-3">
            {c.s06_zeros.map((z, i) => (
              <div key={i} className="mw-doc-zero">
                <div className="mw-doc-zero-big">{z.big}</div>
                <div className="mw-doc-zero-t">{z.t}</div>
                <div className="mw-doc-zero-d">{z.d}</div>
              </div>
            ))}
          </div>
          <p className="mw-doc-callout">{c.s06_footer}</p>
        </section>

        {/* 07 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s07_kicker}</div>
          <h2 className="mw-doc-h2">{c.s07_title}</h2>
          <p className="mw-doc-body">{c.s07_lede}</p>
          <div className="mw-doc-logos">{c.s07_logos}</div>
          <p className="mw-doc-body">{c.s07_note}</p>
        </section>

        {/* 08 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s08_kicker}</div>
          <h2 className="mw-doc-h2">{c.s08_title}</h2>
          <p className="mw-doc-lede">{c.s08_lede}</p>
          <ol className="mw-doc-steps">
            {c.s08_steps.map((s, i) => (
              <li key={i}>
                <span className="mw-doc-step-n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="mw-doc-step-t">{s.t}</div>
                  <div className="mw-doc-step-d">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mw-doc-demo">
            <div className="mw-doc-demo-t">{c.s08_demo_t}</div>
            <div className="mw-doc-demo-d">{c.s08_demo_d}</div>
          </div>
        </section>

        {/* Channels */}
        <footer className="mw-doc-footer">
          <div className="mw-doc-kicker">{c.channels}</div>
          <div className="mw-doc-channels">
            <div>📲 WhatsApp: +1 786 443 1584</div>
            <div>💼 linkedin.com/company/mundus-trade</div>
            <div>🌐 mundustrade.com</div>
            <div>📸 @mundustrade</div>
            <div>📧 app.mundustrade.com</div>
          </div>
          <div className="mw-doc-signature">MUNDUS TRADE | Ocoee, Florida, USA | 2026</div>
        </footer>
      </article>
    </div>
  );
}