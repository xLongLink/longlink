from sqlalchemy import Column, Enum, Text
from sqlmodel import Field

from src.models.kinds import ComputeKind
from src.db.models.__base__ import Base


class ComputeRegistry(Base, table=True):
    """Represent a registered compute backend."""

    __tablename__ = "compute_registries"

    id: int = Field(default=None, primary_key=True)
    kind: ComputeKind = Field(
        sa_column=Column(Enum(ComputeKind, name="compute_kind_enum", native_enum=False), nullable=False)
    )
    kubeconfig: str = Field(sa_column=Column(Text, nullable=False))
    ingress_host: str = Field(max_length=255)
    ingress_name: str = Field(max_length=255)
