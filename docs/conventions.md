# Convenções — Prospecta

## Naming

| Contexto              | Convenção   | Exemplo                        |
|-----------------------|-------------|--------------------------------|
| Variáveis e funções   | camelCase   | `leadStatus`, `getUserById`    |
| Componentes React     | PascalCase  | `LeadCard`, `TemplateForm`     |
| Types e Interfaces    | PascalCase  | `Lead`, `Template`, `UserProfile` |
| Rotas (URLs)          | kebab-case  | `/leads/[id]`, `/settings/company` |
| Banco de dados        | snake_case  | `lead_status`, `company_name`  |
| Arquivos de componente| PascalCase  | `LeadCard.tsx`                 |
| Arquivos de utilitário| camelCase   | `formatDate.ts`                |
| Arquivos de serviço   | camelCase   | `leadService.ts`               |
| Arquivos de repositório| camelCase  | `leadRepository.ts`            |

---

## Estrutura de Pastas

```
/src
  /app              → rotas Next.js (App Router)
  /components       → componentes UI reutilizáveis globais
  /features         → módulos por domínio
  /services         → regras de negócio
  /repositories     → acesso ao banco (Supabase)
  /integrations     → Gmail API, Apify
  /lib              → clientes e configurações (supabase, etc.)
  /types            → tipos TypeScript globais
  /validations      → schemas Zod
  /hooks            → hooks React globais
  /utils            → funções utilitárias globais
  /emails           → templates de email transacional
  /server           → lógica exclusiva do servidor
```

### Estrutura interna de uma feature

```
/features/leads
  /components       → componentes do domínio de leads
  /hooks            → hooks do domínio de leads
  /utils            → utilitários do domínio de leads
  /types            → tipos específicos do domínio (opcional)
```

---

## Services

Localização: `/services`

Responsabilidade:
- Regras de negócio
- Orquestração de operações
- Chamadas a integrações externas
- Não acessam banco diretamente (delegam ao Repository)

Exemplo:
```ts
// services/leadService.ts
export async function createLead(data: CreateLeadDto): Promise<Lead> { ... }
```

---

## Repositories

Localização: `/repositories`

Responsabilidade:
- Queries ao banco via Supabase
- Nenhuma regra de negócio
- Retornam dados brutos ou mapeados para tipos

Exemplo:
```ts
// repositories/leadRepository.ts
export async function findLeadById(id: string): Promise<Lead | null> { ... }
```

---

## Validações (Zod)

Localização: `/validations`

- Um arquivo por domínio
- Schemas usados tanto no frontend quanto no backend
- Status de leads validados via Zod (não ENUM no banco)

Exemplo:
```ts
// validations/leadSchema.ts
export const createLeadSchema = z.object({ ... })
```

---

## DTOs

- Objetos simples entre frontend, backend, services e repositories
- Sem lógica
- Tipados via TypeScript
- Validados via Zod nos pontos de entrada

---

## Error Handling

Padrão de erro na aplicação:

```ts
class AppError extends Error {
  code: string
  message: string
  status: number
}
```

- API Routes retornam JSON com `{ error: { code, message } }`
- Erros de integração (Gmail, Apify) são capturados e convertidos para AppError
- Nunca expor stack traces para o cliente

---

## API Routes

- Localização: `/app/api/...`
- Sempre validar o body com Zod antes de processar
- Sempre verificar autenticação antes de processar
- Retornar status HTTP adequado

---

## Supabase Client

- Client do lado do servidor: `@supabase/ssr` com cookies
- Client do lado do cliente: `@supabase/ssr` com browser client
- Nunca usar service role key no frontend

---

## Testes

Prioridade de cobertura:
1. OAuth Gmail (integração crítica)
2. Envio de email via Gmail API
3. Deduplicação de leads
4. Follow-up (alertas e controle)
5. Integrações com Apify

Framework: Vitest + Testing Library

---

## Regras Gerais

- Não usar `any` no TypeScript
- Não adicionar abstrações desnecessárias
- Não criar camadas além das definidas na arquitetura
- Não instalar dependências fora da stack oficial
- Manter arquivos pequenos e com responsabilidade única
- Preferir funções simples a classes quando possível
