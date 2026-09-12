import ssl
from typing import override
from aiobotocore.httpsession import AIOHTTPSession


class Session(AIOHTTPSession):
    """Require hostname checks as well as CA checks on asynchronous S3 connections."""

    @override
    def _get_ssl_context(self) -> ssl.SSLContext:
        """Restore hostname verification omitted by botocore's urllib3 context factory."""

        # aiobotocore uses aiohttp, which does not perform urllib3's separate hostname assertion.
        context = super()._get_ssl_context()
        context.check_hostname = True
        return context
