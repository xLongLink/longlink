from longlink import db
from sqlmodel import select
from sqlalchemy.orm import selectinload
from src.schemas.requests import PurchaseRequestRead
from src.database.models.requests import PurchaseRequest


async def list_requests() -> list[PurchaseRequestRead]:
    """Return purchase requests with their platform-managed audit users."""

    session_maker = await db.get_session()

    async with session_maker() as session:
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
        purchase_requests = result.all()

    return [_purchase_request_read(request) for request in purchase_requests]


async def get_request(request_id: int) -> PurchaseRequestRead | None:
    """Return one purchase request with its platform-managed audit users."""

    session_maker = await db.get_session()

    async with session_maker() as session:
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

    return _purchase_request_read(request)


async def create_request(title: str, amount: float, vendor: str, justification: str) -> PurchaseRequestRead:
    """Persist a purchase request and return it with its audit users."""

    session_maker = await db.get_session()
    request = PurchaseRequest(
        title=title,
        amount=amount,
        vendor=vendor,
        status="submitted",
        justification=justification,
    )

    async with session_maker() as session:
        session.add(request)
        await session.commit()
        await session.refresh(request)

    # Reload through the public reader so create and list responses share one shape.
    created_request = await get_request(int(request.id or 0))
    if created_request is None:
        raise RuntimeError("Created purchase request could not be loaded")

    return created_request


async def update_request_status(request_id: int, status: str) -> PurchaseRequestRead | None:
    """Update one purchase request workflow status."""

    session_maker = await db.get_session()
    async with session_maker() as session:
        request = await session.get(PurchaseRequest, request_id)
        if request is None:
            return None

        request.status = status
        session.add(request)
        await session.commit()

    return await get_request(request_id)


def _purchase_request_read(request: PurchaseRequest) -> PurchaseRequestRead:
    """Return the API schema for one purchase request row."""

    return PurchaseRequestRead(
        id=request.id,
        title=request.title,
        amount=request.amount,
        status=request.status,
        vendor=request.vendor,
        justification=request.justification,
        created_by=request.created_by,
        updated_by=request.updated_by,
    )
