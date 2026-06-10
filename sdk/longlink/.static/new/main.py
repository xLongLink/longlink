from longlink import LongLink
from src.envs import env
from src.router import router


app = LongLink(env=env)


# Register routers
import src.routes.pages
import src.routes.sample
app.include_router(router)
