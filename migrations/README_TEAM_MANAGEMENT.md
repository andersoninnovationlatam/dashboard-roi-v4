# Gestão de Equipe - Configuração

Este documento descreve como configurar a funcionalidade de gestão de membros da equipe.

## 1. Executar Migration SQL

Execute o arquivo `migrations/add_team_management_rls.sql` no SQL Editor do Supabase para adicionar as políticas RLS necessárias:

```sql
-- Execute o conteúdo de migrations/add_team_management_rls.sql
```

Esta migration adiciona políticas que permitem que:
- Admins e Managers vejam todos os membros da mesma organização
- Admins e Managers atualizem funções de membros
- Admins e Managers adicionem novos membros à organização

## 2. Configurar Resend para Envio de E-mails

### 2.1. Instalar Dependência

```bash
npm install @resend/node
```

### 2.2. Obter API Key do Resend

1. Acesse [resend.com](https://resend.com) e crie uma conta
2. Vá em **API Keys** e crie uma nova chave
3. Copie a chave gerada

### 2.3. Configurar Variáveis de Ambiente

No Vercel (ou seu ambiente de deploy):

**Variáveis de Ambiente Necessárias:**
- `RESEND_API_KEY`: Sua API key do Resend
- `RESEND_FROM_EMAIL`: E-mail remetente (ex: `ROI Analytics <noreply@seudominio.com>`)
- `APP_URL`: URL da sua aplicação (ex: `https://seu-app.vercel.app`)

**No Vercel:**
1. Vá em **Settings** > **Environment Variables**
2. Adicione as variáveis acima

**Localmente (.env):**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=ROI Analytics <noreply@seudominio.com>
APP_URL=http://localhost:3000
```

### 2.4. Verificar Domínio no Resend (Produção)

Para enviar e-mails em produção, você precisa verificar seu domínio no Resend:
1. Acesse **Domains** no dashboard do Resend
2. Adicione seu domínio
3. Configure os registros DNS conforme instruções
4. Aguarde a verificação

## 3. Estrutura da Funcionalidade

### 3.1. Página de Gestão

A página `pages/TeamManagement.tsx` permite:
- **Listar membros** da organização atual
- **Adicionar novos membros** (apenas admins/managers)
- **Atualizar funções** de membros existentes
- **Enviar e-mails** automaticamente ao adicionar/atualizar

### 3.2. API Route

A rota `api/send-email.ts` (Vercel Serverless Function) envia e-mails via Resend:
- **Tipo `welcome`**: E-mail de boas-vindas para novos membros
- **Tipo `role_change`**: E-mail de notificação de mudança de função

### 3.3. Fluxo de Adição de Membro

1. Admin/Manager adiciona e-mail e função
2. Sistema verifica se usuário já existe:
   - **Se não existe**: Cria perfil e envia e-mail de boas-vindas
   - **Se existe na mesma org**: Atualiza função e envia e-mail de troca de função
   - **Se existe em outra org**: Move para organização atual e envia e-mail de boas-vindas
3. E-mail é enviado via API route `/api/send-email`

## 4. Permissões

- **Admin**: Pode ver, adicionar e atualizar todos os membros da organização
- **Manager**: Pode ver, adicionar e atualizar todos os membros da organização
- **Analyst/Viewer**: Apenas visualizam seu próprio perfil

## 5. Troubleshooting

### E-mails não estão sendo enviados

1. Verifique se `RESEND_API_KEY` está configurada corretamente
2. Verifique os logs da função serverless no Vercel
3. Confirme que o domínio está verificado no Resend (produção)
4. Verifique se `RESEND_FROM_EMAIL` está no formato correto

### Erro de permissão ao listar membros

1. Execute a migration SQL `add_team_management_rls.sql`
2. Verifique se o usuário tem role `admin` ou `manager`
3. Verifique se o `organization_id` está correto no perfil do usuário

### Erro ao adicionar membro

1. Verifique se as políticas RLS foram aplicadas corretamente
2. Confirme que o usuário atual tem permissão (admin/manager)
3. Verifique se o e-mail não está duplicado em `auth.users`

## 6. Notas Importantes

- A funcionalidade cria perfis em `user_profiles` mesmo sem `auth.users` (para convites)
- Quando o usuário se cadastra, o trigger `handle_new_user` cria o perfil automaticamente
- E-mails são enviados de forma assíncrona e não bloqueiam a operação
- Se o envio de e-mail falhar, a operação ainda é concluída (com aviso)
