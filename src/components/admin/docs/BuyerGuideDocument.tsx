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
  s06_zeros: Array<{ t: string; d: string }>;
  s06_footer: string;
  // 07
  s07_kicker: string;
  s07_title: string;
  s07_lede: string;
  s07_logos: string;
  s07_note: string;
  s07_live: string;
  // 08
  s08_kicker: string;
  s08_title: string;
  s08_faq: Array<{ q: string; a: string }>;
  // 09
  s09_kicker: string;
  s09_title: string;
  s09_lede: string;
  s09_steps: Array<{ t: string; d: string }>;
  s09_demo_t: string;
  s09_demo_d: string;
  channels: string;
  print: string;
};

const CONTENT: Record<Lang, Doc> = {
  pt: {
    tagline: "Compre direto do produtor. Sem intermediários. Sem surpresas.",
    hero: "Marketplace B2B de proteínas animais — conectando importadores globais diretamente a frigoríficos verificados, com transparência total de preço e acesso gratuito para compradores.",
    badge: "DOCUMENTO PARA BUYERS | 2026",
    s01_kicker: "01 — O PONTO DE PARTIDA",
    s01_title: "Como o mercado de importação de carnes opera hoje",
    s01_lede: "Quem importa proteínas animais reconhece esse quadro. Quem está começando, vai reconhecer em breve.",
    s01_cards: [
      { t: "Você negocia sem saber o que o mercado está pagando", d: "Recebe propostas em formatos diferentes, de fontes diferentes, sem benchmark comum. Fecha negócios sem saber se obteve o melhor preço — ou apenas o preço que alguém quis que você visse." },
      { t: "Você não sabe se está comprando de frigorífico ou de trading", d: "Trader ou produtor real? A proposta parece a mesma. Você acaba confiando só em quem já trabalhou antes — não porque o mercado deu melhores opções, mas porque não deu visibilidade nenhuma." },
      { t: "Propostas chegam fragmentadas e incomparáveis", d: "Dezenas de fornecedores, cada um num formato diferente, incoterm diferente, moeda diferente. Comparar manualmente é humanamente impossível. Você compra de quem já conhece." },
      { t: "Você perde timing porque o mercado é mais rápido que seu inbox", d: "Quer fechar. Manda mensagem. O fornecedor demora dois dias para responder. Quando responde, o preço mudou ou o produto foi vendido. Lentidão custa volume real." },
      { t: "Toda a operação roda por e-mail e WhatsApp", d: "Status de carga, documentação, confirmação de pagamento — nenhum lugar centralizado. Cada atualização exige uma nova mensagem. Sem histórico, sem trilha de auditoria, sem inteligência para a próxima decisão." },
    ],
    s02_kicker: "02 — A SOLUÇÃO",
    s02_title: "A Mundus Trade",
    s02_sub: "Marketplace B2B onde frigoríficos verificados publicam ofertas com transparência total de preço — e você negocia diretamente, sem custo.",
    s02_story: "A Mundus não foi criada por uma equipe de tecnologia que identificou uma oportunidade de mercado. Foi criada por Fernando Nascimento — 30 anos de operação em exportação internacional de proteínas animais. De dentro das negociações, das cotas, dos traders, dos spreads que nunca aparecem no contrato. A plataforma resolve o que ele viu de perto durante três décadas: compradores que pagam mais porque não têm benchmark. Compradores que ficam com os mesmos três fornecedores porque o mercado não deu alternativas verificadas. Compradores que perdem negócios porque o processo de sourcing é lento demais.",
    s02_features: [
      { icon: "🌍", t: "Produtores verificados no mundo todo", d: "Somente frigoríficos — trading não tem acesso como supplier. Cada produtor verificado antes de listar." },
      { icon: "✅", t: "Completamente gratuito para buyers", d: "Zero de custo. Sem assinatura, sem taxa, sem comissão. Acesso completo à plataforma sem pagar nada." },
      { icon: "🔒", t: "Verificação completa dos dois lados", d: "Buyers e suppliers passam por verificação documental antes de operar. Você sabe com quem está negociando." },
    ],
    s03_kicker: "03 — CREDIBILIDADE",
    s03_title: "Respaldo institucional",
    s03_blocks: [
      { t: "Câmara Árabe Brasileira de Comércio (CABC)", d: "Membro oficial da CABC — uma das principais instituições de promoção comercial entre o Brasil e os países do Oriente Médio e Norte da África. Quando você compra pela Mundus, opera com respaldo institucional nos mercados de maior volume para importação de proteínas animais." },
      { t: "Rede de associações internacionais", d: "Relacionamento ativo com associações setoriais e câmaras de comércio internacionais — garantindo acesso a produtores verificados em mercados que você pode não ter alcançado antes. 30 anos de network no setor. Ativado agora em favor de quem está dentro da plataforma." },
    ],
    s03_footer: "",
    s04_kicker: "04 — BENEFÍCIOS",
    s04_title: "O que muda para você",
    s04_lede: "A plataforma resolve os cinco problemas centrais do sourcing de carne — ao mesmo tempo.",
    s04_table_head: ["O que a Mundus resolve", "Como funciona", "O que você ganha"],
    s04_rows: [
      ["Transparência de preço", "Todas as ofertas padronizadas — produto, preço, incoterm, porto, specs técnicas.", "Bate o olho e compara. Sem pedir cotação para ninguém, sem planilha manual."],
      ["Confiança no fornecedor", "Somente frigoríficos verificados na plataforma — trading não vende, sem intermediário.", "Negocia direto com o produtor. Vê o SIF, o número da fábrica, o histórico. Sem surpresa."],
      ["Velocidade de fechamento", "Negociação dentro dos parâmetros do frigorífico — proposta, contraproposta e fechamento em minutos.", "O que hoje leva 3 dias de e-mail vai a 10 minutos. Você aproveita a janela de preço antes que feche."],
      ["Demanda ativa", "Você pode publicar o que quer comprar — os frigoríficos vêm até você.", "Inverte a lógica: em vez de buscar, você posta o que precisa e o mercado responde."],
      ["Custo zero", "Acesso gratuito — sem custo de entrada, sem assinatura, sem comissão sobre compras.", "Nenhum risco para experimentar. Se não encontrar o que precisa, não perdeu nada."],
    ],
    s05_kicker: "05 — OPERAÇÃO",
    s05_title: "Como funciona na prática",
    s05_lede: "O cadastro leva menos de 5 minutos. Você pode começar a navegar ofertas no mesmo dia.",
    s05_steps: [
      { t: "Crie seu cadastro", d: "Acesse app.mundustrade.com, clique em 'Cadastrar como Buyer', preencha os dados da sua empresa e envie a documentação. Processo 100% online. Verificado pela equipe Mundus antes de ativar." },
      { t: "Navegue as ofertas ou publique o que quer comprar", d: "Explore ofertas ativas de frigoríficos verificados no mundo todo — produto, preço, incoterm, porto e specs visíveis antes de qualquer contato. Ou publique sua demanda e deixe o mercado responder." },
      { t: "Faça seu bid e feche", d: "Envie proposta diretamente ao frigorífico. Negocie, contraproponha e feche — tudo dentro da plataforma, com histórico completo de cada negociação registrado automaticamente." },
    ],
    s06_kicker: "06 — CUSTO",
    s06_title: "Custo para o buyer: zero",
    s06_zeros: [
      { t: "Cadastro", d: "Sem taxa de entrada. Você se cadastra, verifica sua empresa e já começa a operar." },
      { t: "Mensalidade", d: "Sem assinatura. Sem plano mensal. Acesso completo à plataforma sem custo recorrente." },
      { t: "Comissão sobre compras", d: "Buyers não pagam comissão. A Mundus cobra 0,30% do supplier — apenas quando o negócio fecha." },
    ],
    s06_footer: "Acesso gratuito, sem risco, sem compromisso. Se não encontrar o que precisa, não perdeu nada.",
    s07_kicker: "07 — PROVA SOCIAL",
    s07_title: "Quem já está dentro",
    s07_lede: "Frigoríficos com SIF verificado de múltiplos países, com certificações documentadas e habilitações de exportação validadas pela plataforma.",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "Cada supplier passou por verificação documental antes de operar. Você vê o SIF, o número da fábrica, a habilitação de exportação. Verificável antes de qualquer negociação.",
    s07_live: "Oferta ativa hoje na plataforma: Frigorífico Valencio — Beef Trimmings — CFR Santos-Manila",
    s08_kicker: "08 — DÚVIDAS FREQUENTES",
    s08_title: "Perguntas que surgem antes de começar",
    s08_faq: [
      { q: "\"Já tenho meus fornecedores de confiança.\"", a: "Seus fornecedores continuam — a Mundus não tira ninguém. Mas quando um deles atrasar, tiver problema sanitário ou não tiver o volume que você precisa, você terá uma alternativa verificada pronta. E não custa nada estar cadastrado." },
      { q: "\"Como sei que os frigoríficos são reais e não trading?\"", a: "Na Mundus só frigorífico vende — trading não tem acesso como supplier. Você vê o número da fábrica, o SIF, a habilitação para exportação. É verificável antes de qualquer negociação." },
      { q: "\"Não tenho tempo agora para mais uma plataforma.\"", a: "O cadastro leva menos de 5 minutos. Você não precisa fazer nada depois — quando aparecer uma oferta que te interessa, você recebe. E pode postar o que quer comprar em um clique." },
      { q: "\"Prefiro e-mail e WhatsApp, é mais fácil.\"", a: "Seu fluxo atual continua como está — a Mundus não pede que você mude nada. Você usa quando quiser comparar opções, encontrar algo novo ou quando seu fornecedor habitual não tiver disponibilidade." },
    ],
    s09_kicker: "09 — PRÓXIMO PASSO",
    s09_title: "Como começar",
    s09_lede: "Cadastro gratuito. Sem compromisso. Você pode explorar a plataforma antes de fazer qualquer coisa.",
    s09_steps: [
      { t: "Acesse app.mundustrade.com", d: "Clique em 'Cadastrar como Buyer', preencha os dados da sua empresa e envie a documentação. Processo 100% online." },
      { t: "Explore as ofertas disponíveis", d: "Navegue pelas ofertas ativas de frigoríficos verificados no mundo todo. Produto, preço, incoterm e specs visíveis antes de qualquer contato." },
      { t: "Faça seu primeiro bid ou publique sua demanda", d: "Envie proposta para um fornecedor ou publique o que você quer comprar. O mercado responde." },
    ],
    s09_demo_t: "Quer uma demonstração antes de se cadastrar?",
    s09_demo_d: "Nossa equipe está disponível para mostrar a plataforma ao vivo — sem compromisso.",
    channels: "Canais de contato",
    print: "Imprimir / Salvar PDF",
  },
  en: {
    tagline: "Buy direct from the producer. No middlemen. No surprises.",
    hero: "B2B marketplace for animal protein — connecting global importers directly to verified slaughterhouses, with full price transparency and free access for buyers.",
    badge: "BUYER DOCUMENT | 2026",
    s01_kicker: "01 — THE STARTING POINT",
    s01_title: "How the meat import market works today",
    s01_lede: "Anyone who imports animal protein recognizes this picture. Anyone just starting out will recognize it soon enough.",
    s01_cards: [
      { t: "You negotiate without knowing what the market is paying", d: "You receive proposals in different formats, from different sources, with no common benchmark. You close deals without knowing whether you got the best price — or just the price someone wanted you to see." },
      { t: "You don't know if you're buying from a packer or a trader", d: "Trader or real producer? The proposal looks the same. You end up trusting only those you've worked with before — not because the market gave you better options, but because it gave no visibility at all." },
      { t: "Proposals arrive fragmented and incomparable", d: "Dozens of suppliers, each in a different format, different incoterm, different currency. Comparing manually is humanly impossible. You buy from whoever you already know." },
      { t: "You lose timing because the market is faster than your inbox", d: "You want to close. You send a message. The supplier takes two days to reply. By the time they do, the price moved or the product is sold. Slowness costs real volume." },
      { t: "Everything runs over email and WhatsApp", d: "Cargo status, paperwork, payment confirmation — nothing centralized. Every update requires a new message. No history, no audit trail, no intelligence for the next decision." },
    ],
    s02_kicker: "02 — THE SOLUTION",
    s02_title: "Mundus Trade",
    s02_sub: "A B2B marketplace where verified slaughterhouses publish offers with full price transparency — and you negotiate directly, at no cost.",
    s02_story: "Mundus wasn't built by a tech team that spotted a market opportunity. It was built by Fernando Nascimento — 30 years operating in international meat exports. From inside the negotiations, the quotas, the traders, the spreads that never show up in a contract. The platform solves what he saw up close for three decades: buyers who pay more because they have no benchmark. Buyers stuck with the same three suppliers because the market never gave them verified alternatives. Buyers who lose deals because the sourcing process is too slow.",
    s02_features: [
      { icon: "🌍", t: "Verified producers worldwide", d: "Slaughterhouses only — traders cannot list as suppliers. Every producer is verified before going live." },
      { icon: "✅", t: "Completely free for buyers", d: "Zero cost. No subscription, no fee, no commission. Full platform access without paying anything." },
      { icon: "🔒", t: "Full verification on both sides", d: "Buyers and suppliers pass document verification before operating. You know exactly who you're negotiating with." },
    ],
    s03_kicker: "03 — CREDIBILITY",
    s03_title: "Institutional backing",
    s03_blocks: [
      { t: "Arab Brazilian Chamber of Commerce (CABC)", d: "Official CABC member — one of the leading trade-promotion institutions between Brazil and the Middle East and North Africa. When you buy through Mundus, you operate with institutional backing in the largest markets for meat imports." },
      { t: "International association network", d: "Active relationships with industry associations and international chambers of commerce — granting access to verified producers in markets you may not have reached before. 30 years of network in the sector. Activated now in favor of those inside the platform." },
    ],
    s03_footer: "",
    s04_kicker: "04 — BENEFITS",
    s04_title: "What changes for you",
    s04_lede: "The platform solves the five core problems of meat sourcing — all at once.",
    s04_table_head: ["What Mundus solves", "How it works", "What you gain"],
    s04_rows: [
      ["Price transparency", "All offers standardized — product, price, incoterm, port, technical specs.", "Look and compare. No quote requests, no manual spreadsheet."],
      ["Supplier trust", "Verified slaughterhouses only — no traders, no intermediaries.", "Negotiate direct with the producer. See the SIF, plant number, history. No surprises."],
      ["Speed to close", "Negotiation within the slaughterhouse's parameters — proposal, counter-proposal, closing in minutes.", "What takes 3 days over email goes to 10 minutes. You capture the price window before it shuts."],
      ["Active demand", "Post what you want to buy — slaughterhouses come to you.", "Flip the logic: instead of hunting, you post what you need and the market responds."],
      ["Zero cost", "Free access — no setup, no subscription, no commission on purchases.", "No risk to try it. If you don't find what you need, you lost nothing." ],
    ],
    s05_kicker: "05 — HOW IT WORKS",
    s05_title: "How it works in practice",
    s05_lede: "Sign-up takes less than 5 minutes. You can start browsing offers the same day.",
    s05_steps: [
      { t: "Create your account", d: "Go to app.mundustrade.com, click 'Sign up as Buyer', fill in your company data and upload documents. 100% online. Verified by the Mundus team before activation." },
      { t: "Browse offers or post what you want to buy", d: "Explore active offers from verified slaughterhouses worldwide — product, price, incoterm, port and specs visible before any contact. Or post your demand and let the market respond." },
      { t: "Place your bid and close", d: "Send proposals directly to the slaughterhouse. Negotiate, counter and close — all within the platform, with full history of every negotiation logged automatically." },
    ],
    s06_kicker: "06 — COST",
    s06_title: "Cost for buyers: zero",
    s06_zeros: [
      { t: "Sign-up", d: "No entry fee. You sign up, verify your company, and start operating." },
      { t: "Subscription", d: "No subscription. No monthly plan. Full platform access with no recurring cost." },
      { t: "Purchase commission", d: "Buyers pay no commission. Mundus charges 0.30% from the supplier — only when a deal closes." },
    ],
    s06_footer: "Free access, no risk, no commitment. If you don't find what you need, you've lost nothing.",
    s07_kicker: "07 — SOCIAL PROOF",
    s07_title: "Who's already inside",
    s07_lede: "Slaughterhouses with verified SIF from multiple countries, with documented certifications and export approvals validated by the platform.",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "Every supplier passed document verification before operating. You see the SIF, the plant number, the export approval. Verifiable before any negotiation.",
    s07_live: "Live offer on the platform today: Frigorífico Valencio — Beef Trimmings — CFR Santos-Manila",
    s08_kicker: "08 — FAQ",
    s08_title: "Questions that come up before you start",
    s08_faq: [
      { q: "\"I already have my trusted suppliers.\"", a: "Your suppliers stay — Mundus doesn't take anyone away. But when one is late, has a sanitary issue, or doesn't have the volume you need, you'll have a verified alternative ready. And it costs nothing to be signed up." },
      { q: "\"How do I know the slaughterhouses are real and not traders?\"", a: "On Mundus, only slaughterhouses sell — traders cannot list as suppliers. You see the plant number, the SIF, the export approval. Verifiable before any negotiation." },
      { q: "\"I don't have time for another platform right now.\"", a: "Sign-up takes less than 5 minutes. You don't need to do anything afterwards — when an offer that interests you appears, you'll receive it. And you can post what you want to buy in one click." },
      { q: "\"I prefer email and WhatsApp, it's easier.\"", a: "Your current workflow stays exactly as it is — Mundus doesn't ask you to change anything. You use it when you want to compare options, find something new, or when your usual supplier is unavailable." },
    ],
    s09_kicker: "09 — NEXT STEP",
    s09_title: "How to start",
    s09_lede: "Free sign-up. No commitment. You can explore the platform before doing anything.",
    s09_steps: [
      { t: "Go to app.mundustrade.com", d: "Click 'Sign up as Buyer', fill in your company data and upload documents. 100% online." },
      { t: "Explore the available offers", d: "Browse active offers from verified slaughterhouses worldwide. Product, price, incoterm and specs visible before any contact." },
      { t: "Place your first bid or post your demand", d: "Send a proposal to a supplier or post what you want to buy. The market responds." },
    ],
    s09_demo_t: "Want a demo before signing up?",
    s09_demo_d: "Our team is available to show the platform live — no commitment.",
    channels: "Contact channels",
    print: "Print / Save PDF",
  },
  es: {
    tagline: "Compre directo del productor. Sin intermediarios. Sin sorpresas.",
    hero: "Marketplace B2B de proteínas animales — conectando importadores globales directamente con frigoríficos verificados, con transparencia total de precio y acceso gratuito para compradores.",
    badge: "DOCUMENTO PARA BUYERS | 2026",
    s01_kicker: "01 — EL PUNTO DE PARTIDA",
    s01_title: "Cómo funciona hoy el mercado de importación de carnes",
    s01_lede: "Quien importa proteínas animales reconoce este cuadro. Quien recién empieza, lo reconocerá muy pronto.",
    s01_cards: [
      { t: "Negocia sin saber lo que el mercado está pagando", d: "Recibe propuestas en formatos distintos, de fuentes distintas, sin un benchmark común. Cierra negocios sin saber si obtuvo el mejor precio — o solo el precio que alguien quiso que viera." },
      { t: "No sabe si está comprando a un frigorífico o a un trader", d: "¿Trader o productor real? La propuesta parece la misma. Termina confiando solo en quienes ya conoce — no porque el mercado le dio mejores opciones, sino porque no le dio visibilidad alguna." },
      { t: "Las propuestas llegan fragmentadas e incomparables", d: "Decenas de proveedores, cada uno en un formato distinto, incoterm distinto, moneda distinta. Comparar manualmente es humanamente imposible. Compra a quien ya conoce." },
      { t: "Pierde timing porque el mercado es más rápido que su bandeja de entrada", d: "Quiere cerrar. Envía un mensaje. El proveedor tarda dos días en responder. Cuando responde, el precio cambió o el producto se vendió. La lentitud cuesta volumen real." },
      { t: "Toda la operación va por e-mail y WhatsApp", d: "Estado de carga, documentación, confirmación de pago — sin un lugar centralizado. Cada actualización exige un nuevo mensaje. Sin historial, sin auditoría, sin inteligencia para la próxima decisión." },
    ],
    s02_kicker: "02 — LA SOLUCIÓN",
    s02_title: "Mundus Trade",
    s02_sub: "Marketplace B2B donde frigoríficos verificados publican ofertas con transparencia total de precio — y usted negocia directamente, sin costo.",
    s02_story: "Mundus no fue creada por un equipo de tecnología que detectó una oportunidad de mercado. Fue creada por Fernando Nascimento — 30 años operando en exportación internacional de proteínas animales. Desde dentro de las negociaciones, las cuotas, los traders, los spreads que nunca aparecen en el contrato. La plataforma resuelve lo que vio de cerca durante tres décadas: compradores que pagan más porque no tienen benchmark. Compradores que se quedan con los mismos tres proveedores porque el mercado no les dio alternativas verificadas. Compradores que pierden negocios porque el proceso de sourcing es demasiado lento.",
    s02_features: [
      { icon: "🌍", t: "Productores verificados en todo el mundo", d: "Solo frigoríficos — los traders no tienen acceso como supplier. Cada productor verificado antes de listarse." },
      { icon: "✅", t: "Totalmente gratuito para buyers", d: "Cero costo. Sin suscripción, sin tarifa, sin comisión. Acceso completo a la plataforma sin pagar nada." },
      { icon: "🔒", t: "Verificación completa de ambos lados", d: "Buyers y suppliers pasan por verificación documental antes de operar. Sabe con quién está negociando." },
    ],
    s03_kicker: "03 — CREDIBILIDAD",
    s03_title: "Respaldo institucional",
    s03_blocks: [
      { t: "Cámara Árabe Brasileña de Comercio (CABC)", d: "Miembro oficial de la CABC — una de las principales instituciones de promoción comercial entre Brasil y los países de Medio Oriente y Norte de África. Cuando compra por Mundus, opera con respaldo institucional en los mercados de mayor volumen para importación de proteínas animales." },
      { t: "Red de asociaciones internacionales", d: "Relación activa con asociaciones sectoriales y cámaras de comercio internacionales — garantizando acceso a productores verificados en mercados que tal vez no haya alcanzado antes. 30 años de network en el sector. Activado ahora en favor de quienes están dentro de la plataforma." },
    ],
    s03_footer: "",
    s04_kicker: "04 — BENEFICIOS",
    s04_title: "Qué cambia para usted",
    s04_lede: "La plataforma resuelve los cinco problemas centrales del sourcing de carne — al mismo tiempo.",
    s04_table_head: ["Qué resuelve Mundus", "Cómo funciona", "Qué gana usted"],
    s04_rows: [
      ["Transparencia de precio", "Todas las ofertas estandarizadas — producto, precio, incoterm, puerto, specs técnicas.", "Mira y compara. Sin pedir cotización a nadie, sin planilla manual."],
      ["Confianza en el proveedor", "Solo frigoríficos verificados en la plataforma — sin trader, sin intermediario.", "Negocia directo con el productor. Ve el SIF, el número de la planta, el historial. Sin sorpresas."],
      ["Velocidad de cierre", "Negociación dentro de los parámetros del frigorífico — propuesta, contrapropuesta y cierre en minutos.", "Lo que hoy lleva 3 días de e-mail va a 10 minutos. Aprovecha la ventana de precio antes de que se cierre."],
      ["Demanda activa", "Puede publicar lo que quiere comprar — los frigoríficos vienen a usted.", "Invierte la lógica: en lugar de buscar, usted publica lo que necesita y el mercado responde."],
      ["Costo cero", "Acceso gratuito — sin costo de entrada, sin suscripción, sin comisión sobre compras.", "Sin riesgo para probar. Si no encuentra lo que necesita, no perdió nada."],
    ],
    s05_kicker: "05 — OPERACIÓN",
    s05_title: "Cómo funciona en la práctica",
    s05_lede: "El registro toma menos de 5 minutos. Puede empezar a navegar ofertas el mismo día.",
    s05_steps: [
      { t: "Cree su cuenta", d: "Entre a app.mundustrade.com, haga clic en 'Registrarse como Buyer', complete los datos de su empresa y envíe la documentación. Proceso 100% online. Verificado por el equipo Mundus antes de activar." },
      { t: "Navegue las ofertas o publique lo que quiere comprar", d: "Explore ofertas activas de frigoríficos verificados en todo el mundo — producto, precio, incoterm, puerto y specs visibles antes de cualquier contacto. O publique su demanda y deje que el mercado responda." },
      { t: "Haga su bid y cierre", d: "Envíe propuesta directamente al frigorífico. Negocie, contraproponga y cierre — todo dentro de la plataforma, con historial completo de cada negociación registrado automáticamente." },
    ],
    s06_kicker: "06 — COSTO",
    s06_title: "Costo para el buyer: cero",
    s06_zeros: [
      { t: "Registro", d: "Sin tarifa de entrada. Se registra, verifica su empresa y empieza a operar." },
      { t: "Mensualidad", d: "Sin suscripción. Sin plan mensual. Acceso completo a la plataforma sin costo recurrente." },
      { t: "Comisión sobre compras", d: "Los buyers no pagan comisión. Mundus cobra 0,30% al supplier — solo cuando el negocio cierra." },
    ],
    s06_footer: "Acceso gratuito, sin riesgo, sin compromiso. Si no encuentra lo que necesita, no perdió nada.",
    s07_kicker: "07 — PRUEBA SOCIAL",
    s07_title: "Quién ya está dentro",
    s07_lede: "Frigoríficos con SIF verificado de múltiples países, con certificaciones documentadas y habilitaciones de exportación validadas por la plataforma.",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "Cada supplier pasó por verificación documental antes de operar. Ve el SIF, el número de la planta, la habilitación de exportación. Verificable antes de cualquier negociación.",
    s07_live: "Oferta activa hoy en la plataforma: Frigorífico Valencio — Beef Trimmings — CFR Santos-Manila",
    s08_kicker: "08 — PREGUNTAS FRECUENTES",
    s08_title: "Preguntas que surgen antes de empezar",
    s08_faq: [
      { q: "\"Ya tengo mis proveedores de confianza.\"", a: "Sus proveedores siguen — Mundus no quita a nadie. Pero cuando uno se atrase, tenga un problema sanitario o no tenga el volumen que necesita, tendrá una alternativa verificada lista. Y no cuesta nada estar registrado." },
      { q: "\"¿Cómo sé que los frigoríficos son reales y no traders?\"", a: "En Mundus solo el frigorífico vende — el trader no tiene acceso como supplier. Ve el número de la planta, el SIF, la habilitación de exportación. Es verificable antes de cualquier negociación." },
      { q: "\"No tengo tiempo ahora para otra plataforma.\"", a: "El registro toma menos de 5 minutos. No tiene que hacer nada después — cuando aparezca una oferta que le interese, la recibirá. Y puede publicar lo que quiere comprar en un clic." },
      { q: "\"Prefiero e-mail y WhatsApp, es más fácil.\"", a: "Su flujo actual sigue como está — Mundus no le pide que cambie nada. Lo usa cuando quiera comparar opciones, encontrar algo nuevo o cuando su proveedor habitual no tenga disponibilidad." },
    ],
    s09_kicker: "09 — PRÓXIMO PASO",
    s09_title: "Cómo empezar",
    s09_lede: "Registro gratuito. Sin compromiso. Puede explorar la plataforma antes de hacer cualquier cosa.",
    s09_steps: [
      { t: "Entre a app.mundustrade.com", d: "Haga clic en 'Registrarse como Buyer', complete los datos de su empresa y envíe la documentación. Proceso 100% online." },
      { t: "Explore las ofertas disponibles", d: "Navegue por las ofertas activas de frigoríficos verificados en todo el mundo. Producto, precio, incoterm y specs visibles antes de cualquier contacto." },
      { t: "Haga su primer bid o publique su demanda", d: "Envíe propuesta a un proveedor o publique lo que quiere comprar. El mercado responde." },
    ],
    s09_demo_t: "¿Quiere una demo antes de registrarse?",
    s09_demo_d: "Nuestro equipo está disponible para mostrar la plataforma en vivo — sin compromiso.",
    channels: "Canales de contacto",
    print: "Imprimir / Guardar PDF",
  },
  zh: {
    tagline: "直接向生产商采购。无中间商。无意外。",
    hero: "动物蛋白B2B交易市场——将全球进口商直接连接到经认证的屠宰场，价格完全透明，对买家免费开放。",
    badge: "买家文档 | 2026",
    s01_kicker: "01 — 起点",
    s01_title: "今天的肉类进口市场是如何运作的",
    s01_lede: "进口动物蛋白的人会认出这幅画面。刚入行的人，很快也会认出。",
    s01_cards: [
      { t: "您在不知道市场行情的情况下进行谈判", d: "收到的报价格式不同、来源不同，没有共同的基准。您完成交易时并不知道是否拿到了最优价格——还是仅仅是别人想让您看到的价格。" },
      { t: "您不知道是在向屠宰场还是贸易商采购", d: "贸易商还是真正的生产商？报价看起来一样。您只能信赖以前合作过的人——不是因为市场提供了更好的选择，而是因为根本没有可视性。" },
      { t: "报价支离破碎、无法比较", d: "几十家供应商，每家的格式、贸易术语、货币都不同。手动比较在人力上是不可能的。您只会向已经熟悉的人采购。" },
      { t: "您因为市场比邮件更快而错失时机", d: "您想成交。您发了消息。供应商两天才回复。当他回复时，价格已变或产品已售。慢就是失去真实的成交量。" },
      { t: "所有操作都通过邮件和WhatsApp进行", d: "货物状态、单证、付款确认——没有任何集中位置。每次更新都需要新消息。没有历史记录、没有审计轨迹、没有为下一次决策提供的智能。" },
    ],
    s02_kicker: "02 — 解决方案",
    s02_title: "Mundus Trade",
    s02_sub: "经认证的屠宰场在B2B交易市场上发布完全价格透明的报价——您可以直接谈判，无需任何成本。",
    s02_story: "Mundus不是由发现市场机会的技术团队创建的。它是由Fernando Nascimento创建的——拥有30年国际动物蛋白出口经验。来自谈判内部、配额、贸易商以及合同中从未出现的价差。该平台解决了他三十年来近距离看到的问题：因缺乏基准而支付更多的买家；因市场未提供经过认证的替代方案而困于同样三家供应商的买家；因采购流程太慢而失去交易的买家。",
    s02_features: [
      { icon: "🌍", t: "全球经认证的生产商", d: "仅限屠宰场——贸易商无法作为供应商进入。每个生产商在上架前都经过认证。" },
      { icon: "✅", t: "对买家完全免费", d: "零成本。无订阅、无费用、无佣金。无需付费即可完整访问平台。" },
      { icon: "🔒", t: "双方完整认证", d: "买家和供应商在运营前都需通过单证认证。您清楚知道与谁在谈判。" },
    ],
    s03_kicker: "03 — 可信度",
    s03_title: "机构背书",
    s03_blocks: [
      { t: "巴西-阿拉伯商会 (CABC)", d: "CABC正式会员——是促进巴西与中东、北非地区商业往来的主要机构之一。当您通过Mundus采购时，您在动物蛋白进口最大的市场上拥有机构背书。" },
      { t: "国际协会网络", d: "与行业协会和国际商会保持活跃关系——确保您能访问以前可能未触及市场的经认证生产商。30年的行业网络。如今为平台内的成员激活。" },
    ],
    s03_footer: "",
    s04_kicker: "04 — 优势",
    s04_title: "您将获得什么变化",
    s04_lede: "该平台同时解决肉类采购的五个核心问题。",
    s04_table_head: ["Mundus 解决什么", "如何运作", "您获得什么"],
    s04_rows: [
      ["价格透明", "所有报价标准化——产品、价格、贸易术语、港口、技术规格。", "一眼即可比较。无需向任何人索取报价，无需手工电子表格。"],
      ["对供应商的信任", "平台上仅限经认证的屠宰场——贸易商不销售，无中间商。", "直接与生产商谈判。可查看 SIF、工厂编号、历史记录。无意外。"],
      ["成交速度", "在屠宰场参数范围内谈判——报价、还价、成交在几分钟内完成。", "原本需3天邮件的过程缩短到10分钟。在价格窗口关闭前抓住机会。"],
      ["主动需求", "您可以发布想要采购的内容——屠宰场会主动联系您。", "反转逻辑：不再到处搜寻，您发布需求，市场作出回应。"],
      ["零成本", "免费访问——无入门费、无订阅、无采购佣金。", "尝试无风险。如果没找到所需，也没有任何损失。"],
    ],
    s05_kicker: "05 — 运营",
    s05_title: "实际如何运作",
    s05_lede: "注册不到5分钟。您当天即可开始浏览报价。",
    s05_steps: [
      { t: "创建账户", d: "访问 app.mundustrade.com，点击「以买家身份注册」，填写公司资料并上传单证。100% 在线流程。在激活前由 Mundus 团队进行认证。" },
      { t: "浏览报价或发布采购需求", d: "探索来自全球经认证屠宰场的活跃报价——在任何接触之前即可查看产品、价格、贸易术语、港口和规格。或发布您的需求，让市场作出回应。" },
      { t: "提交报价并成交", d: "直接向屠宰场提交报价。谈判、还价并成交——全部在平台内完成，每次谈判的完整历史自动记录。" },
    ],
    s06_kicker: "06 — 成本",
    s06_title: "买家成本：零",
    s06_zeros: [
      { t: "注册", d: "无入门费。您完成注册并验证公司即可开始运营。" },
      { t: "月费", d: "无订阅。无月度计划。完整访问平台，无任何经常性费用。" },
      { t: "采购佣金", d: "买家不支付佣金。Mundus 仅在成交时向供应商收取 0.30%。" },
    ],
    s06_footer: "免费访问，无风险，无承诺。如果没找到所需，您没有任何损失。",
    s07_kicker: "07 — 社会认证",
    s07_title: "已经加入的成员",
    s07_lede: "来自多个国家、拥有经认证 SIF、文档化认证和平台验证的出口资质的屠宰场。",
    s07_logos: "Frigorífico Verdi · Beauvallet · Mercúrio · Agromass Brasil · SulBeef · Friberne · Valencio",
    s07_note: "每个供应商在运营前都通过了单证认证。您可以查看 SIF、工厂编号、出口资质。在任何谈判前均可验证。",
    s07_live: "今天平台上的活跃报价：Frigorífico Valencio — Beef Trimmings — CFR Santos-Manila",
    s08_kicker: "08 — 常见问题",
    s08_title: "开始前的常见疑问",
    s08_faq: [
      { q: "「我已经有信任的供应商了。」", a: "您的供应商依然在——Mundus 不会取代任何人。但当某位延迟、出现卫生问题或没有您需要的量时，您会有一个经认证的备选方案。注册不需要任何成本。" },
      { q: "「我怎么知道屠宰场是真实的而不是贸易商？」", a: "在 Mundus，只有屠宰场销售——贸易商无法作为供应商进入。您可以查看工厂编号、SIF、出口资质。在任何谈判前均可验证。" },
      { q: "「我现在没有时间使用另一个平台。」", a: "注册不到5分钟。之后您无需做任何事——当出现您感兴趣的报价时，您会收到通知。只需一键即可发布采购需求。" },
      { q: "「我更喜欢邮件和WhatsApp，更简单。」", a: "您当前的工作流程不变——Mundus 不要求您改变任何东西。您可以在需要比较选项、寻找新供应或您常用的供应商无货时使用它。" },
    ],
    s09_kicker: "09 — 下一步",
    s09_title: "如何开始",
    s09_lede: "免费注册。无承诺。您可以在做任何事之前先探索平台。",
    s09_steps: [
      { t: "访问 app.mundustrade.com", d: "点击「以买家身份注册」，填写公司资料并上传单证。100% 在线流程。" },
      { t: "探索可用报价", d: "浏览来自全球经认证屠宰场的活跃报价。在任何接触之前即可查看产品、价格、贸易术语和规格。" },
      { t: "提交首次报价或发布需求", d: "向供应商发送报价，或发布您的采购需求。市场会作出回应。" },
    ],
    s09_demo_t: "想在注册前先看一次演示？",
    s09_demo_d: "我们的团队随时可以现场演示平台——无任何承诺。",
    channels: "联系方式",
    print: "打印 / 保存 PDF",
  },
};

export function BuyerGuideDocument() {
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
                  <td><strong>{row[0]}</strong></td>
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
                <div className="mw-doc-zero-big">$0</div>
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
          <div className="mw-doc-live">{c.s07_live}</div>
        </section>

        {/* 08 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s08_kicker}</div>
          <h2 className="mw-doc-h2">{c.s08_title}</h2>
          <div className="mw-doc-faq">
            {c.s08_faq.map((f, i) => (
              <div key={i} className="mw-doc-faq-item">
                <div className="mw-doc-faq-q">{f.q}</div>
                <div className="mw-doc-faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 09 */}
        <section className="mw-doc-section">
          <div className="mw-doc-kicker">{c.s09_kicker}</div>
          <h2 className="mw-doc-h2">{c.s09_title}</h2>
          <p className="mw-doc-lede">{c.s09_lede}</p>
          <ol className="mw-doc-steps">
            {c.s09_steps.map((s, i) => (
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
            <div className="mw-doc-demo-t">{c.s09_demo_t}</div>
            <div className="mw-doc-demo-d">{c.s09_demo_d}</div>
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