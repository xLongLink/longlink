from longlink import LongLink
from src.routes import assets, requests
from src.resources import env

# Build the LongLink application and register its API routes.
app = LongLink(env=env)
app.include_router(assets.router)
app.include_router(requests.router)
