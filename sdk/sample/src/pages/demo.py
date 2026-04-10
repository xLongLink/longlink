from pathlib import Path

from longlink import load_page_schema_from_xml, page


@page("/demo", name="Demo", icon="layout")
async def demo_page() -> list[dict]:
    return load_page_schema_from_xml(Path(__file__).with_suffix(".xml"))
