import type { Metadata } from 'next'
import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/email'

const WHATSAPP_NUMBER = '5554992364777'
const WHATSAPP_MESSAGE = encodeURIComponent('Olá! Vi o Prospecta e queria tirar uma dúvida.')
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

export const metadata: Metadata = {
  title: 'Prospecta — Prospecção ativa por telefone em Caxias do Sul/RS',
  description:
    'Feito pra quem prospecta por telefone: encontre leads em Caxias do Sul/RS, ligue direto da plataforma, enriqueça com IA e acompanhe tudo até fechar.',
  openGraph: {
    title: 'Prospecta — Prospecção ativa por telefone em Caxias do Sul/RS',
    description:
      'Feito pra quem prospecta por telefone: encontre leads em Caxias do Sul/RS, ligue direto da plataforma, enriqueça com IA e acompanhe tudo até fechar.',
    locale: 'pt_BR',
    type: 'website',
  },
}

const FEATURES = [
  {
    title: 'Ligações direto da plataforma',
    description: 'Ligue pro lead com um número dedicado, sem trocar de app. A cobrança é por minuto e só acontece quando a ligação é atendida.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    ),
  },
  {
    title: 'Busca de leads em Caxias do Sul/RS',
    description: 'Encontre empresas com telefone pra ligar hoje — filtradas por categoria em Caxias do Sul/RS. Em breve, mais cidades.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    ),
  },
  {
    title: 'Análise da ligação com IA',
    description: 'Toda ligação é transcrita e analisada: resumo, objeções do lead, estratégias de conversão e sugestão automática de status e do próximo retorno.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    ),
  },
  {
    title: 'Pipeline de vendas',
    description: 'Acompanhe cada lead do primeiro contato até a conversão — novo, contatado, interessado, em negociação — com notas, histórico e acompanhamentos pra não perder o timing de retorno.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3.75m8.5-3.75 1 3.75m0 0 .5 2.25M12 16.5v3.75m-6.75-3.75h13.5" />
    ),
  },
  {
    title: 'E-mail integrado ao Gmail',
    description: 'Conecte sua conta do Gmail, use templates prontos e mande e-mails de prospecção sem sair do Prospecta.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    ),
  },
  {
    title: 'Roteirização de visitas',
    description: 'Planeje o dia de visitas com a rota mais eficiente entre os leads, sem perder tempo no trânsito.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    ),
  },
]

const STEPS = [
  { title: 'Busque leads', description: 'Filtre por categoria em Caxias do Sul/RS e adicione à sua base.' },
  { title: 'Organize no pipeline', description: 'Cada lead com status claro, notas e histórico.' },
  { title: 'Aborde do seu jeito', description: 'Ligue, mande e-mail ou agende uma visita.' },
  { title: 'Acompanhe até fechar', description: 'Lembretes de retorno pra não perder nenhum negócio.' },
]

const PLAN_ITEMS = [
  'Busca e enriquecimento de leads com IA',
  'CRM completo — pipeline, notas, histórico e acompanhamentos',
  'Roteirização de visitas',
  'Ligações direto da plataforma (cobradas por minuto, só quando atendidas)',
  'E-mail integrado ao Gmail com templates',
  'Suporte via WhatsApp',
]

function IconWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
        {children}
      </svg>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 w-6 fill-current">
      <path d="M16.004 2.667c-7.364 0-13.333 5.969-13.333 13.333 0 2.351.615 4.646 1.785 6.667L2.667 29.333l6.84-1.794a13.27 13.27 0 0 0 6.497 1.694h.006c7.364 0 13.333-5.969 13.333-13.333s-5.975-13.233-13.339-13.233Zm0 24.4a11.03 11.03 0 0 1-5.627-1.542l-.404-.24-4.06 1.065 1.084-3.957-.264-.407a11.02 11.02 0 0 1-1.69-5.886c0-6.104 4.967-11.07 11.067-11.07 2.957 0 5.737 1.154 7.827 3.248a10.996 10.996 0 0 1 3.239 7.829c-.005 6.104-4.972 11.07-11.072 10.96Zm6.067-8.286c-.332-.167-1.964-.969-2.269-1.08-.305-.111-.527-.167-.75.167-.221.333-.86 1.08-1.054 1.302-.194.222-.389.25-.721.084-.333-.167-1.405-.518-2.676-1.65-.989-.883-1.657-1.973-1.851-2.306-.194-.333-.021-.513.146-.679.15-.149.333-.389.5-.584.167-.194.222-.333.333-.555.111-.223.056-.417-.028-.584-.083-.167-.75-1.806-1.028-2.473-.271-.653-.546-.564-.75-.574-.194-.009-.417-.011-.639-.011-.222 0-.584.083-.89.417-.305.333-1.166 1.14-1.166 2.779 0 1.638 1.194 3.222 1.361 3.444.167.223 2.351 3.589 5.695 5.033.796.344 1.417.549 1.901.703.799.254 1.526.218 2.101.132.641-.096 1.964-.803 2.241-1.578.277-.775.277-1.439.194-1.578-.084-.139-.306-.222-.639-.389Z" />
    </svg>
  )
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-sidebar/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-bold text-white font-[--font-heading]">Prospecta</span>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#recursos" className="text-sm font-medium text-white/60 transition-colors hover:text-white">Recursos</a>
            <a href="#como-funciona" className="text-sm font-medium text-white/60 transition-colors hover:text-white">Como funciona</a>
            <a href="#preco" className="text-sm font-medium text-white/60 transition-colors hover:text-white">Preço</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-4"
            >
              Entrar
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark sm:px-4"
            >
              Começar agora
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            Feito pra quem prospecta por telefone
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-on-surface font-[--font-heading] sm:text-5xl">
            Prospecção ativa por telefone, do primeiro contato ao fechamento
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-on-surface-muted sm:text-lg">
            Encontre empresas pra ligar em Caxias do Sul/RS, enriqueça os dados com inteligência artificial e ligue
            direto da plataforma — sem planilha, sem trocar de app. Mande e-mail, planeje visitas e acompanhe cada
            lead até a conversão quando precisar ir além do telefone.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login?mode=signup"
              className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark sm:w-auto"
            >
              Começar agora
            </Link>
            <a
              href="#como-funciona"
              className="w-full rounded-lg border border-outline px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-low sm:w-auto"
            >
              Ver como funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-on-surface-muted">R$ 150/mês · Pix ou cartão · cancele quando quiser</p>
        </section>

        {/* Recursos */}
        <section id="recursos" className="border-t border-outline bg-surface-container py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-on-surface font-[--font-heading]">Tudo que a sua prospecção precisa</h2>
              <p className="mt-3 text-on-surface-muted">Um CRM pensado pra quem vive de prospecção ativa.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-outline bg-surface p-6 shadow-card">
                  <IconWrapper>{feature.icon}</IconWrapper>
                  <h3 className="mt-4 text-base font-semibold text-on-surface font-[--font-heading]">{feature.title}</h3>
                  <p className="mt-2 text-sm text-on-surface-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-on-surface font-[--font-heading]">Como funciona</h2>
              <p className="mt-3 text-on-surface-muted">Quatro passos, do zero ao negócio fechado.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-on-surface font-[--font-heading]">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-on-surface-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preço */}
        <section id="preco" className="border-t border-outline bg-surface-container py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold text-on-surface font-[--font-heading]">Um plano, sem pegadinha</h2>
              <p className="mt-3 text-on-surface-muted">Assinatura mensal, cancele quando quiser direto no painel.</p>
            </div>
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-outline bg-surface p-8 shadow-card">
              <p className="text-sm font-semibold text-primary">Plano Prospecta</p>
              <p className="mt-2 text-4xl font-bold text-on-surface font-[--font-heading]">
                R$ 150<span className="text-base font-medium text-on-surface-muted">/mês</span>
              </p>
              <ul className="mt-6 space-y-3">
                {PLAN_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-on-surface-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-primary">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?mode=signup"
                className="mt-8 block w-full rounded-lg bg-primary px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Assinar agora
              </Link>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl rounded-2xl bg-sidebar px-6 py-12 text-center sm:px-12">
            <h2 className="text-2xl font-bold text-white font-[--font-heading] sm:text-3xl">
              Pronto pra organizar sua prospecção?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
              Crie sua conta e comece a buscar leads hoje mesmo.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login?mode=signup"
                className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark sm:w-auto"
              >
                Começar agora
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                <WhatsAppIcon />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline bg-surface-container">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <span className="text-lg font-bold text-on-surface font-[--font-heading]">Prospecta</span>
              <p className="mt-2 text-sm text-on-surface-muted">Prospecção comercial organizada.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Produto</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-muted">
                <li><a href="#recursos" className="hover:text-on-surface">Recursos</a></li>
                <li><a href="#como-funciona" className="hover:text-on-surface">Como funciona</a></li>
                <li><a href="#preco" className="hover:text-on-surface">Preço</a></li>
                <li><Link href="/login" className="hover:text-on-surface">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Fale com a gente</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-muted">
                <li>
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-on-surface">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-on-surface">{SUPPORT_EMAIL}</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-outline pt-6 text-xs text-on-surface-muted">
            <p>PROSPECTA INOVA SIMPLES (I.S.) — CNPJ 68.741.993/0001-96</p>
            <p className="mt-1">Rua Amélia Antônia Facchin Bado, 40, Cidade Nova, Caxias do Sul/RS</p>
            <p className="mt-1">© {new Date().getFullYear()} Prospecta. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp flutuante */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-hover transition-transform hover:scale-105"
      >
        <WhatsAppIcon />
      </a>
    </div>
  )
}
