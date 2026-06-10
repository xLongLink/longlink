from src.envs import env
from fastapi import Depends
from longlink import db, fs
from src.router import router
from src.types.user import UserModel
from src.services.sample import sample


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
