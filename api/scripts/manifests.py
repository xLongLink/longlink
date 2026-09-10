import json
import hashlib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK_FILE = ROOT / "kubernetes-manifests.json"
MAX_MANIFEST_BYTES = 20 * 1024 * 1024


def checksum(content: bytes) -> str:
    """Return the SHA-256 checksum for manifest content."""

    return hashlib.sha256(content).hexdigest()


def download(url: str) -> bytes:
    """Download one bounded HTTPS manifest."""

    # Release sources are immutable HTTPS URLs recorded in the checksum lock file.
    if not url.startswith("https://"):
        raise ValueError(f"Manifest URL must use HTTPS: {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "LongLink manifest builder"})
    with urllib.request.urlopen(request, timeout=60) as response:
        if not response.geturl().startswith("https://"):
            raise ValueError(f"Manifest redirect must use HTTPS: {response.geturl()}")
        content = response.read(MAX_MANIFEST_BYTES + 1)
    if len(content) > MAX_MANIFEST_BYTES:
        raise ValueError(f"Manifest exceeds {MAX_MANIFEST_BYTES} bytes: {url}")
    return content


def prepare() -> None:
    """Download missing or invalid Kubernetes manifests and verify their checksums."""

    # Load the complete pinned dependency set before mutating generated package data.
    manifests = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    if not isinstance(manifests, dict):
        raise ValueError("Kubernetes manifest lock must contain an object")

    for relative_path, source in manifests.items():
        if not isinstance(relative_path, str) or not isinstance(source, dict):
            raise ValueError("Kubernetes manifest lock entries are invalid")
        path = Path(relative_path)
        if path.is_absolute() or ".." in path.parts:
            raise ValueError(f"Kubernetes manifest path is invalid: {relative_path}")
        url = source.get("url")
        expected = source.get("sha256")
        if not isinstance(url, str) or not isinstance(expected, str) or len(expected) != 64:
            raise ValueError(f"Kubernetes manifest source is invalid: {relative_path}")

        # Reuse valid generated files so ordinary local commands do not require network access.
        destination = ROOT / path
        if destination.is_file() and checksum(destination.read_bytes()) == expected:
            continue

        content = download(url)
        actual = checksum(content)
        if actual != expected:
            raise ValueError(f"Checksum mismatch for {url}: expected {expected}, received {actual}")

        # Replace generated package data only after the complete response is verified.
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(f"{destination.suffix}.tmp")
        temporary.write_bytes(content)
        temporary.replace(destination)
        print(f"Prepared {relative_path}")


def main() -> None:
    """Prepare checksum-locked Kubernetes package data."""

    prepare()


if __name__ == "__main__":
    main()
