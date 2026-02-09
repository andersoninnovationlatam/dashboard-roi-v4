# Frontend Guide - ROI Analytics Pro

## Visão Geral

Este documento descreve a estrutura frontend da aplicação, padrões de UI/UX, componentes reutilizáveis, sistema de temas, roteamento e hooks customizados.

## Estrutura de Componentes

### Pages (Rotas)

As páginas são componentes que representam rotas da aplicação. Localizadas em `/pages`.

#### ExecutiveDashboard
**Rota**: `/`

Dashboard principal com KPIs agregados, gráficos e insights de IA.

**Componentes utilizados**:
- `KPICard`: Cards de métricas principais
- `AreaChart` (Recharts): Histórico de economia
- `PieChart` (Recharts): Distribuição por tipo
- `ReactMarkdown`: Renderização de insights de IA

**Estado**:
- `stats`: Métricas calculadas
- `economyHistory`: Histórico mensal
- `distributionByType`: Distribuição por tipo
- `aiInsight`: Insight gerado pela IA

#### ProjectList
**Rota**: `/projects`

Lista todos os projetos da organização com filtros e busca.

**Features**:
- Filtro por status
- Filtro por tipo de desenvolvimento
- Busca por nome
- Cards de projeto com métricas resumidas

#### ProjectDetail
**Rota**: `/projects/:id`

Detalhes completos de um projeto com indicadores e cálculos.

**Features**:
- Tabs: Detalhes e Indicadores
- Criação/edição de indicadores
- Cálculo de métricas do projeto
- Geração de insight específico do projeto
- Edição inline de campos

#### ProjectCreate
**Rota**: `/projects/new`

Formulário de criação de novo projeto.

**Validações**:
- Campos obrigatórios
- Datas válidas
- Valores numéricos positivos

#### Reports
**Rota**: `/reports`

Relatórios imprimíveis em PDF.

**Features**:
- Estilos de impressão (`@media print`)
- Classes `no-print` para ocultar elementos
- Layout otimizado para PDF

#### Settings
**Rota**: `/settings`

Configurações da aplicação.

**Features**:
- Toggle de tema (Dark/Light)
- Edição de prompt de IA (apenas admins)
- Configuração de multiplicadores de frequência

#### TeamManagement
**Rota**: `/team` (apenas admins)

Gestão de membros da equipe.

**Features**:
- Lista de membros
- Criação de novos usuários
- Edição de roles
- Remoção de membros

#### Login / SignUp / ResetPassword
**Rotas**: `/login`, `/signup`, `/reset-password`

Páginas de autenticação.

## Componentes Reutilizáveis

### KPICard

**Localização**: `components/KPICard.tsx`

Card para exibir métricas (KPIs).

**Props**:
```typescript
interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
}
```

**Uso**:
```typescript
<KPICard
  title="ROI Total"
  value="245.5%"
  color="bg-green-600"
  icon={<ChartIcon />}
  trend={{ value: "+12%", isUp: true }}
/>
```

**Estilo**:
- Background branco/slate-900 (dark mode)
- Borda sutil
- Ícone colorido com shadow
- Suporte a trend (seta para cima/baixo)

### Sidebar

**Localização**: `components/Sidebar.tsx`

Navegação lateral colapsável.

**Features**:
- Colapsa/expande
- Responsivo (mobile/desktop)
- Backdrop em mobile
- Links ativos destacados
- Logout

**Estado**:
- `isOpen`: Controlado pelo componente pai
- Persistido em localStorage

### Toast / ToastContainer

**Localização**: `components/Toast.tsx`, `components/ToastContainer.tsx`

Sistema de notificações toast.

**Uso via Hook**:
```typescript
const { showToast } = useToast();

showToast('Sucesso!', 'success');
showToast('Erro ao salvar', 'error');
```

**Tipos**: `success`, `error`, `info`, `warning`

**Features**:
- Auto-dismiss após 3 segundos
- Múltiplos toasts simultâneos
- Animações de entrada/saída

### ConfirmModal

**Localização**: `components/ConfirmModal.tsx`

Modal de confirmação para ações destrutivas.

**Uso via Hook**:
```typescript
const { confirm } = useConfirm();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Confirmar exclusão',
    message: 'Tem certeza que deseja excluir este projeto?',
  });
  
  if (confirmed) {
    // Executar exclusão
  }
};
```

## Sistema de Temas

### Dark Mode

O tema é gerenciado via classe `.dark` no elemento `<html>`.

**Toggle**:
```typescript
const [theme, setTheme] = useState<'dark' | 'light'>(() => {
  const saved = localStorage.getItem('theme');
  return (saved as 'dark' | 'light') || 'dark';
});

useEffect(() => {
  const root = window.document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
}, [theme]);
```

**Classes Tailwind**:
- Light: `bg-white`, `text-slate-900`
- Dark: `dark:bg-slate-900`, `dark:text-white`

**Configuração**:
```javascript
// tailwind.config (no index.html)
tailwind.config = {
  darkMode: 'class',
  // ...
}
```

### Cores Principais

- **Indigo**: `#6366f1` - Ações principais, links ativos
- **Slate**: `#0f172a` - Backgrounds, textos
- **Green**: `#10b981` - Valores positivos, sucesso
- **Red**: `#ef4444` - Erros, valores negativos

## Padrões de UI/UX

### Tipografia

**Fonte**: Inter (Google Fonts)

**Hierarquia**:
- `font-black`: Títulos principais, valores de KPI
- `font-bold`: Subtítulos, labels importantes
- `font-medium`: Texto normal
- `uppercase` + `tracking-widest`: Labels de seções

