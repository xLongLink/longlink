# TODO: Import everything here? 
# TODO: Settings??


from src.app import app
from src.routes.sample import router as sample_router
from src.pages.settings import router as settings_router


if not getattr(app, "_sample_routes_registered", False):
    app.register(sample_router)
    app.register(settings_router)
    app._sample_routes_registered = True


if __name__ == '__main__':
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv()

    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=1707,
        reload=True,
        access_log=False,
    )
