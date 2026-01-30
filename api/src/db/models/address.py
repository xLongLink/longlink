import uuid
from src.types import AddressType, CountryCode
from sqlalchemy import Column, String, Enum
from src.db.models.__base__ import Base
from sqlalchemy.dialects.postgresql import UUID


class Address(Base):
    """
    Represent an address associated with an organization.
    """
    __tablename__ = "address"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(Enum(AddressType), nullable=False)

    city = Column(String, nullable=False)
    street = Column(String, nullable=False)
    region = Column(String, nullable=True)
    country = Column(Enum(CountryCode), nullable=False)
    postal_code = Column(String, nullable=False)
