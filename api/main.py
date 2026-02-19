from fastapi import FastAPI
from src.router import router
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware


app = FastAPI(
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8000',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.add_middleware(
    SessionMiddleware,
    secret_key='1234',
    same_site='lax',
    https_only=False,
)


# Register routers
import src.routes.apps
import src.routes.auth
import src.routes.user
import src.routes.users
import src.routes.sample
import src.routes.settings

app.include_router(router)


if __name__ == '__main__':
    import asyncio
    import uvicorn

    import src.db as db

    async def register_sample_app() -> None:
        apps = await db.apps.list()
        sample_exists = any(app.name == 'sample' for app in apps)
        if not sample_exists:
            await db.apps.create('sample', 'http://localhost:1707')

    asyncio.run(register_sample_app())

    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=True
    )
