from fastapi import FastAPI
from longlink import LongLink
from src.routes import items

# Build Solution routes before installing LongLink's runtime and frontend.
app = FastAPI()
app.include_router(items.router)
LongLink(app)
