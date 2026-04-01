from longlink import Page, page


@page("/demo", name="Demo", icon="layout")
async def demo_page() -> Page:
    page = Page(title="Demo")

    # Navigation (sidebar)
    menu = page.menu()

    table_section = menu.section("Table", icon="table", default=True)
    form_section = menu.section("Form", icon="file-text")
    chart_section = menu.section("Chart", icon="bar-chart-3")

    # ---- TABLE SECTION ----
    with page.section(table_section):
        page.heading("Users")

        page.table(
            endpoint="/sample",
            columns=[
                {"key": "id", "label": "ID"},
                {"key": "name", "label": "Name"},
                {"key": "active", "label": "Active"},
            ],
            pagination=True,
            searchable=True,
            filters=[{"key": "active", "type": "boolean"}],
        )

    # ---- FORM SECTION ----
    with page.section(form_section):
        page.heading("Create User")

        with page.form():
            page.input("name", label="Name")
            page.input("email", label="Email")
            page.checkbox("active", label="Active")

            page.submit("Save")

    # ---- CHART SECTION ----
    with page.section(chart_section):
        page.heading("User Distribution")

        page.chart(
            endpoint="/sample/chart",
            type="pie",
        )

    return page
