from longlink import database
from sqlmodel import select
from src.database.models.requests import PurchaseRequest


async def list_requests() -> list[PurchaseRequest]:
    """Return purchase requests."""

    # Query requests for display.
    async with database.session() as session:
        statement = select(PurchaseRequest).order_by(PurchaseRequest.id)
        result = await session.exec(statement)
        purchase_requests = result.all()

    return purchase_requests


async def get_request(request_id: int) -> PurchaseRequest | None:
    """Return one purchase request."""

    # Query the request by id.
    async with database.session() as session:
        statement = select(PurchaseRequest).where(PurchaseRequest.id == request_id)
        result = await session.exec(statement)
        request = result.first()

    return request


async def create_request(text: str, amount: float) -> PurchaseRequest:
    """Persist and return a purchase request."""

    # Build the request from the validated route values.
    request = PurchaseRequest(text=text, amount=amount)

    # Persist and refresh the request so it includes its generated id.
    async with database.session() as session:
        session.add(request)
        await session.commit()
        await session.refresh(request)

    return request
