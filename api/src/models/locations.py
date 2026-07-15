from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.statuses import LocationStatus
from src.models.countries import Country
from src.models.operations import OperationResponse
from src.models.infrastructure import ComputeConfiguration, StorageConfiguration, DatabaseConfiguration


class LocationCreate(BaseModel):
    """Define one immutable aggregate of compute, database, and storage configuration.

    Connection secrets are accepted for LongLink Platform use but excluded from location and registry responses.
    """

    # Metadata
    name: str = Field(min_length=1, max_length=255)
    country: Country

    # Immutable infrastructure
    compute: ComputeConfiguration
    storage: StorageConfiguration
    database: DatabaseConfiguration


class LocationResponse(BaseModel):
    """Expose the identity and observed reconciliation state of one location.

    The location owns its immutable infrastructure registries without exposing their connection secrets.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    country: Country

    # State
    status: LocationStatus
    version: str | None


class LocationMutationResponse(BaseModel):
    """Pair an accepted location desired-state change with its reconciliation operation.

    Acceptance confirms persistence and queueing, not completed infrastructure convergence.
    """

    # Result
    location: LocationResponse
    operation: OperationResponse
