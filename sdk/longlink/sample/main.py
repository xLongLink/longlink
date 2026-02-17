# TODO: Import everything here? 
# TODO: Settings??


from src.app import app
from src.routes.sample import router as sample_router

app.register(sample_router)
