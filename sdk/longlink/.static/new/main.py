from longlink import LongLink
from src.routes import items

app = LongLink()
app.include_router(items.router)
