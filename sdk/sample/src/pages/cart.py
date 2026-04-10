from pathlib import Path

from longlink import load_page_schema_from_xml, page


@page("/cart", name="Cart", icon="shopping-cart")
async def cart_page() -> list[dict]:
    return load_page_schema_from_xml(Path(__file__).with_suffix(".xml"))
