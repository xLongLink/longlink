from longlink import get_session
from sqlmodel import select
from sqlalchemy.orm import selectinload
from src.database.models.requests import PurchaseRequest


async def list_requests() -> list[PurchaseRequest]:
    """Return purchase requests with their platform-managed audit users."""

    # Query requests and eagerly load their shared audit users for display.
    async with get_session() as session:
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


async def get_request(request_id: int, include_audit_users: bool = True) -> PurchaseRequest | None:
    """Return one purchase request, optionally with its platform-managed audit users."""

    # Query the request and load audit users only when its response needs them.
    async with get_session() as session:
        statement = select(PurchaseRequest).where(PurchaseRequest.id == request_id)
        if include_audit_users:
            statement = statement.options(
                selectinload(PurchaseRequest.created_by),
                selectinload(PurchaseRequest.updated_by),
            )
        result = await session.exec(statement)
        request = result.first()

    if request is None:
        return None

    return request


async def create_request(title: str, amount: float, vendor: str, justification: str) -> PurchaseRequest:
    """Persist a purchase request and return it with its audit users."""

    # Build the submitted request from the validated route values.
    request = PurchaseRequest(
        title=title,
        amount=amount,
        vendor=vendor,
        status="submitted",
        justification=justification,
    )

    # Persist the request before reloading its public response shape.
    async with get_session() as session:
        session.add(request)
        await session.commit()

    # Reload through the public reader so create and list responses share one shape.
    created_request = await get_request(int(request.id or 0))
    if created_request is None:
        raise RuntimeError("Created purchase request could not be loaded")

    return created_request


async def update_request_status(request_id: int, status: str) -> PurchaseRequest | None:
    """Update one purchase request workflow status."""

    # Load the request and return immediately when it does not exist.
    async with get_session() as session:
        statement = (
            select(PurchaseRequest)
            .options(
                selectinload(PurchaseRequest.created_by),
                selectinload(PurchaseRequest.updated_by),
            )
            .where(PurchaseRequest.id == request_id)
        )
        request = (await session.exec(statement)).first()
        if request is None:
            return None

        # Persist the requested workflow status.
        request.status = status
        await session.commit()

    return request
