from longlink import LongLink
from src.routes import assets, requests

app = LongLink()
app.include_router(assets.router)
app.include_router(requests.router)
