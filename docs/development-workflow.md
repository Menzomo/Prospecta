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
- **URL de homologação:** gerada automaticamente pela Vercel no formato  
  `prospecta-git-develop-<team>.vercel.app` (verificar no dashboard da Vercel)

Para confirmar ou ajustar: Vercel Dashboard → Project → Settings → Git.

---

## Regras do fluxo

- Nunca commitar diretamente na `main`
- A `develop` deve sempre refletir o que está sendo desenvolvido ou testado
- Um merge para `main` implica que Bruno validou a funcionalidade na Preview
- Correções de produção urgentes (hotfix) também passam pela `develop` primeiro, exceto se o impacto justificar exceção — decisão de Bruno
