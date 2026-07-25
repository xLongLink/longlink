from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))


def hash(password: str) -> str:
    """Hash one password with the preferred LongLink password hasher."""

    # New credentials use Argon2 while the configured verifier retains bcrypt support.
    return password_hash.hash(password)


def verify(password: str, hashed_password: str) -> tuple[bool, str | None]:
    """Verify one password and return an upgraded hash when its scheme is obsolete."""

    # Upgrade successful legacy hashes and treat malformed or overlong bcrypt inputs as failed credentials.
    try:
        return password_hash.verify_and_update(password, hashed_password)
    except ValueError:
        return False, None
