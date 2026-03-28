from src.app import app
from longlink import Page


@app.page("/settings", name="Settings", icon="settings")
async def settings_page() -> Page:
    page = Page()
    settings_menu = page.menu()
    general = settings_menu.section("General", icon="settings")

    general.input(
        label="Normal Input",
        placeholder="Lorem ipsum dolor sit amet",
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        submit="Save",
    )

    settings_menu.section("Identity", icon="user")
    settings_menu.section("Access Control", icon="lock")
    settings_menu.section("Applications", icon="app-window")
    settings_menu.section("Infrastructure", icon="server")
    settings_menu.section("Storage", icon="database")
    settings_menu.section("Audit & Compliance", icon="file-text")
    settings_menu.section("Backups & Recovery", icon="hard-drive")
    settings_menu.section("Security", icon="shield")
    settings_menu.section("Billing & Plan", icon="credit-card")
    settings_menu.section("API & Integrations", icon="zap")
    settings_menu.section("Advanced / System", icon="sliders")

    return page