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
import src.routes.auth
import src.routes.org
import src.routes.user
import src.routes.sample

app.include_router(router)


if __name__ == '__main__':
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv()

    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=True,
        access_log=False,
    )
