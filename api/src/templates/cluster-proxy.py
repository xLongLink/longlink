from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import ssl
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, parse, request


SECRET = os.environ["LONGLINK_PROXY_SECRET"].encode("utf-8")
SERVICE_TOKEN_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/token"
SERVICE_CA_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
KUBE_API_HOST = "https://kubernetes.default.svc"
EXPECTED_ISSUER = "longlink-control-plane"
EXPECTED_AUDIENCE = "longlink-proxy"

HOP_BY_HOP_HEADERS = {
    "connection",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


def _b64url_encode(value: bytes) -> str:
    """Encode bytes as an unpadded base64url string."""

    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    """Decode an unpadded base64url string."""

    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _validate_control_plane_token(token: str) -> bool:
    """Validate one short-lived control-plane token."""

    parts = token.split(".")
    if len(parts) != 3:
        return False

    header_b64, payload_b64, signature_b64 = parts
    signed = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(SECRET, signed, hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_encode(expected_signature), signature_b64):
        return False

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except json.JSONDecodeError:
        return False

    now = int(time.time())
    if payload.get("iss") != EXPECTED_ISSUER:
        return False
    if payload.get("aud") != EXPECTED_AUDIENCE:
        return False
    if int(payload.get("exp", 0)) <= now:
        return False

    return True


class GatewayHandler(BaseHTTPRequestHandler):
    """Authenticate control-plane requests and proxy them into Kubernetes."""

    def _service_token(self) -> str:
        """Read the service account token mounted in the gateway pod."""

        with open(SERVICE_TOKEN_PATH, encoding="utf-8") as token_file:
            return token_file.read().strip()

    def _forward(self) -> None:
        """Forward one authenticated request to the Kubernetes API server."""

        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer ") or not _validate_control_plane_token(auth_header.removeprefix("Bearer ").strip()):
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"kind":"Status","status":"Failure","reason":"Unauthorized","code":401}')
            return

        body = None
        content_length = self.headers.get("Content-Length")
        if content_length:
            body = self.rfile.read(int(content_length))

        target_url = f"{KUBE_API_HOST}{self.path}"
        upstream_request = request.Request(target_url, data=body, method=self.command)
        for key, value in self.headers.items():
            lowered = key.lower()
            if lowered in HOP_BY_HOP_HEADERS or lowered == "authorization" or lowered == "content-length":
                continue
            upstream_request.add_header(key, value)

        upstream_request.add_header("Authorization", f"Bearer {self._service_token()}")
        context = ssl.create_default_context(cafile=SERVICE_CA_PATH)

        try:
            with request.urlopen(upstream_request, context=context, timeout=30) as upstream_response:
                payload = upstream_response.read()
                self.send_response(upstream_response.status)
                for key, value in upstream_response.headers.items():
                    lowered = key.lower()
                    if lowered in HOP_BY_HOP_HEADERS or lowered == "content-length":
                        continue
                    self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        except error.HTTPError as exc:
            payload = exc.read()
            self.send_response(exc.code)
            for key, value in exc.headers.items():
                lowered = key.lower()
                if lowered in HOP_BY_HOP_HEADERS or lowered == "content-length":
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def do_DELETE(self) -> None:  # noqa: N802
        """Handle DELETE requests."""

        self._forward()

    def do_GET(self) -> None:  # noqa: N802
        """Handle GET requests."""

        self._forward()

    def do_HEAD(self) -> None:  # noqa: N802
        """Handle HEAD requests."""

        self._forward()

    def do_OPTIONS(self) -> None:  # noqa: N802
        """Handle OPTIONS requests."""

        self._forward()

    def do_PATCH(self) -> None:  # noqa: N802
        """Handle PATCH requests."""

        self._forward()

    def do_POST(self) -> None:  # noqa: N802
        """Handle POST requests."""

        self._forward()

    def do_PUT(self) -> None:  # noqa: N802
        """Handle PUT requests."""

        self._forward()


def main() -> None:
    """Run the in-cluster gateway server."""

    server = ThreadingHTTPServer(("0.0.0.0", 5678), GatewayHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
