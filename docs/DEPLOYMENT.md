# Deployment Guide - ROI Analytics Pro

## Visão Geral

Este guia descreve o processo de deploy da aplicação ROI Analytics Pro, incluindo configuração de variáveis de ambiente, build de produção, e deploy no Supabase e outras plataformas.

## Pré-requisitos

- Conta no Supabase com projeto criado
- Conta no serviço de hospedagem (Vercel, Netlify, etc.)
- API Key do Google Gemini (para features de IA)
- API Key do Resend (para emails, se usar Edge Function)

## Configuração do Supabase

### 1. Criar Projeto

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto
3. Anote a URL e anon key (Settings > API)

### 2. Executar Migrations

Execute as migrations na ordem:

1. **Tabelas base** (criar manualmente ou via SQL Editor):
   - `organizations`
   - `user_profiles`
   - `projects`
   - `indicators`

2. **Migrations** (em `/migrations/`):
   ```sql
   -- Execute cada arquivo no SQL Editor do Supabase
   -- 1. create_ai_prompts_table.sql
   -- 2. add_team_management_rls.sql
   -- 3. add_indicators_cleanup.sql
   -- 4. fix_ai_prompts_rls.sql
   -- 5. update_ai_prompts_admin_only.sql
   ```

### 3. Configurar Edge Functions

**Deploy de Edge Functions**:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref your-project-ref

# Deploy de função
supabase functions deploy send-welcome-email
supabase functions deploy cleanup-indicators
```

**Variáveis de Ambiente (Edge Functions)**:

No Supabase Dashboard > Edge Functions > Settings:

```
RESEND_API_KEY=your-resend-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Configurar RLS Policies

As policies são criadas automaticamente pelas migrations. Verifique em:
- Supabase Dashboard > Authentication > Policies

## Build de Produção

### 1. Configurar Variáveis de Ambiente

Crie arquivo `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

**Importante**: 
- Variáveis devem começar com `VITE_` para serem expostas no frontend
- `GEMINI_API_KEY` é injetada via `vite.config.ts` como `process.env.API_KEY`

### 2. Build

```bash
npm run build
```

**Output**: Pasta `dist/` com arquivos otimizados.

**Estrutura do build**:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

### 3. Verificar Build Localmente

```bash
npm run preview
```

Acesse `http://localhost:4173` para testar o build.

## Deploy no Vercel

### 1. Preparação

1. Instale Vercel CLI:
```bash
npm install -g vercel
```

2. Login:
```bash
vercel login
```

### 2. Deploy

**Primeiro deploy**:
```bash
vercel
```

Siga as instruções:
- Link to existing project? `N`
- Project name: `dashboard-roi-v4`
- Directory: `.`
- Override settings? `N`

**Deploys subsequentes**:
```bash
vercel --prod
```

### 3. Configurar Variáveis de Ambiente

No Vercel Dashboard > Project > Settings > Environment Variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

**Importante**: 
- Adicione para todos os ambientes (Production, Preview, Development)
- Após adicionar, faça novo deploy

### 4. Configurar Domínio (Opcional)

No Vercel Dashboard > Project > Settings > Domains:
- Adicione domínio customizado
- Configure DNS conforme instruções

## Deploy no Netlify

### 1. Preparação

1. Instale Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login:
```bash
netlify login
```

### 2. Deploy

**Primeiro deploy**:
```bash
netlify deploy --prod
```

**Deploys subsequentes**:
```bash
netlify deploy --prod --dir=dist
```

### 3. Configurar Variáveis de Ambiente

No Netlify Dashboard > Site Settings > Build & Deploy > Environment:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Configurar Build Settings

No Netlify Dashboard > Site Settings > Build & Deploy > Build:

- **Build command**: `npm run build`
- **Publish directory**: `dist`

## Deploy Manual (Servidor Próprio)

### 1. Build

```bash
npm run build
```

### 2. Upload

Faça upload da pasta `dist/` para o servidor.

### 3. Configurar Servidor Web

**Nginx**:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Apache**:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/dist

    <Directory /path/to/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Rewrite para SPA
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

### 4. Configurar Variáveis de Ambiente

Como o build é estático, variáveis devem ser injetadas no build ou via script:

**Opção 1**: Build com variáveis:
```bash
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build
```

