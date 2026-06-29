from longlink import Router, fs
from src.envs import env

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


@router.post("/form")
async def form_post_endpoint(payload: dict[str, object] | None = None) -> dict[str, object]:
    """Receive the account form example submission."""

    return {"message": "Form submission received", "payload": payload or {}}


@router.post("/order")
async def order_post_endpoint(payload: dict[str, object] | None = None) -> dict[str, object]:
    """Receive the fruit cart order example submission."""

    return {"message": "Order received", "payload": payload or {}}
