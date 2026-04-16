# ReactXML

An XML abstraction layer on top of React that turns the UI into a pure REST API client. The backend owns data and mutations; the XML layer declares structure and data flow; React handles rendering.

**Designed for:** internal dashboards, admin panels, back-office tools, and any CRUD-heavy UI that values consistency and rapid iteration over custom logic.

## Example

```xml
<Page name="Dashboard" icon="layout-dashboard">

  <!-- Fetch data, iterate, conditionally mutate -->
  <Query id="users" path="/users?active=true">
    <For each="users" as="user">
      <Card>
        <CardTitle>{user.name}</CardTitle>
        <Badge if="user.admin">Admin</Badge>
        <Button
          path="/users/{user.id}"
          method="PATCH"
          body="{ role: 'member' }"
          invalidate="users"
          if="user.admin"
        >
          Revoke admin
        </Button>
        <Button
          path="/users/{user.id}"
          method="PATCH"
          body="{ role: 'admin' }"
          invalidate="users"
          if="!user.admin"
        >
          Promote to admin
        </Button>
      </Card>
    </For>
  </Query>

  <!-- Local state drives a query parameter -->
  <State id="filter" value="month">
    <Query id="chart" path="/stats?period={filter.value}">
      <ButtonGroup>
        <Button variant="outline" set:filter.value="'week'">Weekly</Button>
        <Button variant="outline" set:filter.value="'month'">Monthly</Button>
        <Button variant="outline" set:filter.value="'year'">Yearly</Button>
      </ButtonGroup>
      <BarChart data="{chart}" />
    </Query>
  </State>

  <!-- Table with inline mutations -->
  <Query id="invoices" path="/invoices?paid=false">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each="invoices.items" as="invoice">
          <TableRow>
            <TableCell>{invoice.id}</TableCell>
            <TableCell>{invoice.amount}</TableCell>
            <TableCell>
              <Button path="/invoices/{invoice.id}" method="DELETE" invalidate="invoices" variant="destructive">
                Delete
              </Button>
            </TableCell>
          </TableRow>
        </For>
      </TableBody>
    </Table>
  </Query>

</Page>
```

## Features

| Feature                  | Description                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `<Query id path>`        | Fetches data via TanStack Query; exposes result under `id` in scope  |
| `<State id ...props>`    | Scoped reactive state backed by Zustand; initial values set as props |
| `<For each as>`          | Iterates over a collection, creating a child scope per item          |
| `if` attribute           | Conditionally renders an element; `if="!expr"` for negation          |
| `set:<target>` attribute | Updates a state value on click, e.g. `set:filter.value="'week'"`     |
| `path / method / body`   | Wires a component to a REST mutation (GET/POST/PATCH/DELETE)         |
| `invalidate`             | Refetches the named query after a successful mutation                |
| `{expr}` interpolation   | Resolves scoped expressions in attributes and text content           |

## Architecture

```
src/
├── compiler.ts    # Parse XML string → internal AST (nodes, attributes, text)
├── runtime.tsx    # Evaluate expressions and resolve scoped values
├── renderers.tsx  # Convert runtime nodes into React elements
├── registry.tsx   # Register components and runtime context
├── types.ts       # Shared runtime and AST types
├── primitives/    # Built-in control-flow and data components
│   ├── Page.tsx   # Root container — initial scope, layout entry
│   ├── Query.tsx  # Data fetching via TanStack Query
│   ├── State.tsx  # Scoped reactive state (Zustand-backed)
│   ├── For.tsx    # Iteration over collections
│   └── Grid.tsx   # Grid layout
└── index.ts       # Public API
```

## Usage

Start the example (frontend + API):

```bash
bun run dev
```

Or run each side independently: `bun run web` / `bun run api`.

### Integration

```ts
import { createRoot } from 'react-dom/client';
import { fromXml, renderNode, createRegistry, createContext, action } from 'reactxml';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Fetch the UI tree from the server
const xml = await fetch('http://localhost:8000/').then(r => r.text());
const tree = fromXml(xml);

// Wrap action components with the mutation helper
function Button({ action, pending, children, ...rest }) {
  return (
    <button onClick={action} disabled={pending} {...rest}>
      {pending ? 'Saving...' : children}
    </button>
  );
}

// Register all components used in the XML
const registry = createRegistry({
  Card,
  Badge,
  Button: action(Button),
  // ...
});

const queryClient = new QueryClient();

createRoot(document.getElementById('app')!).render(
  <QueryClientProvider client={queryClient}>
    {renderNode(tree, registry, createContext())}
  </QueryClientProvider>
);
```

### Public API

| Export                            | Description                                              |
| --------------------------------- | -------------------------------------------------------- |
| `fromXml(xml)`                    | Parse an XML string into an AST                          |
| `renderNode(node, registry, ctx)` | Render an AST node into a React element                  |
| `render(xml, registry)`           | Parse and render in one call                             |
| `createRegistry(components)`      | Build the component registry                             |
| `createContext()`                 | Create a fresh execution context                         |
| `action(Component)`               | Wrap a component to receive `action` and `pending` props |
| `evaluate(expr, ctx)`             | Evaluate a scoped expression                             |
| `interpolate(str, ctx)`           | Resolve `{expr}` placeholders in a string                |
