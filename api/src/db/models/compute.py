from sqlmodel import Field
from src.db.models.__base__ import Base


class ComputeRegistry(Base, table=True):
    """Represent a registered compute backend."""

    __tablename__ = "compute_registries"

    name: str = Field(primary_key=True, max_length=128)
    kube_config_path: str = Field(max_length=255)
    ingress_host: str = Field(max_length=255)
    ingress_name: str = Field(max_length=255)
