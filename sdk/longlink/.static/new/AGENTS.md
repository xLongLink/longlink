<!-- LONGLINK:START -->
LongLink v<version>
CLI: run every command as `uv run longlink <cmd>` (shown below as `longlink ...`).

PRINCIPLES:
- KISS: Choose the simplest correct implementation.
- SRP / Separation of concerns: Keep responsibilities focused and ownership clear.
- High cohesion / Low coupling: Keep related behavior together and reduce unnecessary dependencies.
- YAGNI: Avoid features, abstractions, configuration, and extension points needed only for hypothetical future use.
- DRY: Avoid duplicated knowledge or business rules. AVOID abstractions that only remove superficial code similarity.

STRUCTURE:
```t
├── src/
│   ├── models/       # SQLModel database tables - One file per model
│   ├── views/        # View (UI) files
│   ├── routes/       # API routes - One file per resource
│   ├── schemas/      # Pydantic schemas - One file per schema
│   └── envs.py       # Environments
├── tests/            # Project tests
└── main.py           # Entry point
```

RULES:
- USE `ctx.database` to access the database session.
- USE `ctx.storage` to access the storage filesystem.
- USE `longlink.Audit` for Platform-user attribution.
- USE `UserRelationship()` to save users into a table.
- USE `ctx.user` to access the current user informations
- DO run formatting, linting, type checking, and relevant existing tests.
- After verification, DO review the implementation for further simplification.

PYTHON:
- AVOID renaming imports.
- DO use clear domain names.
- PREFER single-word Python filenames.
- DO use exceptions for genuine errors.
- DO validate types at system boundaries.
- AVOID unnecessary `try`/`except` blocks.
- PREFER the simplest correct implementation.
- DO group Pydantic fields into commented sections.
- AVOID features needed only for hypothetical future use.
- PREFER idiomatic Python and readability over efficiency.
- DO use `Protocol` for behavioral interfaces and dependency contracts.
- PREFER namespaced module APIs to importing many related functions directly.
- DO represent application state with typed models, enums, or structured objects.
- DO declare `response_model` on FastAPI routes and let FastAPI validate responses.
- DO order Pydantic fields within each section from the shortest name to the longest name.
- DO use `collections.abc.Sequence` instead of `list` for read-only query result return types.
- PREFER explicit duplication to a local helper, When duplication makes lifecycle code clearer.
- DO construct class instances in separate, multi-line assignments before invoking their methods.
- DO store asynchronous query results in a named variable before calling `.all()`, `.one_or_none()`, or similar result methods.

TESTING:
- DO use Arrange, Act, and Assert sections.
- DO mock external boundaries, not business logic.
- DO use `longlink.testclient.TestClient` for route tests.
- Unless the user explicitly requests tests, DON'T add them.
- DO test observable behavior with clear, deterministic assertions.
- Where practical, PREFER real implementations and explicit dependency boundaries to mocks or global runtime-state changes.

VIEWS:
- PREFER explicit async/await.
- DO add JSDoc to JavaScript functions.
- DO keep each page simple and standalone.
- DON'T wrap individual table rows in `Card`.
- DO use concurrency only for independent operations.
- DO extract components only for meaningful UI boundaries.
- Each view IDEALLY have one scope and one primary presentation
  - Table view: one table for one dataset.
  - Menu view: one menu for related options or sections.
  - Card view: one card-based presentation for one scope.
- DON'T use raw HTML elements. Use LongLink components for structure and content.
- AVOID duplicated derived state and effects that do not synchronize with external systems.
- DON'T add standalone explanatory, onboarding, or empty-state sentences around the primary content.
- DON'T use browsers or browser automation to inspect or verify changes. DO inspect source and run code-level checks instead.
- DON'T add decorative containers, redundant labels, or explanatory text that repeats what the interface already makes clear.
- DON'T use inline `style`, custom `className` values, imported CSS, or hardcoded colors and pixel values to bypass the View component API.

CARDS:
- DO give each card one clear purpose: a person, project, metric, plot, or story.
- DO use cards for independently meaningful items, not every group of content.
- DON'T nest cards or wrap individual table rows in cards.
- DO preserve the LongLink shell, background surface, and page gutters.
- DON'T widen the application to accommodate one card.
- DO use responsive Grid columns for card collections and Stack for card interiors.
- DO use gap={2} between dashboard cards and consistent padding={5} inside sibling cards.
- DO inherit colors, typography, borders, and corner shapes from the theme.
- DO let content determine card height; avoid fixed heights that crop content.
- DO stack internal columns when the card becomes too narrow.
- DON'T shrink text or controls to preserve a desktop arrangement.
- DO align sibling card actions at the bottom where practical.
- DO use a short heading, supporting context, primary content, and only necessary actions.
- DO keep important values prominent and their units understandable.
- DON'T repeat headings, labels, or explanations already clear from the content.
- DO use meaningful, working actions instead of decorative buttons.
- DON'T add manual navigation icons when a component already supplies them.
- For people, DO show Avatar, name, role, and relevant activity or statistics.
- For directories, DO use Table rows rather than nested cards.
- For pictures, DO use Image with meaningful alt text and consistent image proportions.
- For full-bleed pictures, DO use padding={0} and isClipped, with padding on the content Stack.
- For plots, DO use Plot with data, xKey, labeled series, and a meaningful label.
- DO keep missing plot observations as null or omitted values, not zero.
- DO provide a Table or summary for large plots; essential information must not depend on hover.
- DON'T add a duplicate heading inside a card when Plot already displays its label.
- DON'T copy native Platform HTML, SVG, CSS, or className styling into SDK Views.
- DO use only documented LongLink components and supported props; use Globe for geographic maps and Image variant="logo" for compact brand artwork.
- DO preserve keyboard access, visible focus, and accessible action labels.

DOCS:
- USE `longlink migrate` to generate migrations
- USE `longlink docs --help` to lists documentation commands:
- USE `longlink docs group <name>` to browse a component group
- USE `longlink docs build "<idea>"` for implementation outline and relevant APIs
- USE `longlink docs search "<query>"` to find supported components and runtime APIs
- USE `longlink docs component <Name>` to get props, runtime members, and usage guidance
<!-- LONGLINK:END -->
