import ssl
import tempfile
from typing import override
from contextlib import contextmanager
from collections.abc import Iterator
from aiobotocore.httpsession import AIOHTTPSession


@contextmanager
def certificate_file(pem: str) -> Iterator[str]:
    """Yield a validated CA filename for exactly the caller's chosen resource lifetime."""

    # Validate before creating the file; publish its name only after the PEM has been flushed.
    ssl.create_default_context(cadata=pem)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".crt") as certificate:
        certificate.write(pem)
        certificate.flush()
        yield certificate.name


@contextmanager
def verified_location(pem: str | None) -> Iterator[str | None]:
    """Yield a CA filename for private endpoints while keeping public trust as None."""

    # Keep the no-certificate path explicit so callers can distinguish default trust.
    if pem is None:
        yield None
        return

    with certificate_file(pem) as filename:
        yield filename


def path_style_options() -> dict[str, str]:
    """Return S3 path-style addressing shared by every platform object-storage client."""

    return {"addressing_style": "path"}


class Session(AIOHTTPSession):
    """Require hostname checks as well as CA checks on asynchronous S3 connections."""

    @override
    def _get_ssl_context(self) -> ssl.SSLContext:
        """Restore hostname verification omitted by botocore's urllib3 context factory."""

        # aiobotocore uses aiohttp, which does not perform urllib3's separate hostname assertion.
        context = super()._get_ssl_context()
        context.check_hostname = True
        return context
