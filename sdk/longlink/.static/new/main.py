from longlink import LongLink
from src.envs import env
from src.router import router


app = LongLink(env=env)


# Register routers
app.include_router(router)
import src.routes.sample
