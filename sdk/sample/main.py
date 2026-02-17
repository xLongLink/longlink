# TODO: Import everything here? 
# TODO: Settings??


from src.app import app


# Register routes
import src.routes.sample
import src.pages.settings


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

