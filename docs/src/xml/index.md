# Pages

Unlike typical Python UI frameworks such as [Streamlit](https://streamlit.io/), [Dash](https://dash.plotly.com/), or [Reflex](https://reflex.dev/), LongLink enforces a strict separation between user interface and application logic.

Application logic is exposed through a dedicated RESTful API, making it directly accessible to external systems, including automation pipelines and AI tools.

To avoid maintaining a separate frontend codebase, pages are defined using an XML-based format that extends HTML with predefined components. These pages are interpreted at runtime and provide declarative data fetching, state management, and action execution over REST endpoints.

The resulting interface is consistent with the LongLink control plane and acts as an adapter over it, ensuring a uniform interaction model across applications. This keeps business logic centralized, reduces duplication, and improves maintainability over time.

## Pages

Each tab in the user interface,

```python
from longlink import LongLink

app = LongLink(env=env)
app.include_page("/pages")
```

`Page` is the root element of every UI definition. It wraps the full document and sets page metadata such as the name and icon.

```xml
<?xml-model href="https://docs.longlink.dev/schema.xsd" schematypens="http://www.w3.org/2001/XMLSchema" ?>
<Page name="Tab Name" icon="settings" xmlns:bind="*">
    <!-- Content -->
</Page>
```

> Note: `xmlns:bind="*"` doesn't do anything, is just there to make the editor happy
