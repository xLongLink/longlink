from longlink import LongLink
from src.envs import env
from src.routes import assets, requests

app = LongLink(env=env)
app.include_router(assets.router)
app.include_router(requests.router)
