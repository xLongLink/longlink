# AGENTS.md

You are working on a LongLink Solution project.

## Schema ownership

- Models and migrations own only this project's schema.
- The SDK owns shared schema definitions and migrations. The LongLink Platform executes those migrations.
- For tables that need Platform-user attribution, DO use `longlink.Audit`.
- For additional user roles, DO inherit from `longlink.Model` and declare each role as `role: User = UserRelationship()`.

## Code structure

```
├── src/
│   ├── models/       # SQLModel database tables
│   ├── views/        # View files
│   ├── routes/       # API routes
│   ├── schemas/      # Pydantic schemas
│   └── envs.py       # Environments
├── tests/            # Project tests
├── .env.sample       # Environment template
└── main.py           # Service entry point
```

## Solution runtime

- DO build the app with `app = LongLink()`.
- DO register routers with `app.include_router(...)` in `main.py`.
- DO type route parameters as `ctx: Context` for the request database session, storage filesystem, and signed-in user.
- DO store each item's files under its own `{item_id}/` storage prefix.

## Views

- DO express how someone participates in a business process: show its state and make the next action clear.
- DO focus on the information, layout, and interactions the process needs.
- DON'T build a separate frontend stack for each Solution. Use LongLink's shared components and runtime.
- DO keep each View readable as a coherent interface definition, with straightforward JSX, explicit actions, and local interaction state.
- DON'T introduce abstractions or complexity unless the process requires them.
- DO use Views to present data and collect intent. Keep business rules, validation, and authorization on the Solution server.
- DON'T treat hiding or disabling an action as a substitute for enforcing its rules on the server.
- DO use shared components and familiar interaction patterns across Solutions.
- DO customize the workflow before customizing its appearance.
- DO include only elements and text that help someone understand or complete a task.
- DON'T add decorative containers, redundant labels, or explanatory text that repeats what the interface already makes clear.
- DO interact with the Solution through the isolated runtime's explicit, scoped capabilities.
- DON'T depend on or control Platform internals from a View.

### Component discovery

- Before writing a View, DO discover available components with `uv run longlink docs` or `uv run longlink docs --category <name>`.
- DO inspect each group's props or runtime members with `uv run longlink docs --component <name>`.
- DO use only LongLink-defined components exposed by the View runtime. DON'T import Astryx or other UI libraries directly into Views.
- DON'T invent components or props. Consult the View documentation when an API is uncertain.

### Component categories

- DO use **Runtime** for local interaction state, Solution data, requests, and scoped navigation through the supplied hooks and functions.
- DO use **Layouts** for arranging content, grouping sections, and organizing navigation, dialogs, tabs, and steps.
- DO use **Display** for presenting information: headings, text, records, metadata, status, progress, and file previews.
- DO use **Action** for triggering operations and navigation through buttons, links, and action menus.
- DO use **Form** for collecting and submitting user input through `Form` and the documented field components.

### Component groups

- DO use **Hooks** for component state, external synchronization, and loading Solution data.
- DO use **Functions** for Solution operations and navigation.
- DO use **Stack** for horizontal or vertical layouts, spacing, and alignment.
- DO use **Grid** for column layouts and content spanning multiple columns.
- DO use **Menu** for grouped side navigation and the selected section's content.
- DO use **Tabs** for switching between related content panels.
- DO use **Stepper** for showing progress through a multi-step process.
- DO use **RadioList** for choosing one option from labeled choices.
- DO use **MetadataList** for presenting labeled record values.
- DO use **Table** for data-driven rows and column sizing.

### Layout and styling

- DON'T use raw HTML elements such as `<div>` or `<span>`. Use LongLink components for structure and content.
- DO control layout and appearance through documented component props, including spacing, alignment, and semantic variants.
- DON'T use inline `style`, custom `className` values, imported CSS, or hardcoded colors and pixel values to bypass the View component API.
- DON'T wrap individual table rows in `Card`.
- DO use `Card` only for dashboard widgets, galleries, or settings groups.
- DO use `StatusDot` for status and `Badge` for counts or enumerated states, not decoration.
- DO use the LongLink `Icon` component for icons.

### Final review

- Before completing a View, DO reread each changed View file and replace raw HTML, custom styling, and undocumented props with supported LongLink components and props.
- When a component or prop is uncertain, DO consult `uv run longlink docs --component <name>`. DON'T bypass discovery with custom HTML or CSS.
- DO remove unnecessary containers, repeated explanatory text, and abstractions that do not make the View clearer.

## Python Guidelines

- AVOID renaming imports.
- DO validate types at system boundaries.
- PREFER the simplest correct implementation. AVOID features needed only for hypothetical future use.
- PREFER idiomatic Python and readability over efficiency.
- DO use clear domain names.
- PREFER single-word Python filenames.
- PREFER namespaced module APIs to importing many related functions directly.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- When duplication makes lifecycle code clearer, PREFER explicit duplication to a local helper.
- DO use exceptions for genuine errors.
- AVOID unnecessary `try`/`except` blocks.

## Testing

- Unless the user requests tests, DON'T write them.
- DO test observable behavior with clear, deterministic assertions.
- For non-trivial tests, DO use Arrange, Act, and Assert sections.
- DO mock external boundaries, not business logic.
- DO use `longlink.testclient.TestClient` for route tests. Constructing it selects in-memory testing services for the app.
