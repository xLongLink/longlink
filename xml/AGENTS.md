# ReactXML Runtime Specification (agent.md)

## 1. Purpose

ReactXML is a declarative XML-based UI system interpreted at runtime using React.

It enforces strict separation:

- Backend → owns data + mutations (REST API)
- XML → defines UI + data flow
- React → executes rendering + state updates

This system is designed for:

- CRUD-heavy interfaces
- Internal tools / admin panels
- Data-driven dashboards
- Highly repetitive UI patterns

---

## 2. Core Architecture

The system consists of 4 layers:

### 2.1 XML

Declarative UI definition.

### 2.2 AST (Abstract Syntax Tree)

Parsed representation of XML.

### 2.3 Runtime Engine

Interprets AST using a component registry.

### 2.4 React

Handles rendering and reactivity via hooks.

---

## 3. Fundamental Principle

The system is **not reactive by itself**.

Reactivity is provided exclusively by React:

- `useState`
- `useQuery`
- component re-rendering

All expressions are evaluated **during render only**.

---

## 4. Data Model

### 4.1 AST Node

```ts
type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode[];
    value?: string;
};
```

---

### 4.2 Execution Context

```ts
type ExecutionContext = {
    state: Record<string, [any, Function]>;
    queries: Record<string, any>;
    scope: Record<string, any>;
};
```

---

## 5. Runtime Flow

### 5.1 Initialization

1. Parse XML → AST
2. Create root context:

```ts
{
  state: {},
  queries: {},
  scope: {}
}
```

---

### 5.2 Render Loop

Rendering is recursive:

```ts
renderNode(node, ctx)
  → lookup component in registry
  → execute component(node, ctx)
  → component returns React elements
```

---

## 6. Context Propagation

Context flows **top-down only**.

Each component may extend context:

| Component | Extends |
| --------- | ------- |
| State     | state   |
| Query     | queries |
| For       | scope   |

---

## 7. Expression Evaluation

### 7.1 Syntax

```xml
{user.name}
{form.username}
{filter.value}
```

---

### 7.2 Evaluation Rules

- Evaluated at render time only
- No caching
- No reactivity layer

---

### 7.3 Evaluator

```ts
function evaluate(expr, ctx) {
    const scope = {
        ...Object.fromEntries(Object.entries(ctx.state).map(([k, [v]]) => [k, v])),
        ...ctx.queries,
        ...ctx.scope,
    };

    return new Function(...Object.keys(scope), `return ${expr}`)(...Object.values(scope));
}
```

---

### 7.4 Interpolation

```ts
function interpolate(str, ctx) {
    return str.replace(/\{([^}]+)\}/g, (_, expr) => evaluate(expr, ctx));
}
```

---

## 8. Component Types

### 8.1 Control Components (modify context)

---

#### State

Creates local React state and injects into context.

```ts
registry['State'] = (node, ctx) => {
    const id = node.params.id;

    const initial = evaluateParams(node.params, ctx);
    const [value, setValue] = useState(initial);

    const childCtx = {
        ...ctx,
        state: {
            ...ctx.state,
            [id]: [value, setValue],
        },
    };

    return renderChildren(node, childCtx);
};
```

---

#### Query

Fetches data and injects into context.

```ts
registry['Query'] = (node, ctx) => {
    const id = node.params.id;
    const path = interpolate(node.params.path, ctx);

    const { data } = useQuery({
        queryKey: [id, path],
        queryFn: () => fetch(path).then((r) => r.json()),
    });

    const childCtx = {
        ...ctx,
        queries: {
            ...ctx.queries,
            [id]: data,
        },
    };

    return renderChildren(node, childCtx);
};
```

---

#### For

Loops over data and injects scoped variable.

```ts
registry['For'] = (node, ctx) => {
    const items = evaluate(node.params.each, ctx);
    const as = node.params.as;

    return items.map((item, index) => {
        const childCtx = {
            ...ctx,
            scope: {
                ...ctx.scope,
                [as]: item,
                $index: index,
            },
        };

        return renderChildren(node, childCtx);
    });
};
```

---

### 8.2 UI Components

Pure rendering components.

They:

- Evaluate props
- Render JSX
- Render children

---

Example:

```ts
registry["Card"] = (node, ctx) => {
  return <div>{renderChildren(node, ctx)}</div>;
};
```

---

### 8.3 Action Components

Trigger side effects.

---

#### Button

```ts
registry["Button"] = (node, ctx) => {
  const path = interpolate(node.params.path, ctx);
  const method = node.params.method || "POST";
  const body = evaluate(node.params.body, ctx);

  return (
    <button
      onClick={() => {
        fetch(path, {
          method,
          body: JSON.stringify(body),
        });
      }}
    >
      {renderChildren(node, ctx)}
    </button>
  );
};
```

---

## 9. Binding System

### 9.1 Syntax

```xml
<Input bind="form.username" />
```

---

### 9.2 Rules

- Only binds to `state`
- Must use React state setter
- Must be immutable

---

### 9.3 Implementation

```ts
function resolveBinding(path, ctx) {
    const [stateKey, field] = path.split('.');
    const [value, setValue] = ctx.state[stateKey];

    return {
        value: value[field],
        set: (newVal) =>
            setValue((prev) => ({
                ...prev,
                [field]: newVal,
            })),
    };
}
```

---

## 10. Rendering Children

```ts
function renderChildren(node, ctx) {
  return node.children?.map((child, i) =>
    <React.Fragment key={i}>
      {renderNode(child, ctx)}
    </React.Fragment>
  );
}
```

---

## 11. Invariants (STRICT)

1. All dynamic values must come from context
2. Context is immutable (only extended, never mutated)
3. State updates must use setters
4. Hooks must not be conditional
5. Evaluation happens only during render

---

## 12. What This System Is

- A declarative UI DSL
- A runtime interpreter over a tree
- A thin execution layer on top of React

---

## 13. What This System Is NOT

- Not a reactive engine
- Not a state manager
- Not a replacement for React

---

## 14. Execution Summary

```
XML
 → AST
 → renderNode(node, ctx)
     → component(node, ctx)
         → extend context or render UI
             → recurse
 → React handles updates
 → repeat
```

---

## 15. Future Improvements (Optional)

- Replace `new Function` with safe evaluator
- Add memoization for performance
- Add devtools (inspect context)
- Add schema validation for XML
- Add compiler mode (XML → JSX)

---

## 16. Key Insight

The system works if and only if:

> All data flows through context, and React is the only source of reactivity.
