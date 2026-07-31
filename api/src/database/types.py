from typing import override
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator
from src.models.types import PlatformVersion
from sqlalchemy.engine import Dialect


class PlatformVersionType(TypeDecorator[str]):
    """Store canonical LongLink Platform versions as validated strings."""

    impl = String(64)
    cache_ok = True

    @override
    def process_bind_param(self, value: PlatformVersion | str | None, dialect: Dialect) -> str:
        """Validate one Platform version before persistence."""

        # Required version columns reject null values before database execution.
        if value is None:
            raise ValueError("Platform version is required")
        return str(PlatformVersion(value))

    @override
    def process_result_value(self, value: str | None, dialect: Dialect) -> PlatformVersion:
        """Validate one persisted Platform version before exposing it."""

        # Required version columns cannot expose null values.
        if value is None:
            raise ValueError("Platform version is required")
        return PlatformVersion(value)
