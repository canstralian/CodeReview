# Client Frontend

React-based frontend application for CodeReview AI.

## Overview

The client is a modern, responsive web application built with:

- **React 19**: Latest React with improved performance
- **TypeScript**: Type-safe development
- **Shadcn UI**: Beautiful, accessible UI components
- **TailwindCSS**: Utility-first CSS framework
- **React Query**: Data fetching and caching
- **Wouter**: Lightweight routing

## Project Structure

```
client/
├── index.html             # HTML entry point
└── src/
    ├── main.tsx           # Application entry
    ├── App.tsx            # Root component
    ├── index.css          # Global styles
    ├── components/        # UI components
    │   ├── ui/            # Shadcn UI components
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── input.tsx
    │   │   └── ...
    │   ├── SearchForm.tsx
    │   ├── RepositoryView.tsx
    │   ├── FileExplorer.tsx
    │   ├── IssuesList.tsx
    │   ├── CodeViewer.tsx
    │   ├── AISuggestions.tsx
    │   ├── TeamDashboard.tsx
    │   └── ThemeToggle.tsx
    ├── pages/             # Page components
    │   ├── Home.tsx
    │   ├── RepoComparison.tsx
    │   └── not-found.tsx
    ├── hooks/             # Custom React hooks
    │   └── use-toast.ts
    ├── lib/               # Utility functions
    │   └── utils.ts
    └── types/             # TypeScript definitions
        └── index.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`.

## Key Features

### 1. Repository Search and Analysis

Search for GitHub repositories and trigger code analysis.

```typescript
// SearchForm.tsx
<SearchForm onSubmit={handleSubmit} />
```

### 2. File Explorer

Browse repository files with a tree structure.

```typescript
// FileExplorer.tsx
<FileExplorer files={files} onFileSelect={handleSelect} />
```

### 3. Code Viewer

View code with syntax highlighting and issue annotations.

```typescript
// CodeViewer.tsx
<CodeViewer code={code} language={language} issues={issues} />
```

### 4. Issues List

Display and filter code issues by category and severity.

```typescript
// IssuesList.tsx
<IssuesList issues={issues} onIssueSelect={handleSelect} />
```

### 5. AI Suggestions

AI-powered code improvement suggestions.

```typescript
// AISuggestions.tsx
<AISuggestions code={code} onApply={handleApply} />
```

### 6. Team Dashboard

Metrics and insights for team repositories.

```typescript
// TeamDashboard.tsx
<TeamDashboard repositories={repos} />
```

## UI Components

### Shadcn UI

Pre-built, customizable components:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
```

### Custom Components

#### SearchForm

```typescript
interface SearchFormProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
}
```

#### FileExplorer

```typescript
interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  selectedFile?: FileNode;
}
```

#### IssuesList

```typescript
interface IssuesListProps {
  issues: CodeIssue[];
  onIssueSelect?: (issue: CodeIssue) => void;
  filters?: IssueFilters;
}
```

## Hooks

### useToast

Display toast notifications:

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: "Success",
  description: "Operation completed successfully",
});
```

### Custom Data Hooks

```typescript
// Example: useFetch hook
function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: () => fetch('/api/repositories').then(r => r.json())
  });
}
```

## Styling

### TailwindCSS

Utility-first CSS framework:

```typescript
<div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
  <h2 className="text-2xl font-bold">Title</h2>
  <Button className="px-4 py-2">Action</Button>
</div>
```

### Theme Customization

Themes are configured in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...},
      }
    }
  }
}
```

### Dark Mode

Toggle between light and dark themes:

```typescript
import { ThemeToggle } from '@/components/ThemeToggle';

<ThemeToggle />
```

## Routing

Using Wouter for lightweight routing:

```typescript
import { Route, Switch } from 'wouter';

<Switch>
  <Route path="/" component={Home} />
  <Route path="/compare" component={RepoComparison} />
  <Route path="/:rest*" component={NotFound} />
</Switch>
```

## API Integration

### Fetching Data

```typescript
async function fetchRepository(id: number) {
  const response = await fetch(`/api/repositories/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch repository');
  }
  return response.json();
}
```

### React Query

```typescript
import { useQuery } from '@tanstack/react-query';

function useRepository(id: number) {
  return useQuery({
    queryKey: ['repository', id],
    queryFn: () => fetchRepository(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## State Management

### Local State

```typescript
const [value, setValue] = useState<string>('');
```

### URL State

```typescript
const [searchParams] = useSearchParams();
const category = searchParams.get('category');
```

### Server State (React Query)

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData
});
```

## Forms

### Controlled Components

```typescript
function SearchForm() {
  const [url, setUrl] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter GitHub URL"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
```

## Performance Optimization

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

const MemoizedComponent = memo(Component);

const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
```

## Accessibility

### ARIA Labels

```typescript
<button aria-label="Close dialog">
  <X />
</button>
```

### Keyboard Navigation

```typescript
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Click me
</div>
```

## Testing

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';

test('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Client-side environment variables must be prefixed with `VITE_`:

```
VITE_API_URL=http://localhost:5000
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write accessible components
4. Test your changes
5. Update documentation

## Resources

- [React Documentation](https://react.dev/)
- [Shadcn UI](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [React Query](https://tanstack.com/query/latest)
- [Wouter](https://github.com/molefrog/wouter)

## License

MIT
