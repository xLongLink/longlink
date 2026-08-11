from longlink import database
from sqlmodel import select
from src.database.models.requests import PurchaseRequest, RequestAttachment


async def list_requests() -> list[PurchaseRequest]:
    """Return purchase requests."""

    # Query requests for display.
    async with database.session() as session:
        statement = select(PurchaseRequest).order_by(PurchaseRequest.id)
        result = await session.exec(statement)
        return result.all()


async def get_request(request_id: int) -> PurchaseRequest | None:
    """Return one purchase request."""

    # Query the request by id.
    async with database.session() as session:
        statement = select(PurchaseRequest).where(PurchaseRequest.id == request_id)
        result = await session.exec(statement)
        return result.first()


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


async def create_attachment(request_id: int, file_id: str) -> RequestAttachment:
    """Persist and return one request attachment record."""

    # Build attachment metadata after its file has been stored.
    attachment = RequestAttachment(request_id=request_id, file_id=file_id)

    # Persist and refresh Platform-supplied audit fields.
    async with database.session() as session:
        session.add(attachment)
        await session.commit()
        await session.refresh(attachment)

    return attachment


async def list_attachments(request_id: int) -> dict[str, RequestAttachment]:
    """Return active attachment records keyed by storage file id."""

    # Query active metadata with its uploader relationship.
    async with database.session() as session:
        statement = select(RequestAttachment).where(
            RequestAttachment.request_id == request_id,
            RequestAttachment.deleted_at.is_(None),
        )
        result = await session.exec(statement)
        attachments = result.all()

    return {attachment.file_id: attachment for attachment in attachments}
