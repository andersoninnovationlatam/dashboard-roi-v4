# Development Guide - ROI Analytics Pro

## Setup do Ambiente

### Pré-requisitos

- **Node.js**: 18.x ou superior
- **npm**: 9.x ou superior (ou yarn/pnpm)
- **Git**: Para controle de versão
- **Conta Supabase**: Para backend e banco de dados
- **Conta Google Cloud**: Para API do Gemini (opcional, para features de IA)

### Instalação

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd dashboard-roi-v4
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure variáveis de ambiente**:

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

**Onde encontrar**:
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard > Settings > API
- `GEMINI_API_KEY`: Google Cloud Console > APIs & Services > Credentials

4. **Inicie o servidor de desenvolvimento**:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## Scripts Disponíveis

### `npm run dev`

Inicia o servidor de desenvolvimento Vite com Hot Module Replacement (HMR).

**Features**:
- Recarregamento automático ao salvar arquivos
- Source maps para debugging
- Porta padrão: 3000

### `npm run build`

Gera build de produção otimizado.

**Output**: Pasta `dist/` com arquivos otimizados e minificados.

**Otimizações**:
- Minificação de código
- Tree shaking (remove código não utilizado)
- Code splitting automático
- Otimização de assets

### `npm run preview`

Visualiza o build de produção localmente.

**Uso**: Execute após `npm run build` para testar o build antes de deploy.

## Estrutura do Projeto

```
dashboard-roi-v4/
├── pages/              # Componentes de página (rotas)
├── components/        # Componentes reutilizáveis
├── services/          # Lógica de negócio e APIs
├── contexts/          # Context API (estado global)
├── hooks/             # Custom hooks
├── types.ts           # Definições TypeScript
├── constants.tsx      # Constantes e labels
├── App.tsx            # Componente raiz e roteamento
├── index.tsx          # Entry point
├── index.html         # HTML template
├── vite.config.ts     # Configuração Vite
├── tsconfig.json      # Configuração TypeScript
├── package.json       # Dependências
└── migrations/        # SQL migrations
```

## Convenções de Código

### Nomenclatura

**Arquivos**:
- Componentes: `PascalCase.tsx` (`ProjectDetail.tsx`)
- Serviços: `camelCase.ts` (`projectService.ts`)
- Hooks: `camelCase.ts` com prefixo `use` (`useToast.ts`)

**Variáveis e Funções**:
- `camelCase` para variáveis e funções
- `PascalCase` para componentes e classes
- `UPPER_SNAKE_CASE` para constantes

**Exemplos**:
```typescript
// Variável
const projectList = [];

// Função
const calculateROI = () => {};

// Componente
const ProjectCard: React.FC = () => {};

// Constante
const MAX_RETRIES = 3;
```

### Estrutura de Componentes

**Ordem recomendada**:

1. Imports (React, bibliotecas, componentes locais)
2. Types/Interfaces (se necessário)
3. Componente principal
4. Hooks de estado
5. Hooks de efeito
6. Funções auxiliares
7. Render (JSX)

**Exemplo**:
```typescript
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { Project } from '../types';

interface ProjectDetailProps {
  // props
}

const ProjectDetail: React.FC<ProjectDetailProps> = () => {
  // 1. Estado
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 2. Hooks
  const { id } = useParams<{ id: string }>();
  
  // 3. Efeitos
  useEffect(() => {
    loadProject();
  }, [id]);
  
  // 4. Funções
  const loadProject = async () => {
    // ...
  };
  
  // 5. Render
  return (
    // JSX
  );
};

export default ProjectDetail;
```

### TypeScript

**Sempre use tipos explícitos**:
```typescript
// ✅ Bom
const projects: Project[] = [];
const count: number = 0;

// ❌ Evitar
const projects = [];
const count = 0;
```

**Interfaces vs Types**:
- Use `interface` para objetos que podem ser estendidos
- Use `type` para unions, intersections, e tipos mais complexos

**Exemplo**:
```typescript
// Interface (preferido para objetos)
interface Project {
  id: string;
  name: string;
}

// Type (para unions)
type Status = 'active' | 'inactive' | 'pending';
```

### Imports

**Ordem**:
1. React e bibliotecas externas
2. Bibliotecas de terceiros
3. Componentes locais
4. Services
5. Types
6. Utils/Helpers

**Exemplo**:
```typescript
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import KPICard from '../components/KPICard';
import { projectService } from '../services/projectService';
import { Project } from '../types';
```

### Comentários

**Quando comentar**:
- Lógica complexa de negócio
- Decisões arquiteturais importantes
- TODOs e FIXMEs
- Funções públicas de serviços

**Formato**:
```typescript
// Comentário de linha para explicações curtas

/**
 * Comentário de bloco para funções e lógica complexa
 * @param project - Projeto a ser processado
 * @returns Estatísticas calculadas
 */
const calculateStats = (project: Project) => {
  // ...
};
```

## Processo de Desenvolvimento

### Criar Nova Feature

1. **Criar branch**:
```bash
git checkout -b feature/nome-da-feature
```

2. **Desenvolver**:
   - Criar componentes necessários
   - Adicionar serviços se necessário
   - Atualizar tipos em `types.ts` se necessário
   - Adicionar rotas em `App.tsx` se necessário

3. **Testar**:
   - Testar funcionalidade manualmente
   - Verificar responsividade
   - Testar dark mode
   - Verificar acessibilidade básica