**Opção 2**: Script de substituição (criar `inject-env.js`):
```javascript
// Substitui placeholders no HTML após build
const fs = require('fs');
const html = fs.readFileSync('dist/index.html', 'utf8');
const replaced = html
  .replace('%VITE_SUPABASE_URL%', process.env.VITE_SUPABASE_URL)
  .replace('%VITE_SUPABASE_ANON_KEY%', process.env.VITE_SUPABASE_ANON_KEY);
fs.writeFileSync('dist/index.html', replaced);
```

## Configuração de Edge Functions

### send-welcome-email

**Variáveis necessárias**:
- `RESEND_API_KEY`: Chave da API Resend
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

**Deploy**:
```bash
supabase functions deploy send-welcome-email
```

**Teste**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-welcome-email \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "type": "welcome",
    "organizationName": "Test Org",
    "fullName": "Test User",
    "password": "temp-password"
  }'
```

### cleanup-indicators

**Variáveis necessárias**:
- `DATABASE_URL`: URL do banco (interno do Supabase)
- `SERVICE_ROLE_KEY`: Service role key

**Deploy**:
```bash
supabase functions deploy cleanup-indicators
```

**Agendamento**:
- Configure cron job no Supabase Dashboard
- Ou use pg_cron (se disponível)

## Verificações Pós-Deploy

### Checklist

- [ ] Aplicação carrega sem erros
- [ ] Login funciona
- [ ] Criação de projeto funciona
- [ ] Cálculos de ROI funcionam
- [ ] Geração de insights de IA funciona
- [ ] Dark mode funciona
- [ ] Responsividade funciona
- [ ] Imprimir relatórios funciona
- [ ] Edge Functions respondem

### Testes

1. **Teste de autenticação**:
   - Criar conta
   - Login
   - Logout
   - Reset de senha

2. **Teste de funcionalidades**:
   - Criar projeto
   - Adicionar indicadores
   - Verificar cálculos
   - Gerar insights

3. **Teste de performance**:
   - Tempo de carregamento inicial
   - Tempo de navegação entre páginas
   - Tempo de cálculo de ROI

## Monitoramento

### Supabase Dashboard

- **Database**: Monitorar queries lentas
- **Auth**: Monitorar tentativas de login
- **Edge Functions**: Monitorar execuções e erros
- **Storage**: Monitorar uso (se usar)

### Vercel/Netlify Analytics

- **Page views**: Páginas mais acessadas
- **Performance**: Core Web Vitals
- **Errors**: Erros em produção

### Logs

**Frontend**:
- Console do navegador (erros JavaScript)
- Network tab (requisições falhando)

**Backend**:
- Supabase Dashboard > Logs
- Edge Functions logs

## Troubleshooting

### Erro: "Missing environment variables"

**Causa**: Variáveis não configuradas no ambiente de produção.

**Solução**:
1. Verificar variáveis no dashboard da plataforma
2. Fazer novo deploy após adicionar variáveis
3. Verificar se variáveis começam com `VITE_`

### Erro: "CORS policy"

**Causa**: Supabase não permite requisições do domínio.

**Solução**:
1. Adicionar domínio em Supabase Dashboard > Settings > API > CORS
2. Ou usar wildcard `*` (apenas desenvolvimento)

### Erro: "RLS policy violation"

**Causa**: Políticas RLS bloqueando acesso.

**Solução**:
1. Verificar políticas em Supabase Dashboard
2. Verificar se usuário tem role correto
3. Verificar se `organization_id` está correto

### Build falha

**Causa**: Erros de TypeScript ou dependências.

**Solução**:
1. Executar `npm run build` localmente
2. Verificar erros no console
3. Corrigir erros antes de deploy

## Rollback

### Vercel

```bash
vercel rollback [deployment-url]
```

Ou via Dashboard > Deployments > selecionar deployment anterior > Promote to Production

### Netlify

Via Dashboard > Deploys > selecionar deploy anterior > Publish deploy

### Manual

1. Fazer backup do build atual
2. Restaurar build anterior
3. Fazer deploy do build anterior

## Segurança

### Variáveis de Ambiente

- **Nunca** commitar `.env` no Git
- Usar secrets do serviço de hospedagem
- Rotacionar chaves periodicamente

### Supabase

- Usar `anon key` no frontend (seguro via RLS)
- Usar `service role key` apenas em Edge Functions
- Não expor `service role key` no frontend

### HTTPS

- Sempre usar HTTPS em produção
- Configurar certificado SSL (automático no Vercel/Netlify)

## Referências

- **Vercel Docs**: https://vercel.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs/guides/hosting
- **Vite Build**: https://vitejs.dev/guide/build.html
