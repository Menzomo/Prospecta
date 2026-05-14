# Supabase Infrastructure

Infraestrutura base do Supabase para Next.js App Router usando `@supabase/ssr`.

## Arquivos

- `client.ts` - Cliente para uso no browser (Client Components)
- `server.ts` - Cliente para uso no servidor (Server Components, API Routes)
- `middleware.ts` - Middleware helper para atualizar sessões de auth
- `types.ts` - Tipos TypeScript do banco de dados
- `index.ts` - Exports organizados

## Uso

### Client Components

```ts
'use client'

import { createBrowserClient } from '@/lib/supabase'

export default function MyComponent() {
  const supabase = createBrowserClient()

  // Use o cliente...
}
```

### Server Components

```ts
import { createServerClient } from '@/lib/supabase'

export default async function MyServerComponent() {
  const supabase = createServerClient()

  // Use o cliente...
}
```

### API Routes

```ts
import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()

  // Use o cliente...
}
```

### Middleware

O middleware na raiz do projeto já está configurado para usar `updateSession`.

## Variáveis de Ambiente

Certifique-se de ter no `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

## Próximos Passos

1. Gerar tipos do banco de dados com `supabase gen types typescript`
2. Implementar autenticação completa
3. Criar repositórios e serviços