4. **Commit**:
```bash
git add .
git commit -m "feat: adiciona nova feature X"
```

5. **Push e criar PR**:
```bash
git push origin feature/nome-da-feature
```

### Adicionar Novo Tipo de Melhoria

1. **Atualizar `types.ts`**:
```typescript
export enum ImprovementType {
  // ... existentes
  NEW_TYPE = 'new_type',
}
```

2. **Adicionar cálculo em `dashboardService.ts`**:
```typescript
case ImprovementType.NEW_TYPE:
  // Lógica de cálculo
  monthlyEconomy = /* fórmula */;
  break;
```

3. **Adicionar label em `constants.tsx`**:
```typescript
export const IMPROVEMENT_LABELS = {
  // ... existentes
  new_type: 'Novo Tipo',
};
```

4. **Atualizar UI** (se necessário):
   - Adicionar campos específicos em formulários
   - Atualizar validações

### Adicionar Nova Página

1. **Criar componente em `pages/`**:
```typescript
// pages/NewPage.tsx
const NewPage: React.FC = () => {
  return <div>Nova Página</div>;
};

export default NewPage;
```

2. **Adicionar rota em `App.tsx`**:
```typescript
<Route path="/new-page" element={<NewPage />} />
```

3. **Adicionar link na Sidebar** (se necessário):
```typescript
<NavLink to="/new-page">Nova Página</NavLink>
```

## Debugging

### DevTools do Navegador

**React DevTools**:
- Instalar extensão do Chrome/Firefox
- Inspecionar componentes e props
- Ver estado e hooks

**Redux DevTools** (se adicionado no futuro):
- Time travel debugging
- Inspectar ações e estado

### Console Logs

**Uso estratégico**:
```typescript
// ✅ Bom: Logs informativos
console.log('Carregando projeto:', projectId);

// ✅ Bom: Logs de erro
console.error('Erro ao carregar:', error);

// ❌ Evitar: Logs excessivos em produção
console.log('Renderizando componente...');
```

**Remover antes de commit**:
- Use `console.log` apenas para debugging temporário
- Remova ou comente antes de fazer commit

### Source Maps

Vite gera source maps automaticamente em desenvolvimento. Use para:
- Debugging no navegador
- Stack traces precisos
- Breakpoints no código original

## Testes

### Testes Manuais

**Checklist básico**:
- [ ] Funcionalidade principal funciona
- [ ] Responsividade (mobile/tablet/desktop)
- [ ] Dark mode funciona
- [ ] Navegação entre páginas
- [ ] Formulários validam corretamente
- [ ] Erros são tratados graciosamente
- [ ] Loading states aparecem
- [ ] Toasts funcionam

### Testes Automatizados (Futuro)

**Ferramentas recomendadas**:
- **Vitest**: Testes unitários
- **React Testing Library**: Testes de componentes
- **Playwright**: Testes E2E

**Estrutura**:
```
__tests__/
├── components/
├── services/
└── utils/
```

## Qualidade de Código

### Linting

**ESLint** (configurar no futuro):
```bash
npm run lint
```

**Regras recomendadas**:
- Sem variáveis não utilizadas
- Sem imports não utilizados
- Formatação consistente

### Formatação

**Prettier** (configurar no futuro):
```bash
npm run format
```

**Configuração recomendada**:
- 2 espaços de indentação
- Aspas simples
- Semicolons
- Trailing commas

### Type Checking

**TypeScript**:
```bash
npx tsc --noEmit
```

Verifica erros de tipo sem gerar arquivos.

## Performance

### Otimizações Implementadas

1. **Code Splitting**: Automático via Vite
2. **Tree Shaking**: Remove código não utilizado
3. **Lazy Loading**: (Implementar no futuro)

### Boas Práticas

**Evitar re-renders desnecessários**:
```typescript
// ✅ Bom: useMemo para cálculos pesados
const stats = useMemo(() => {
  return calculateKPIStats(projects, indicators);
}, [projects, indicators]);

// ✅ Bom: useCallback para funções passadas como props
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

**Otimizar listas grandes**:
- Use paginação
- Implemente virtual scrolling (futuro)

## Git Workflow

### Commits

**Formato**: Conventional Commits

```
feat: adiciona cálculo de ROI por projeto
fix: corrige validação de datas
docs: atualiza documentação de API
refactor: reorganiza estrutura de serviços
style: ajusta espaçamento em cards
test: adiciona testes para calculateKPIStats
chore: atualiza dependências
```

### Branches

- `main`: Código de produção
- `develop`: Código de desenvolvimento
- `feature/*`: Novas features
- `fix/*`: Correções de bugs
- `hotfix/*`: Correções urgentes

### Pull Requests

**Template**:
- Descrição clara da mudança
- Screenshots (se aplicável)
- Checklist de testes
- Referências a issues

## Troubleshooting

### Problemas Comuns

**Erro: "Missing Supabase environment variables"**
- Verificar se `.env` existe
- Verificar se variáveis começam com `VITE_`
- Reiniciar servidor de desenvolvimento

**Erro: "Module not found"**
- Executar `npm install`
- Verificar imports corretos
- Limpar cache: `rm -rf node_modules .vite && npm install`

**Erro: "Type error"**
- Verificar tipos em `types.ts`
- Executar `npx tsc --noEmit` para ver erros
- Verificar se interfaces estão atualizadas

**Build falha**
- Verificar erros no console
- Limpar build anterior: `rm -rf dist`
- Verificar variáveis de ambiente

## Recursos

- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