**Exemplo**:
```tsx
<h2 className="text-2xl font-bold">Dashboard Executivo</h2>
<span className="font-black text-lg">{value}</span>
<span className="text-xs uppercase tracking-widest">KPI Label</span>
```

### Espaçamento

**Padrão**: Múltiplos de 4px (Tailwind)

- `p-6`: Padding padrão de cards
- `gap-4`: Espaçamento entre elementos
- `space-y-8`: Espaçamento vertical entre seções

### Bordas e Sombras

**Cards**:
```tsx
className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"
```

**Botões Primários**:
```tsx
className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
```

### Animações

**Transições**:
- `transition-all duration-300`: Transições suaves
- `transition-colors`: Apenas cores
- `hover:scale-105`: Efeito hover em ícones

**Loading States**:
```tsx
<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
  {/* Spinner */}
</svg>
```

## Roteamento

### Configuração

**Router**: `HashRouter` (React Router DOM)

**Motivo**: Suporta deploy em qualquer servidor estático sem configuração de servidor.

**Estrutura**:
```typescript
<Router>
  <Routes>
    <Route path="/" element={<ExecutiveDashboard />} />
    <Route path="/projects" element={<ProjectList />} />
    <Route path="/projects/new" element={<ProjectCreate />} />
    <Route path="/projects/:id" element={<ProjectDetail />} />
    {/* ... */}
  </Routes>
</Router>
```

### Rotas Protegidas

**Proteção por Autenticação**:
```typescript
if (!user) {
  return <Navigate to="/login" />;
}
```

**Proteção por Role**:
```typescript
const ProtectedAdminRoute = ({ children }) => {
  const { profile } = useAuth();
  if (profile?.role !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
```

### Navegação

**Programática**:
```typescript
const navigate = useNavigate();
navigate('/projects/new');
```

**Links**:
```typescript
import { Link } from 'react-router-dom';
<Link to="/projects">Projetos</Link>
```

**NavLink** (com estilo ativo):
```typescript
<NavLink
  to="/projects"
  className={({ isActive }) => 
    isActive ? 'bg-indigo-600' : 'text-slate-400'
  }
>
  Projetos
</NavLink>
```

## Hooks Customizados

### useToast

**Localização**: `hooks/useToast.ts`

Gerencia notificações toast.

**API**:
```typescript
const { toasts, showToast, removeToast } = useToast();

showToast('Mensagem', 'success' | 'error' | 'info' | 'warning');
```

**Implementação**:
- Estado interno com array de toasts
- Auto-remove após 3 segundos
- IDs únicos para cada toast

### useConfirm

**Localização**: `hooks/useConfirm.ts`

Gerencia modais de confirmação.

**API**:
```typescript
const { confirmState, confirm, handleCancel } = useConfirm();

const confirmed = await confirm({
  title: 'Título',
  message: 'Mensagem',
});
```

**Implementação**:
- Promise-based (resolve com true/false)
- Estado compartilhado via hook
- Modal renderizado condicionalmente

## Gráficos (Recharts)

### AreaChart

**Uso**: Histórico de economia mensal

**Exemplo**:
```typescript
<AreaChart data={economyHistory}>
  <Area dataKey="bruta" stroke="#4CAF50" fill="#4CAF50" />
  <Area dataKey="liquida" stroke="#6366f1" fill="#6366f1" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
</AreaChart>
```

### PieChart

**Uso**: Distribuição por tipo de melhoria

**Exemplo**:
```typescript
<PieChart>
  <Pie
    data={distributionByType}
    dataKey="value"
    label={({ type, value }) => `${type}: R$ ${value.toLocaleString()}`}
  >
    {distributionByType.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

## Estilos de Impressão

### Configuração

**CSS** (`index.html`):
```css
@media print {
  .no-print {
    display: none !important;
  }
  
  main {
    margin-left: 0 !important;
    padding: 0 !important;
  }
  
  .bg-slate-50,
  .dark\:bg-slate-950 {
    background-color: white !important;
  }
}
```

### Uso

**Ocultar elementos na impressão**:
```tsx
<div className="no-print">
  <Sidebar />
  <button>Editar</button>
</div>
```

**Mostrar apenas na impressão**:
```tsx
<div className="print-only">
  <h1>Relatório de ROI</h1>
</div>
```

**Gerar PDF**:
```typescript
window.print();
```

## Responsividade

### Breakpoints (Tailwind)

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Padrões

**Grid Responsivo**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
  {/* Cards */}
</div>
```

**Sidebar Mobile**:
```tsx
className={`
  ${isOpen ? 'w-64' : '-translate-x-full'}
  md:translate-x-0 md:w-20
`}
```

**Padding Responsivo**:
```tsx
className="p-6 md:p-10"
```

## Acessibilidade

### ARIA Labels

**Botões**:
```tsx
<button aria-label="Toggle sidebar">
  <MenuIcon />
</button>
```

**Links**:
```tsx
<Link to="/projects" aria-label="Ver projetos">
  Projetos
</Link>
```

### Navegação por Teclado

- Tab: Navega entre elementos interativos
- Enter/Space: Ativa botões e links
- Escape: Fecha modais

### Contraste

- Texto: Mínimo 4.5:1 (WCAG AA)
- Botões: Contraste suficiente para leitura

## Performance

### Code Splitting

Vite faz split automático de chunks por rota.

### Lazy Loading

**Futuro**: Implementar lazy loading de componentes pesados:
```typescript
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
```

### Memoization

**Onde necessário**:
```typescript
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

## Referências

- Componentes: `/components/*.tsx`
- Páginas: `/pages/*.tsx`
- Hooks: `/hooks/*.ts`
- Configuração: `index.html`, `vite.config.ts`
