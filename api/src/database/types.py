from sqlalchemy import Text
from sqlalchemy_utils import JSONType
from sqlalchemy_utils.types.encrypted.encrypted_type import StringEncryptedType


class EncryptedType(StringEncryptedType):
    """Encrypt JSON-compatible Platform credentials in a text column."""

    impl = Text
    cache_ok = True

    def __init__(self, key: str) -> None:
        """Configure credential encryption with the supplied Platform key."""

        super().__init__(JSONType, key)
