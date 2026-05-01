# Pages

Unlike typical Python UI frameworks such as [Streamlit](https://streamlit.io/), [Dash](https://dash.plotly.com/), or [Reflex](https://reflex.dev/), LongLink enforces a strict separation between user interface and application logic.

Application logic is exposed through a dedicated RESTful API, making it directly accessible to external systems, including automation pipelines and AI tools.

To avoid maintaining a separate frontend codebase, pages are defined using an XML-based format that extends HTML with predefined components. These pages are interpreted at runtime and provide declarative data fetching, state management, and action execution over REST endpoints.

The resulting interface is consistent with the LongLink control plane and acts as an adapter over it, ensuring a uniform interaction model across applications. This keeps business logic centralized, reduces duplication, and improves maintainability over time.

## Page

`Page` is the root element of every UI definition. It wraps the entire document and defines metadata such as the page name and icon, which are used in the navigation and tab system.

```xml
<Page name="Settings" icon="settings">
  <!-- Content -->
</Page>
```

## State

`State` defines a local, reactive state container. It holds variables that can be bound to components and updated through user interaction or actions.

```xml
<State id="user" username="" password="">
  <Input kind="text" label="Username" bind="user.username" placeholder="Mario Rossi" />
  <Input kind="password" label="Password" bind="user.password" placeholder="password" />
<State />
```

## Query

`Query` declares a data-fetching operation against a REST endpoint. The response is automatically parsed and stored under the given id, making it available for rendering and logic.

```xml
<Query id="orders" path="/apps">
```

## For

`For` iterates over a collection and renders its children for each item. The current element is exposed through the `as` variable.

```xml
<For each="orders" as="order">
  <Card>{order.number}</Card>
</For>
```

## If

All components support an `if` attribute for conditional rendering. The component is rendered only if the expression evaluates to `true`.

```xml
<Card if="order.active" />
```
