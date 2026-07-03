from longlink import LongLink
from src.envs import env
from src.routes import requests

app = LongLink(env=env)
app.include_router(requests.router)
