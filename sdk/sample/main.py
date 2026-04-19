from app.api import routers
from app.envs import env
from longlink import LongLink

app = LongLink(env=env)

# Register routers
for router in routers:
    app.include_router(router)


# Register pages
app.include_page("/pages/cart.xml")
app.include_page("/pages/dashboard.xml")
app.include_page("/pages/demo.xml")
app.include_page("/pages/input.xml")
app.include_page("/pages/settings.xml")
app.include_page("/pages/table.xml")
