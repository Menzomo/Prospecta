// Termos de Serviço e Responsabilidades do Cliente, exibidos no card de
// aceite antes da assinatura (SubscribeForm). TERMS_VERSION é gravado em
// profiles.terms_version junto com profiles.terms_accepted_at — qualquer
// mudança relevante no texto abaixo deve vir acompanhada de um bump nessa
// versão, pra manter o histórico de qual redação cada cliente aceitou.

export const TERMS_VERSION = '2026-09-07'

export type TermsSection = {
  title: string
  paragraphs: string[]
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Objeto do serviço',
    paragraphs: [
      'O Prospecta é uma plataforma de geração e gestão de leads B2B que combina automação de prospecção, enriquecimento de dados via inteligência artificial e otimização de rotas de visita comercial, integradas numa ferramenta de CRM para equipes de vendas. O serviço é fornecido por PROSPECTA INOVA SIMPLES (I.S.), CNPJ 68.741.993/0001-96, com sede na Rua Amélia Antônia Facchin Bado, 40, Cidade Nova, Caxias do Sul/RS, mediante plano de assinatura contratado.',
    ],
  },
  {
    title: '2. Responsabilidades do Cliente',
    paragraphs: [
      '2.1. Fornecer informações verdadeiras, completas e atualizadas no cadastro e na configuração da conta.',
      '2.2. Garantir que possui base legal e autorização adequadas para importar, sincronizar (incluindo via Gmail) ou processar dados de terceiros — contatos, leads e conteúdo de e-mail — na plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD) e demais legislações aplicáveis.',
      '2.3. Utilizar os leads e informações obtidas por meio do Prospecta exclusivamente para fins lícitos de prospecção comercial, respeitando normas de proteção de dados, anti-spam e concorrência leal.',
      '2.4. Validar as informações enriquecidas automaticamente antes de utilizá-las comercialmente, ciente de que dados gerados por IA podem conter imprecisões.',
      '2.5. Manter a confidencialidade das credenciais de acesso à conta e ser integralmente responsável por toda atividade realizada sob seu login.',
      '2.6. Manter o pagamento da assinatura em dia, ciente de que a cobrança é recorrente, processada via Asaas, e renovada automaticamente até cancelamento pelo próprio Cliente; em caso de atraso, a conta permanece ativa por até 7 dias corridos de carência a partir do vencimento, e passado esse prazo sem regularização o acesso é bloqueado automaticamente até a quitação.',
      '2.7. Não utilizar a plataforma para fins ilícitos, envio de spam em massa, coleta de dados sem consentimento, ou qualquer prática que viole direitos de terceiros.',
      '2.8. Comunicar à Prospecta qualquer uso indevido, vazamento de credenciais ou incidente de segurança relacionado à sua conta assim que identificado.',
      '2.9. Uso do número de telefone fornecido pela Prospecta: o número disponibilizado pela plataforma para realização de ligações destina-se exclusivamente a atividades de prospecção comercial, devendo ser utilizado dentro do horário comercial e em conformidade com a legislação aplicável (incluindo normas de proteção ao consumidor e regras de telemarketing/cobrança indevida). O Cliente é o único e exclusivo responsável — inclusive na esfera civil, criminal e administrativa — por qualquer uso indevido do número, tais como ligações fora do horário permitido, importunação, ameaça, fraude ou qualquer conduta ilícita praticada durante seu uso. A Prospecta apenas disponibiliza a infraestrutura técnica e não responde por atos praticados pelo Cliente através do número fornecido.',
    ],
  },
  {
    title: '3. Responsabilidades da Prospecta',
    paragraphs: [
      '3.1. Disponibilizar a plataforma com razoável nível de disponibilidade, ressalvadas manutenções programadas e eventos fora de nosso controle.',
      '3.2. Adotar medidas técnicas e organizacionais para proteger os dados processados na plataforma.',
      '3.3. Não comercializar, revender ou compartilhar os dados do Cliente com terceiros fora do escopo necessário à prestação do serviço (ex.: provedores de infraestrutura, automação de enriquecimento de leads e telefonia utilizados internamente pela plataforma).',
      '3.4. Notificar o Cliente sobre mudanças relevantes na plataforma, nestes termos ou na política de cobrança.',
    ],
  },
  {
    title: '4. Limitação de responsabilidade',
    paragraphs: [
      'A Prospecta não se responsabiliza por: (i) veracidade final dos dados de leads enriquecidos automaticamente, cuja validação é de responsabilidade do Cliente antes do uso comercial; (ii) resultados comerciais obtidos a partir do uso da plataforma; (iii) uso indevido feito pelo Cliente das informações e ferramentas disponibilizadas; (iv) indisponibilidades decorrentes de serviços de terceiros integrados (ex.: Google/Gmail, Asaas, provedores de telefonia); (v) qualquer conduta ilícita, cível ou criminal praticada pelo Cliente por meio do número de telefone disponibilizado pela plataforma, sendo a responsabilidade integral e exclusiva do Cliente perante terceiros e autoridades.',
    ],
  },
  {
    title: '5. Cobrança, cancelamento e reembolso',
    paragraphs: [
      '5.1. A assinatura é cobrada de forma recorrente no cartão de crédito cadastrado (ou via Pix), podendo ser cancelada a qualquer momento pelo próprio Cliente, diretamente no painel (self-service).',
      '5.2. Ao cancelar, se o cancelamento ocorrer em até 7 dias corridos contados da data do pagamento da mensalidade vigente, o valor é reembolsado automaticamente; após esse prazo, não há reembolso da mensalidade já paga, mas o acesso permanece disponível até o fim do período contratado.',
      '5.3. Em caso de inadimplência, aplica-se a carência descrita no item 2.6 antes do bloqueio de acesso.',
      '5.4. O cancelamento não exclui os dados da conta automaticamente; ele apenas suspende a cobrança e o acesso, conforme fluxo de encerramento de conta disponível nas configurações.',
    ],
  },
  {
    title: '6. Alterações nos termos',
    paragraphs: [
      'Estes termos podem ser atualizados periodicamente. Alterações relevantes serão comunicadas ao Cliente, e o uso continuado da plataforma após a atualização representa aceite dos novos termos.',
    ],
  },
  {
    title: '7. Foro',
    paragraphs: [
      'Fica eleito o foro da comarca de Caxias do Sul/RS para dirimir quaisquer controvérsias oriundas destes termos.',
    ],
  },
]
