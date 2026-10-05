import os
import sys
import shutil
import tempfile
import subprocess  # noqa: S404
from pathlib import Path
from importlib.metadata import version
from longlink.cli.build import CONTEXT_IGNORE_PATTERNS


def main() -> None:
    """Build the local sample with a contained SDK dependency without editing it."""

    # Stage the sample and SDK without local environments, secrets, or generated state.
    sdk = Path(__file__).resolve().parents[2] / "sdk"
    uv = shutil.which("uv")
    if uv is None:
        raise RuntimeError("uv is required to build the local sample")
    environment = os.environ | {"SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK": version("longlink")}
    with tempfile.TemporaryDirectory(prefix="longlink-image-") as directory:
        solution = Path(directory)
        shutil.copytree(
            sdk / "dev",
            solution,
            dirs_exist_ok=True,
            symlinks=True,
            ignore=shutil.ignore_patterns(*CONTEXT_IGNORE_PATTERNS),
        )
        shutil.copytree(
            sdk,
            solution / "sdk",
            symlinks=True,
            ignore=shutil.ignore_patterns(*CONTEXT_IGNORE_PATTERNS, "dev"),
        )

        # Point only the staged sample at its contained SDK copy and refresh its lockfile.
        subprocess.run(  # noqa: S603
            [uv, "add", "--editable", "--no-workspace", "--no-sync", "./sdk"],
            cwd=solution,
            env=environment,
            check=True,
        )

        # Use the installed SDK CLI to build and push through the normal context filtering.
        subprocess.run(
            [sys.executable, "-m", "longlink", "build", "--registry", "localhost:15000", "--push", "--tag", "dev"],
            cwd=solution,
            env=environment,
            check=True,
        )


if __name__ == "__main__":
    main()
