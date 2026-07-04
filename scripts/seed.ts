/**
 * Seed script — popula o banco de staging com dados fictícios para teste.
 *
 * Uso:
 *   npm run seed -- --email seu@email.com
 *   npm run seed -- --email seu@email.com --reset   (apaga dados de seed antes de inserir)
 *
 * Requer .env.local com:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── CLI args ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const emailArg = args[args.indexOf('--email') + 1]
const shouldReset = args.includes('--reset')
const deleteOnly = args.includes('--delete-only')

if (!emailArg) {
  console.error('❌  Informe o email do usuário: npm run seed -- --email seu@email.com')
  process.exit(1)
}

// ── Dados fictícios ────────────────────────────────────────────────────────────

const SEED_SOURCE = 'seed'

const COMPANIES = [
  { company_name: 'Plásticos Alfa Ltda',       email: 'contato@plasticosalfa.com.br',   phone: '(11) 98765-0001', website: 'plasticosalfa.com.br',    city: 'São Paulo',       status: 'novo' },
  { company_name: 'Construções Beta S.A.',      email: 'obras@construcoesbeta.com.br',   phone: '(11) 97654-0002', website: 'construcoesbeta.com.br',   city: 'São Paulo',       status: 'novo' },
  { company_name: 'Distribuidora Gama',         email: 'vendas@distgama.com.br',         phone: '(21) 96543-0003', website: 'distgama.com.br',          city: 'Rio de Janeiro',  status: 'novo' },
  { company_name: 'Indústria Delta Ltda',       email: 'diretoria@industdelta.com.br',   phone: '(31) 95432-0004', website: 'industdelta.com.br',        city: 'Belo Horizonte',  status: 'novo' },
  { company_name: 'Ferragens Epsilon',          email: 'comercial@ferragens-eps.com.br', phone: '(41) 94321-0005', website: 'ferragens-eps.com.br',      city: 'Curitiba',        status: 'novo' },
  { company_name: 'Atacado Zeta Comércio',      email: 'pedidos@atacadozeta.com.br',     phone: '(51) 93210-0006', website: 'atacadozeta.com.br',        city: 'Porto Alegre',    status: 'contatado' },
  { company_name: 'TechLogis Transportes',      email: 'logistica@techlogis.com.br',     phone: '(11) 92109-0007', website: 'techlogis.com.br',          city: 'Guarulhos',       status: 'contatado' },
  { company_name: 'Embalagens Eta S.A.',        email: 'ceo@embalagenseta.com.br',       phone: '(11) 91098-0008', website: 'embalagenseta.com.br',      city: 'Campinas',        status: 'contatado' },
  { company_name: 'Metalmec Peças',             email: 'vendas@metalmec.ind.br',         phone: '(19) 90987-0009', website: 'metalmec.ind.br',           city: 'Sorocaba',        status: 'sem_resposta' },
  { company_name: 'Vidros Theta Ltda',          email: 'comercial@vidrostheta.com.br',   phone: '(16) 89876-0010', website: 'vidrostheta.com.br',        city: 'Ribeirão Preto',  status: 'sem_resposta' },
  { company_name: 'Química Iota Indústria',     email: 'diretoria@quimica-iota.com.br', phone: '(11) 88765-0011', website: 'quimica-iota.com.br',       city: 'Santo André',     status: 'interessado' },
  { company_name: 'Automação Kappa',            email: 'projetos@automacao-kappa.com',   phone: '(11) 87654-0012', website: 'automacao-kappa.com',       city: 'São Bernardo',    status: 'interessado' },
  { company_name: 'Agro Lambda Exportações',    email: 'export@agrolambda.com.br',       phone: '(67) 86543-0013', website: 'agrolambda.com.br',         city: 'Campo Grande',    status: 'interessado' },
  { company_name: 'Papel & Gráfica Mu',         email: 'orcamentos@papelmu.com.br',      phone: '(11) 85432-0014', website: 'papelmu.com.br',            city: 'São Paulo',       status: 'negociacao' },
  { company_name: 'Textil Nu Confecções',       email: 'comercial@textilnu.com.br',      phone: '(44) 84321-0015', website: 'textilnu.com.br',           city: 'Maringá',         status: 'negociacao' },
  { company_name: 'Eletrônica Xi Distribui',    email: 'vendas@eletronicaxi.com.br',     phone: '(11) 83210-0016', website: 'eletronicaxi.com.br',       city: 'São Paulo',       status: 'responder_depois' },
  { company_name: 'Alimentos Omicron Ltda',     email: 'diretoria@alim-omicron.com.br',  phone: '(71) 82109-0017', website: 'alim-omicron.com.br',       city: 'Salvador',        status: 'sem_interesse' },
  { company_name: 'Móveis Pi Design',           email: 'showroom@moveispi.com.br',       phone: '(48) 81098-0018', website: 'moveispi.com.br',           city: 'Joinville',       status: 'sem_interesse' },
  { company_name: 'Saúde Rho Clínicas',         email: 'parceiros@sauderho.com.br',      phone: '(11) 80987-0019', website: 'sauderho.com.br',           city: 'São Paulo',       status: 'convertido_email' },
  { company_name: 'Sigma Tecnologia Ltda',      email: 'cto@sigmatech.com.br',           phone: '(11) 79876-0020', website: 'sigmatech.com.br',          city: 'São Paulo',       status: 'convertido_telefonia' },
]

const CALLS_DATA = [
  {
    companyIndex: 5, // Atacado Zeta (contatado)
    status: 'completed',
    duration_seconds: 312,
    notes: 'Apresentei a proposta, mostraram interesse moderado.',
    analysis: {
      summary: 'Conversa com o comprador da Atacado Zeta. Empresa em fase de expansão procurando novos fornecedores para reduzir custos logísticos. Interesse moderado na solução, mas precisa de aprovação do gestor financeiro antes de avançar.',
      key_points: ['Empresa expandindo para 3 novas filiais até o fim do ano', 'Orçamento atual comprometido até Q3', 'Decisor principal é o gestor financeiro (José Alves)', 'Interesse em integração com ERP já utilizado (TOTVS)'],
      objections: ['Custo acima do esperado', 'Prazo de implementação muito longo', 'Já testou concorrente similar sem sucesso'],
      conversion_strategies: [
        'Agendar reunião com o gestor financeiro José Alves — ele é o decisor real. Ofereça uma demonstração focada em ROI e redução de custos operacionais com números concretos.',
        'Preparar proposta escalonável: mostrar versão básica com menor investimento inicial para destravar a aprovação no Q3. A expansão para funcionalidades completas vira receita recorrente no Q4.',
        'Caso de uso de integração TOTVS: levantar um cliente similar que já usa a integração e apresentar como prova social. Reduz o risco percebido pelo decisor técnico.',
      ],
      suggested_status: 'interessado',
      suggested_followup_days: 5,
      suggested_followup_notes: 'Ligar para o José Alves (gestor financeiro) e apresentar proposta com foco em ROI.',
    },
  },
  {
    companyIndex: 10, // Química Iota (interessado)
    status: 'completed',
    duration_seconds: 487,
    notes: 'Segunda ligação. Cliente muito receptivo, quer avançar.',
    analysis: {
      summary: 'Segunda conversa com a Química Iota. Diretor comercial confirmou interesse e pediu proposta formal com SLA e termos de contrato. Empresa em processo de digitalização e vê a solução como estratégica.',
      key_points: ['Diretor comercial Carlos Mendes confirmou interesse', 'Processo de digitalização em andamento — projeto prioritário', 'Precisam de proposta formal com SLA até sexta-feira', 'Concorrente B2B Corp também cotando — prazo apertado'],
      objections: ['Prazo de entrega da proposta (pediu em 3 dias)', 'Cláusula de fidelidade longa demais'],
      conversion_strategies: [
        'Entregar proposta até quinta-feira — o cliente tem urgência real e o concorrente está cotando. Atraso perde o negócio.',
        'Propor contrato de 12 meses em vez de 24 para eliminar a objeção de fidelidade. A renovação pode ser negociada com desconto de fidelidade ao fim do primeiro ano.',
        'Incluir SLA detalhado com penalidades claras — demonstra confiança na operação e diferencia da concorrência que geralmente não oferece garantias formais.',
      ],
      suggested_status: 'negociacao',
      suggested_followup_days: 3,
      suggested_followup_notes: 'Enviar proposta formal com SLA e contrato de 12 meses para Carlos Mendes.',
    },
  },
  {
    companyIndex: 1, // Construções Beta (novo)
    status: 'no-answer',
    duration_seconds: null,
    notes: null,
    analysis: null,
  },
  {
    companyIndex: 8, // Metalmec (sem_resposta)
    status: 'completed',
    duration_seconds: 95,
    notes: 'Consegui contato rápido. Interesse baixo, pediu para ligar em outro momento.',
    analysis: {
      summary: 'Conversa curta com a Metalmec. Gerente de compras não tinha tempo disponível mas demonstrou abertura para uma nova conversa no próximo mês após fechamento do trimestre.',
      key_points: ['Gerente de compras disponível apenas após fechamento de trimestre (fim do mês)', 'Empresa passando por troca de fornecedor principal', 'Orçamento de TI liberado apenas no próximo ciclo'],
      objections: ['Momento ruim — fechamento de trimestre', 'Sem orçamento disponível agora'],
      conversion_strategies: [
        'Reagendar para a primeira semana do próximo mês — o timing é o único bloqueio. Marcar um horário fixo agora enquanto o contato ainda lembra da conversa.',
        'Enviar email com material de apoio resumido (1 página) antes da próxima ligação para manter a marca presente durante o período de fechamento.',
      ],
      suggested_status: 'responder_depois',
      suggested_followup_days: 30,
      suggested_followup_notes: 'Ligar novamente após fechamento do trimestre — gerente pediu contato no início do próximo mês.',
    },
  },
  {
    companyIndex: 13, // Papel & Gráfica Mu (negociacao)
    status: 'completed',
    duration_seconds: 623,
    notes: 'Negociação avançada. Discutimos valores e condições de pagamento.',
    analysis: {
      summary: 'Ligação de negociação com a Papel & Gráfica Mu. Diretor financeiro apresentou contraproposta com desconto de 15%. Cliente comprometido em fechar ainda este mês se condições forem ajustadas. Decisão final na próxima semana.',
      key_points: ['Diretor financeiro pediu desconto de 15% no plano anual', 'Pagamento preferido: boleto parcelado em 3x', 'Prazo para decisão: até próxima sexta-feira', 'Usuários confirmados: 8 pessoas no time comercial'],
      objections: ['Preço acima do budget aprovado em 15%', 'Preferência por pagamento parcelado'],
      conversion_strategies: [
        'Oferecer 10% de desconto (não os 15%) com parcelamento em 3x sem juros — atende as duas objeções sem comprometer margem. Deixar claro que é condição especial por fechamento no mês.',
        'Criar urgência legítima: informar que o preço atual é válido apenas até o final do mês e que o reajuste de tabela está programado. Isso é real e justifica a decisão rápida.',
        'Escalar o fechamento: propor uma reunião rápida de 30 min com a equipe comercial deles para apresentar o onboarding — aumenta comprometimento e diminui o risco de desistência de última hora.',
      ],
      suggested_status: 'negociacao',
      suggested_followup_days: 2,
      suggested_followup_notes: 'Enviar proposta revisada com desconto de 10% e parcelamento 3x. Confirmar reunião de fechamento.',
    },
  },
]

const FOLLOWUPS_DATA = [
  { companyIndex: 5,  title: 'Ligar para gestor financeiro José Alves',         notes: 'Apresentar proposta com foco em ROI e redução de custos logísticos.',       daysFromNow: 2 },
  { companyIndex: 10, title: 'Enviar proposta formal com SLA',                   notes: 'Incluir contrato de 12 meses e penalidades. Carlos Mendes aguarda até sexta.', daysFromNow: -1 }, // overdue
  { companyIndex: 8,  title: 'Retornar contato com Metalmec após fechamento Q',  notes: 'Gerente de compras pediu contato no início do próximo mês.',                   daysFromNow: 28 },
  { companyIndex: 13, title: 'Confirmar fechamento com Papel & Gráfica Mu',      notes: 'Enviar proposta revisada com desconto 10% + parcelamento 3x.',                 daysFromNow: 1 },
  { companyIndex: 11, title: 'Follow-up inicial com Automação Kappa',            notes: 'Primeiro contato pós-apresentação. Verificar interesse em demonstração.',      daysFromNow: 5 },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function fakeSid(prefix: string): string {
  return `${prefix}${Math.random().toString(36).substring(2, 34).toUpperCase()}`
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Find user
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) throw userError

  const user = users.find((u) => u.email === emailArg)
  if (!user) {
    console.error(`❌  Usuário com email "${emailArg}" não encontrado.`)
    process.exit(1)
  }
  console.log(`✅  Usuário encontrado: ${user.email} (${user.id})`)

  // 2. Reset/delete seed data if requested
  if (shouldReset || deleteOnly) {
    console.log('🗑️   Removendo dados de seed anteriores...')
    await supabase.from('followups').delete().eq('user_id', user.id).eq('type', SEED_SOURCE)
    const { data: seedLeads } = await supabase.from('leads').select('id').eq('user_id', user.id).eq('source', SEED_SOURCE)
    if (seedLeads?.length) {
      const seedLeadIds = seedLeads.map((l) => l.id)
      const { data: seedCalls } = await supabase.from('calls').select('id').eq('user_id', user.id).in('lead_id', seedLeadIds)
      if (seedCalls?.length) {
        await supabase.from('call_analyses').delete().in('call_id', seedCalls.map((c) => c.id))
        await supabase.from('calls').delete().in('id', seedCalls.map((c) => c.id))
      }
      await supabase.from('leads').delete().eq('user_id', user.id).eq('source', SEED_SOURCE)
    }
    console.log('✅  Dados removidos.')
    if (deleteOnly) return
  }

  // 3. Insert leads
  console.log('📋  Inserindo leads...')
  const { data: insertedLeads, error: leadsError } = await supabase
    .from('leads')
    .insert(
      COMPANIES.map((c) => ({
        user_id: user.id,
        source: SEED_SOURCE,
        company_name: c.company_name,
        email: c.email,
        phone: c.phone,
        website: c.website,
        city: c.city,
        status: c.status,
        created_at: daysAgo(Math.floor(Math.random() * 30) + 1),
      }))
    )
    .select('id, company_name')

  if (leadsError) throw leadsError
  console.log(`✅  ${insertedLeads!.length} leads inseridos.`)

  // 4. Insert calls + analyses
  console.log('📞  Inserindo ligações...')
  let callsCount = 0
  let analysesCount = 0

  for (const callData of CALLS_DATA) {
    const lead = insertedLeads![callData.companyIndex]
    if (!lead) continue

    const callId = crypto.randomUUID()
    const endedAt = daysAgo(Math.floor(Math.random() * 14) + 1)

    const { error: callError } = await supabase.from('calls').insert({
      id: callId,
      user_id: user.id,
      lead_id: lead.id,
      call_sid: fakeSid('CA'),
      to_number: COMPANIES[callData.companyIndex].phone,
      from_number: '+551140028922',
      direction: 'outbound',
      status: callData.status,
      duration_seconds: callData.duration_seconds,
      ended_at: endedAt,
      notes: callData.notes,
      created_at: endedAt,
    })
    if (callError) { console.error('Erro ao inserir call:', callError.message); continue }
    callsCount++

    if (callData.analysis) {
      const a = callData.analysis
      const { error: analysisError } = await supabase.from('call_analyses').insert({
        call_id: callId,
        user_id: user.id,
        status: 'completed',
        summary: a.summary,
        key_points: a.key_points,
        objections: a.objections,
        conversion_strategies: a.conversion_strategies,
        suggested_status: a.suggested_status,
        suggested_followup_days: a.suggested_followup_days,
        suggested_followup_notes: a.suggested_followup_notes,
        ai_model: 'seed',
        processing_completed_at: endedAt,
        credits_used: 1,
        created_at: endedAt,
      })
      if (analysisError) { console.error('Erro ao inserir análise:', analysisError.message); continue }
      analysesCount++
    }
  }
  console.log(`✅  ${callsCount} ligações e ${analysesCount} análises inseridas.`)

  // 5. Insert followups
  console.log('📅  Inserindo acompanhamentos...')
  const { data: insertedFollowups, error: followupsError } = await supabase
    .from('followups')
    .insert(
      FOLLOWUPS_DATA.map((f) => ({
        user_id: user.id,
        lead_id: insertedLeads![f.companyIndex]?.id ?? null,
        title: f.title,
        notes: f.notes,
        due_at: daysFromNow(f.daysFromNow),
        status: 'pending',
        type: SEED_SOURCE,
      }))
    )
    .select('id')

  if (followupsError) throw followupsError
  console.log(`✅  ${insertedFollowups!.length} acompanhamentos inseridos.`)

  console.log('\n🌱  Seed concluído!')
  console.log(`   Leads: ${insertedLeads!.length}`)
  console.log(`   Ligações: ${callsCount} (${analysesCount} com análise)`)
  console.log(`   Acompanhamentos: ${insertedFollowups!.length}`)
  console.log(`\n   Para remover estes dados: npm run seed -- --email ${emailArg} --reset`)
}

main().catch((err) => {
  console.error('❌  Erro:', err.message ?? err)
  process.exit(1)
})
