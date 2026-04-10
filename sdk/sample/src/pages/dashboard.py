from pathlib import Path

from longlink import load_page_schema_from_xml, page


@page("/dashboard", name="Dashboard", icon="layout-dashboard")
async def dashboard_page() -> list[dict]:
    return load_page_schema_from_xml(Path(__file__).with_suffix(".xml"))
