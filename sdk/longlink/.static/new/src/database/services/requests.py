from longlink import get_session
from sqlmodel import select
from sqlalchemy.orm import selectinload
from src.database.models.requests import PurchaseRequest


async def list_requests() -> list[PurchaseRequest]:
    """Return purchase requests with their platform-managed audit users."""

    async with get_session() as session:
        # Load audit relationships from LongLink's shared organization users for display.
        statement = (
            select(PurchaseRequest)
            .options(
                selectinload(PurchaseRequest.created_by),
                selectinload(PurchaseRequest.updated_by),
            )
            .order_by(PurchaseRequest.id)
        )
        result = await session.exec(statement)
        purchase_requests = list(result.all())

    return purchase_requests


async def get_request(request_id: int) -> PurchaseRequest | None:
    """Return one purchase request with its platform-managed audit users."""

    async with get_session() as session:
        # Load audit relationships from LongLink's shared organization users for display.
        statement = (
            select(PurchaseRequest)
            .options(
                selectinload(PurchaseRequest.created_by),
                selectinload(PurchaseRequest.updated_by),
            )
            .where(PurchaseRequest.id == request_id)
        )
        result = await session.exec(statement)
        request = result.first()

    if request is None:
        return None

    return request


async def create_request(title: str, amount: float, vendor: str, justification: str) -> PurchaseRequest:
    """Persist a purchase request and return it with its audit users."""

    request = PurchaseRequest(
        title=title,
        amount=amount,
        vendor=vendor,
        status="submitted",
        justification=justification,
    )

    async with get_session() as session:
        session.add(request)
        await session.commit()
        await session.refresh(request)

    # Reload through the public reader so create and list responses share one shape.
    created_request = await get_request(int(request.id or 0))
    if created_request is None:
        raise RuntimeError("Created purchase request could not be loaded")

    return created_request


async def update_request_status(request_id: int, status: str) -> PurchaseRequest | None:
    """Update one purchase request workflow status."""

    async with get_session() as session:
        request = await session.get(PurchaseRequest, request_id)
        if request is None:
            return None

        request.status = status
        session.add(request)
        await session.commit()

    return await get_request(request_id)
