import ssl
import tempfile
from contextlib import contextmanager
from collections.abc import Generator


@contextmanager
def certificate_file(pem: str) -> Generator[str]:
    """Yield a validated CA filename for exactly the caller's chosen resource lifetime."""

    # Validate before creating the file; publish its name only after the PEM has been flushed.
    ssl.create_default_context(cadata=pem)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".crt") as certificate:
        certificate.write(pem)
        certificate.flush()
        yield certificate.name
