import json
from pydantic import JsonValue
from sqlalchemy import Text
from sqlalchemy.engine import Dialect
from sqlalchemy_utils.types.encrypted.encrypted_type import StringEncryptedType


class EncryptedType(StringEncryptedType):
    """Encrypt JSON-compatible Platform credentials in a text column."""

    impl = Text
    cache_ok = True

    def __init__(self, key: str) -> None:
        """Configure credential encryption with the supplied Platform key."""

        super().__init__(Text, key)

    def process_bind_param(self, value: JsonValue, dialect: Dialect) -> str | None:
        """Serialize JSON before encryption independently of the database dialect."""

        # Encrypted text cannot delegate JSON encoding to a native PostgreSQL column.
        return super().process_bind_param(json.dumps(value) if value is not None else None, dialect)

    def process_result_value(self, value: str | None, dialect: Dialect) -> JsonValue:
        """Decode decrypted JSON identically on PostgreSQL and SQLite."""

        decrypted = super().process_result_value(value, dialect)
        return json.loads(decrypted) if decrypted is not None else None
