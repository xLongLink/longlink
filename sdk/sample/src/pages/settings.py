from pathlib import Path

from longlink import load_page_schema_from_xml, page


@page("/settings", name="Settings", icon="settings")
async def settings_page() -> list[dict]:
    return load_page_schema_from_xml(Path(__file__).with_suffix(".xml"))
