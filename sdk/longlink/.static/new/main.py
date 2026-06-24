from longlink import LongLink
from src.envs import env
from src.routes import router

app = LongLink(env=env)


import src.routes.pages
import src.routes.sample

app.include_router(router)
