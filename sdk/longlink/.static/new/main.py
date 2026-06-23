from longlink import LongLink
from src.envs import env
from src.router import router

app = LongLink(env=env)


# Register routers
import src.routes.pages
import src.routes.sample

app.include_router(router)

# Keep the root static mount after explicit routes so XML pages win routing.
for route in list(app.routes):
    if getattr(route, "name", None) == "static":
        app.routes.remove(route)
        app.routes.append(route)
        break
