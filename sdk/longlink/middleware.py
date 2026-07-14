import re
from fastapi import FastAPI
from starlette.types import Send, Scope, ASGIApp, Message, Receive
from starlette.datastructures import Headers, MutableHeaders
from starlette.middleware.gzip import GZipResponder

HASHED_ASSET_PATH = re.compile(r"^/assets/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$")
INCOMPRESSIBLE_SUFFIXES = (".avif", ".gif", ".gz", ".ico", ".jpeg", ".jpg", ".png", ".webp", ".woff2", ".zip")


def accepts_gzip(value: str) -> bool:
    """Return whether an Accept-Encoding value permits gzip."""

    gzip_quality: float | None = None
    wildcard_quality: float | None = None

    # Parse gzip and wildcard quality values rather than using a substring check.
    for item in value.split(","):
        encoding, *parameters = item.split(";")
        normalized_encoding = encoding.strip().lower()
        if normalized_encoding not in {"gzip", "*"}:
            continue

        quality = 1.0
        for parameter in parameters:
            name, separator, raw_quality = parameter.partition("=")
            if separator and name.strip().lower() == "q":
                try:
                    quality = float(raw_quality.strip())
                except ValueError:
                    quality = 0.0

        normalized_quality = quality if 0.0 <= quality <= 1.0 else 0.0
        if normalized_encoding == "gzip":
            gzip_quality = normalized_quality
        else:
            wildcard_quality = normalized_quality

    quality = gzip_quality if gzip_quality is not None else wildcard_quality
    return quality is not None and quality > 0.0


class FrontendMiddleware:
    """Apply safe compression and browser cache policies to LongLink responses."""

    def __init__(self, app: ASGIApp) -> None:
        """Prepare identity and gzip response paths for one application."""

        self.app = app
        self.minimum_size = 1000
        self.compresslevel = 6

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Compress eligible responses and adjust their cache headers."""

        # Pass non-HTTP scopes through without response policy changes.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_headers = Headers(scope=scope)
        path = scope["path"]
        compression_candidate = "range" not in request_headers and not path.lower().endswith(INCOMPRESSIBLE_SUFFIXES)
        use_gzip = compression_candidate and accepts_gzip(request_headers.get("accept-encoding", ""))

        async def send_with_headers(message: Message) -> None:
            """Apply representation and cache headers before the response starts."""

            # Body messages do not carry response headers.
            if message["type"] != "http.response.start":
                await send(message)
                return

            headers = MutableHeaders(scope=message)
            status = message["status"]
            content_type = headers.get("content-type", "")

            # Shared caches must distinguish identity and gzip-capable requests.
            vary_values = {item.strip().lower() for item in headers.get("vary", "").split(",")}
            if compression_candidate and "accept-encoding" not in vary_values:
                headers.add_vary_header("Accept-Encoding")

            # Potentially compressed resources share one weak validator across representations.
            etag = headers.get("etag")
            if etag and compression_candidate and not etag.startswith("W/"):
                headers["etag"] = f"W/{etag}"

            # Preserve explicit route policies before applying frontend defaults.
            if "cache-control" not in headers:
                if content_type.startswith("text/html") and status in {200, 206, 304}:
                    headers["cache-control"] = "no-cache"
                elif HASHED_ASSET_PATH.fullmatch(path) and status in {200, 206, 304}:
                    headers["cache-control"] = "public, max-age=31536000, immutable"
                elif path.startswith("/assets/"):
                    headers["cache-control"] = "no-store" if status >= 400 else "no-cache"
                elif path == "/favicon.ico" and status in {200, 206, 304}:
                    headers["cache-control"] = "public, max-age=86400"

            await send(message)

        # Range responses retain identity byte offsets; other eligible responses may use gzip.
        if use_gzip:
            responder = GZipResponder(self.app, self.minimum_size, compresslevel=self.compresslevel)
            await responder(scope, receive, send_with_headers)
            return

        await self.app(scope, receive, send_with_headers)


def install_frontend_middleware(app: FastAPI) -> None:
    """Install safe compression and cache policies for embedded frontend bundles."""

    app.add_middleware(FrontendMiddleware)
