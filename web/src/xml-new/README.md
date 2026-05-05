## How it works

**Tags → Components**: \
Each XML tag maps directly to a React component that controls rendering and behavior.

**Attributes → Props**: \
XML attributes become component props, defining configuration and data inputs.

**State and Data (`<State>`, `<Query>`)**: \
Both use an `id` to define a reusable state slot:

- `<State id="user" name="John Doe" />` \
  Creates local state → `user.name === "John Doe"`
- `<Query id="user" path="/endpoint" />` \
  Fetches data into state → e.g. `{ name: "John Doe" }` → `user.name`

**Conditional Rendering (`if`)**: \
Any tag can include `if="condition"`, If false, the element is not rendered.

**Expressions (`{}`)**: \
Curly braces evaluate JavaScript-like expressions using state: `Hello, {user.name}` → `Hello, John Doe`

**State Reset / Refetch (`reset`)**:

- On `<State>` → resets to initial value
- On `<Query>` → triggers refetch

**Two-way Binding (`$`)**: \
Syncs component props with state: `<Input value="$sample.value" />` Updates flow both ways (UI ↔ state)

**Iteration (`<For>`)**: \
Loop over arrays: `<For each="orders" as="order"> ... </For>`

**Actions (`<Button>` and similar)**: \
Trigger API calls, Sends request on click, `invalidate` causes related queries to refetch afterward

```xml
<Button action="/issues" method="POST"  payload='{"title":"{issue.title}"}' invalidate="issues">
    Save
</Button>
```
