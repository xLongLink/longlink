from typing import override
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator
from src.models.types import PlatformVersion
from sqlalchemy.engine import Dialect


class PlatformVersionType(TypeDecorator[str]):
    """Store canonical LongLink Platform versions as validated strings."""

    impl = String(128)
    cache_ok = True

    @override
    def process_bind_param(self, value: PlatformVersion | str | None, dialect: Dialect) -> str | None:
        """Validate one Platform version before persistence."""

        # Nullable compute versions represent unreconciled registries.
        if value is None:
            return None
        return str(PlatformVersion(value))

    @override
    def process_result_value(self, value: str | None, dialect: Dialect) -> PlatformVersion | None:
        """Validate one persisted Platform version before exposing it."""

        # Nullable compute versions represent unreconciled registries.
        if value is None:
            return None
        return PlatformVersion(value)
