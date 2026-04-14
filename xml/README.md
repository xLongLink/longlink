# ReactXML

Create a XML abstraction layer on top of React, so that the UI becomes a pure client of a rest API. This allows for a clear Separation of Concerns:

- Backend (REST API) → owns data + mutations
- XML layer → defines data flow + UI structure
- React runtime → purely renders + executes

Designed for:

- Internal dashboards (Data-heavy: tables, forms, filters)
- admin panels
- moderation tools
- back-office systems
- CRUD-dominant workflows
- Repetitive UI patterns
- Low tolerance for inconsistency
- High need for rapid iteration

Example

```xml
<Page name="Example" icon="circle-alert">

  <!-- Sample example -->
  <Query id="users" path="/users?active=true&age>18&sort=ascending">
    <For each="users" as="user">
      <State id="form" username="{user.username}" password="{user.password}">
        <Card>
          <CardHeader>
            <CardTitle>{user.title}</CardTitle>
              <CardDescription if="{user.admin}">
                <Badge> Admin <Badge>
              </CardDescription>
          </CardHeader>
          <CardContent>
            <Input kind="text" label="Username" bind="form.username"/>
            <Input kind="password" label="Password" bind="form.password" />
            <Button path="/users/{user.id}" body="{ 'username': form.username, 'password': form.password }" invalidate="users">
                Save
            </Button>
          </CardContent>
        </Card>
      </State>
    </For>
  </Query>

  <!-- Sample Table Example -->
  <Query id="invoices" path="/invoices?paid=false">
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each="invoices.items" as="invoice">
          <TableRow>
            <TableCell>{invoice.id}</TableCell>
            <TableCell>{invoice.amount}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="size-8"><MoreHorizontalIcon /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem >
                    <Dialog>
                        <DialogTrigger>
                          Edit
                        <DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Invoice {invoice.id}</DialogTitle>
                          </DialogHeader>
                            <Input id="amount" name="username" defaultValue="{invoice.amount}" />
                            <DialogFooter>
                              <DialogClose>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button path="/invoices/{invoice.id}" method="PATCH" body="{'amount': amount }">
                                Save changes
                              </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </DropdownMenuItem>
                  <DropdownMenuItem path="/invoices" method="POST" body="{'amount': invoice.amound }" invalidate="invoices">
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem path="/invoices/{invoice.id}" method="DELETE" invalidate="invoices" variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        </For>
      </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell colSpan="3">Total</TableCell>
        <TableCell>{invoices.total}</TableCell>
      </TableRow>
    <TableFooter>
    </Table>
  </Query>

  <!-- Data Table Example, this shall support pagination, ecc using @tanstack/react-table -->

  <!-- Chart example - use recharts -->
  <State id="filter" value="month">
    <Query id="chart" path="/chart?filter={filter.value}">
    <ButtonGroup>
      <Button variant="outline" set="filter.value = 'week'">Weekly</Button>
      <Button variant="outline" set="filter.value = 'month'">Monthly</Button>
      <Button variant="outline" set="filter.value = 'year'">Yearly</Button>
    </ButtonGroup>
    <ChartContainer>
      <BarChart data="{chart}">
        <CartesianGrid vertical="false" />
        <XAxis dataKey="{filter}" tickLine="false" tickMargin="10" axisLine="false" tickFormatter={"(value) => value.slice(0, 3)"}/>
        <ChartTooltipContent />
        <ChartLegendContent />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius="4" />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius="4" />
      </BarChart>
    </ChartContainer>
    </Query>
  </State>
<Page>
```

## Features

- Global state using `zustand`
- Conditional rendering `if` as parameter, if false not render
- State update `set` as parameter allows to set or update a state
- Logic Components:
    - `<For each="list of items" as="item">`
    - `<State id="<name of the state>" ...props >` the state will have the defined values
    - `<Query id="<name of the state>" path="where to fetch the data">` use TanStack Query

# Architecture

```
src/
├── compiler/              # XML → validated semantic IR (no runtime execution)
│   └── parseXML.ts        # Parse raw XML string → basic AST (nodes, attributes, text)
│
├── runtime/               # Evaluate IR → live runtime nodes + scoped execution
│   ├── evaluateNode.ts    # Convert IR node → RuntimeNode (resolve directives, attach scope, prepare execution)
│   ├── resolveValue.ts    # Evaluate DirectiveValue (expressions, templates, literals) against scope
│   ├── resolveChildren.ts # Recursively evaluate children nodes with proper scope propagation
│   ├── createScope.ts     # Create and link ScopeFrames (state/query/loop nesting)
│   ├── executionContext.ts# Runtime context container (registry, store, queryClient, transport)
│   └── errors.ts          # Runtime error helpers (scoped errors, debug traces, source mapping)
│
├── primitives/            # Core semantic building blocks (control flow + data wiring)
│   ├── Page.tsx           # Root container (initial scope, layout entry, top-level orchestration)
│   ├── Query.tsx          # Data fetching via TanStack Query (exposes data, loading, error, refetch)
│   ├── State.tsx          # Scoped reactive state (Zustand-backed, persistent per scope path)
│   └── For.tsx            # Iteration over collections (creates loop scope, enforces key stability)
│
├── renderer/              # RuntimeNode → React elements (pure rendering layer)
│   └── renderNode.tsx     # Entry: dispatch node to primitive or component renderer
│
├── registry/              # Component + primitive resolution system
│   ├── createContext.ts   # Create the global context
│   └── createRegistry.ts  # Register component adapters (UI library binding)
│
└── index.ts               # Public API (render, createStore, createRegistry, setup helpers)
```

## Usage

Run the example frontend and API together with:

```bash
bun run dev
```

Run only one side when needed with `bun run web` or `bun run api`.

```js
import { createRoot } from 'react-dom/client';
import { render, createState, createRegistry } from 'reactxml';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* Fetch the UI tree from the API */
const xmlTree = await fetch('http://localhost:8000/ui.xml').text();

/* Setup ReactXML */
const queryClient = new QueryClient();
const state = createState(queryClient)


function Button({ action, children, ...rest }) {
  return (
    <button onClick={action} {...rest}>
      {children}
    </button>
  )
}

/* Register the components */
const registry = createRegistry({
  Text,
  Card,
  action(Button), // any component that has path, body, invalidate, method parameters
  ...
});

const component = render(xmlTree, registry, state);

createRoot(document.getElementById('app')!).render(
    <QueryClientProvider client={queryClient}>
        {component}
    </QueryClientProvider>;
}
```
