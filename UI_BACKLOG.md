# UI/UX Backlog — Prospecta

Itens do design Stitch que foram adiados para implementação futura.
Nenhum destes requer alteração de banco de dados — são puramente front-end/UX,
mas podem precisar de novas queries ou endpoints quando implementados.

---

## Dashboard

### DateRangeFilter (Hoje / 7 dias / 30 dias)
- **Componente:** `src/features/dashboard/components/DateRangeFilter.tsx`
- **Status:** componente criado (visual apenas), removido do dashboard até ter lógica real
- **O que falta:** passar o intervalo selecionado para `getDashboardData` e filtrar KPIs, replies e followups por período
- **Observação:** o `dashboardService` precisa aceitar um `dateRange` param e aplicar filtros nas queries

### KPI Cards — Tendências e Deltas
- **Componente:** `src/features/dashboard/components/KpiCard.tsx` (suporta `badge` e `progress`)
- **Status:** estrutura de badge/progress pronta, mas sem dados de comparação de período anterior
- **O que falta:** calcular variação % em relação ao período anterior (ex: +12% vs semana passada)
- **Dependência:** DateRangeFilter funcional

### ProspectingFunnel — Funil de Prospecção
- **Status:** não criado
- **Descrição:** visualização do funil com quantidade de leads por status (Novo → Contatado → Interessado → Negociação → Convertido)
- **Dados necessários:** contagem de leads agrupados por `status` — query nova simples no `dashboardService`
- **UI:** barras horizontais ou steps visuais com percentual de conversão entre etapas

### NichoPerformance — Performance por Nicho
- **Status:** não criado
- **Descrição:** lista ou mini-gráfico mostrando quais categorias têm melhor taxa de resposta
- **Dados necessários:** cruzamento de leads por `category_id` com emails enviados/respostas — query de agregação nova
- **UI:** tabela simples ou lista ranqueada (nicho · leads · taxa de resposta)

---

## Topbar / Navegação

### Busca Global — Outras Entidades
- **Componente:** `src/components/layout/Topbar.tsx` (busca de leads implementada)
- **Status:** busca de leads por nome implementada e funcional
- **O que falta:** expandir sugestões para templates (por nome) e followups (por empresa)
- **Observação:** `suggestLeadNames` em `src/features/search/suggestActions.ts` pode ser expandido

### Notificações (Sino)
- **Componente:** botão bell no `Topbar.tsx`
- **Status:** visual apenas, sem funcionalidade
- **O que falta:** definir o modelo de notificações (followups vencidos? novas respostas?), criar tabela ou usar dados existentes, exibir dropdown com lista

---

## Inbox
- **Rota:** `/inbox` — redireciona para `/dashboard` atualmente
- **Código:** `src/features/inbox/`, `src/repositories/emailRepository.ts` (função `getInboundMessagesWithLeads`) intactos
- **Página:** `src/app/(app)/inbox/page.tsx` — substituída por redirect
- **Status:** funcionalidade oculta da UI e rota protegida por redirect
- **O que falta para reativar:**
  1. Restaurar conteúdo de `inbox/page.tsx` (código original preservado no git: commit antes de `5b04830`)
  2. Re-adicionar item `Inbox` em `NAV_ITEMS` no `src/components/layout/Sidebar.tsx`
  3. Remover o redirect

---

## Aparência / Settings

### Dark Mode
- **Rota:** `/settings?section=aparencia`
- **Status:** placeholder visual criado ("Personalização visual em breve"), toggle desativado
- **O que falta:** adicionar classe `dark` no `<html>`, criar variantes dark dos tokens em `globals.css` via `@theme`, persistir preferência (localStorage ou coluna na tabela `profiles`)

---

## Leads

### Busca Global no Topbar — Scroll para resultado
- **Status:** ao selecionar sugestão navega para `/leads?search=nome` — funcional
- **Melhoria futura:** highlight do termo buscado nos cards de resultado

### Paginação de Leads — Infinite Scroll
- **Componente:** `src/features/leads/components/LeadsGrid.tsx`
- **Status:** "Ver mais" client-side implementado (PAGE_SIZE=12)
- **Melhoria:** substituir por scroll infinito com `IntersectionObserver` para UX mais fluida

---

## Notas

- Todos os componentes visuais acima estão em `src/features/dashboard/components/`
- O design de referência está em `DESIGN.md` (Stitch Design System)
- Nenhuma das implementações acima deve alterar migrations, repositories existentes ou fluxos de Gmail/followup sem aprovação explícita
