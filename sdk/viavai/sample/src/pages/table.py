from viavai import Page

page = Page()

hero = page.hero(
    title="Data Table",
    description="A data table component for displaying tabular data.",
    icon= "table",
)

col1, col2 = page.columns(2)

with col1:
    col1.text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.")
with col2:
    col2.text("Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.")


tab1, tab2 = page.tabs(["Example", "Code"])

with tab1:
    tab1.text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.")

with tab2:
    tab2.test("Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.")


