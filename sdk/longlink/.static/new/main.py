from fastapi import FastAPI
from longlink import LongLink
from src.routes import assets, requests
from src.resources import env

# Build Application routes before installing LongLink's runtime and frontend.
app = FastAPI()
app.include_router(assets.router)
app.include_router(requests.router)
longlink = LongLink(app, env=env.ENV)
