"""Route registration for the blank app scaffold."""

from longlink import Router


router = Router()


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Return a minimal health response."""

    return {"status": "ok"}


routers = [router]
