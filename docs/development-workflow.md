# Development Workflow — Prospecta

## Branches

| Branch    | Papel                            | Deploy               |
|-----------|----------------------------------|----------------------|
| `main`    | Produção — usuários beta         | Vercel Production    |
| `develop` | Desenvolvimento / homologação    | Vercel Preview       |

**Regra fundamental:** nenhum código vai direto para `main`. Tudo passa por `develop` primeiro.

---

## Fluxo oficial

```
develop
  ↓
Claude implementa
  ↓
Bruno testa (Preview URL da develop)
  ↓
ajustes se necessário
  ↓
aprovado por Bruno
  ↓
merge develop → main
  ↓
deploy automático em produção
```

---

## Papéis do time

| Quem    | Responsabilidade                        |
|---------|-----------------------------------------|
| Bruno   | Produto e validação                     |
| ChatGPT | Arquitetura e estratégia                |
| Claude  | Implementação                           |
| Copilot | Assistência IDE                         |

---

## Como trabalhar na develop

```bash
# Garantir que está na develop e atualizada
git checkout develop
git pull origin develop

# Implementar, commitar normalmente
git add <arquivos>
git commit -m "feat: ..."
git push origin develop
```

A Vercel gera um Preview Deploy automaticamente a cada push na `develop`. A URL aparece no dashboard da Vercel e nos checks do GitHub PR.

---

## Como promover para produção

Após validação na develop:

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

A Vercel detecta o push na `main` e faz o deploy de produção automaticamente.

---

## Vercel — configuração esperada

- **Production Branch:** `main`
- **Preview Deployments:** todas as outras branches, incluindo `develop`
- **URL de homologação:** `https://prospecta-git-develop-bruno-menzomo-s-projects.vercel.app`

Para confirmar ou ajustar: Vercel Dashboard → Project → Settings → Git.

---

## Preview Deploy — configuração do Supabase (passo manual obrigatório)

O Supabase só redireciona para URLs explicitamente autorizadas. Sem isso, o login OAuth no Preview redireciona para produção.

### O que configurar

**Supabase Dashboard → Authentication → URL Configuration**

1. **Site URL** — manter como produção:
   ```
   https://prospecta-ten.vercel.app
   ```

2. **Redirect URLs** — adicionar as entradas abaixo (se não existirem):
   ```
   https://prospecta-ten.vercel.app/**
   https://prospecta-git-develop-bruno-menzomo-s-projects.vercel.app/**
   https://*.vercel.app/**
   http://localhost:3000/**
   ```
   
   O padrão `https://*.vercel.app/**` cobre todos os deploys de preview futuros automaticamente.

### Por que isso é necessário

Quando o usuário faz login com Google no Preview Deploy, o botão envia:
```
redirectTo: https://prospecta-git-develop-bruno-menzomo-s-projects.vercel.app/auth/callback
```

Se essa URL não está na whitelist do Supabase, ele ignora o parâmetro e redireciona para o **Site URL** (produção). O código em si já está correto — o `redirectTo` é gerado dinamicamente a partir de `window.location.origin`.

### Gmail OAuth no preview (GOOGLE_REDIRECT_URI)

Para conectar Gmail no preview deploy, é necessário:
1. Adicionar `https://prospecta-git-develop-bruno-menzomo-s-projects.vercel.app/api/gmail/callback` como URI autorizada no [Google Cloud Console](https://console.cloud.google.com) → Credenciais → OAuth 2.0
2. Adicionar a variável de ambiente no Vercel para o preview:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - `GOOGLE_REDIRECT_URI` = `https://prospecta-git-develop-bruno-menzomo-s-projects.vercel.app/api/gmail/callback`
   - Marcar apenas o ambiente **Preview**

---

## Regras do fluxo

- Nunca commitar diretamente na `main`
- A `develop` deve sempre refletir o que está sendo desenvolvido ou testado
- Um merge para `main` implica que Bruno validou a funcionalidade na Preview
- Correções de produção urgentes (hotfix) também passam pela `develop` primeiro, exceto se o impacto justificar exceção — decisão de Bruno
