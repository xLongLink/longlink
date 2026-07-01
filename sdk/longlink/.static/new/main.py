from longlink import LongLink
from src.envs import env
from src.routes import files, inventory, submissions

app = LongLink(env=env)
app.include_router(files.router)
app.include_router(inventory.router)
app.include_router(submissions.router)
