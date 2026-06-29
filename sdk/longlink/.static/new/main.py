from longlink import LongLink
from src.envs import env
from src.routes import pages, sample, inventory

app = LongLink(env=env)
app.include_router(pages.router)
app.include_router(sample.router)
app.include_router(inventory.router)
