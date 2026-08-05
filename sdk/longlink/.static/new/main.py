from fastapi import FastAPI
from longlink import LongLink
from src.routes import requests

# Build Application routes before installing LongLink's runtime and frontend.
app = FastAPI()
app.include_router(requests.router)
longlink = LongLink(app)
