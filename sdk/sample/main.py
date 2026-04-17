from app.envs import env
from longlink import LongLink
from app.pages import pages
from app.routes import routers

app = LongLink(env=env)

# Register routers
for router in routers:
    app.include_router(router)


# Register pages
for page in pages:
    app.include_page(page)
