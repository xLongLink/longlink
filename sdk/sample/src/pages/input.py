from pathlib import Path

from longlink import load_page_schema_from_xml, page


@page("/input", name="Input", icon="input")
async def input_page() -> list[dict]:
    return load_page_schema_from_xml(Path(__file__).with_suffix(".xml"))
