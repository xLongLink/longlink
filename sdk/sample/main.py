import src.routes.sample
from longlink import LongLink, issues_page, sample_page

app = LongLink()

# xml_page("/cart", name="Cart", icon="shopping-cart", schema_path=PAGES_DIR / "cart.xml")
# xml_page("/dashboard", name="Dashboard", icon="layout-dashboard", schema_path=PAGES_DIR / "dashboard.xml")
# xml_page("/demo", name="Demo", icon="layout", schema_path=PAGES_DIR / "demo.xml")
# xml_page("/input", name="Input", icon="input", schema_path=PAGES_DIR / "input.xml")
issues_page()
sample_page()
# xml_page("/settings", name="Settings", icon="settings", schema_path=PAGES_DIR / "settings.xml")
# xml_page("/table", name="Table", icon="table", schema_path=PAGES_DIR / "table.xml")
