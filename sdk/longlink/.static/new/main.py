from longlink import LongLink, create_engine
from src.routes import assets, requests
from src.resources import env

create_engine(env)
app = LongLink(env=env)
app.include_router(assets.router)
app.include_router(requests.router)
