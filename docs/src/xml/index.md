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
