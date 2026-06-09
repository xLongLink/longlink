from src.routes import routers
from longlink import LongLink
from src.envs import env

app = LongLink(env=env)

# Register routers.
for router in routers:
    app.include_router(router)
