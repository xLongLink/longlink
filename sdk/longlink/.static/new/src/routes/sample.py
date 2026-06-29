from fastapi import Depends
from longlink import Router
from longlink import db, fs
from src.envs import env
from src.types.user import UserModel
from src.services.sample import sample


router = Router()


@router.get("/sample")
async def sample_get_endpoint():
    """Handle sample GET request."""

    filesystem = fs
    return {
        "message": "Sample GET endpoint received data",
        "required": env.REQUIRED,
        "optional": env.OPTIONAL,
        "filesystem_protocol": filesystem.protocol,
        "filesystem_type": type(filesystem).__name__,
    }


@router.post("/sample")
async def sample_post_endpoint(session_maker=Depends(db.get_session)) -> UserModel:
    """Create a sample record and return a typed payload."""

    return await sample.create_project(session_maker)


@router.post("/form")
async def form_post_endpoint(payload: dict[str, object] | None = None) -> dict[str, object]:
    """Receive the account form example submission."""

    return {"message": "Form submission received", "payload": payload or {}}


@router.post("/order")
async def order_post_endpoint(payload: dict[str, object] | None = None) -> dict[str, object]:
    """Receive the fruit cart order example submission."""

    return {"message": "Order received", "payload": payload or {}}
