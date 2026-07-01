from longlink import Router

router = Router()


@router.post("/form")
async def form_post_endpoint(payload: dict[str, object] | None = None) -> dict[str, object]:
    """Receive the account form example submission."""

    return {"message": "Form submission received", "payload": payload or {}}


@router.post("/order")
async def order_post_endpoint(payload: dict[str, object] | None = None) -> dict[str, object]:
    """Receive the fruit cart order example submission."""

    return {"message": "Order received", "payload": payload or {}}
