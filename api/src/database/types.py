from typing import override
from sqlalchemy import String, Text
from sqlalchemy_utils import JSONType
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator
from sqlalchemy_utils.types.encrypted.encrypted_type import AesEngine, StringEncryptedType
from src.models.types import PlatformVersion


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


class EncryptedType(StringEncryptedType):
    """Encrypt JSON-compatible Platform credentials in a text column."""

    impl = Text
    cache_ok = True

    def __init__(self, key: str) -> None:
        """Configure AES encryption with the supplied Platform key."""

        super().__init__(JSONType, key, AesEngine)
