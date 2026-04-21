from __future__ import annotations

import subprocess
from pathlib import Path

import yaml
from src.env import env


def apply(f: str | Path, kubeconfig: str | Path | None = None) -> list[dict]:
    """Apply a multi-document YAML file to Kubernetes like `kubectl apply -f`."""
    file_path = Path(f).expanduser()
    kubeconfig_path = Path(
        kubeconfig or env.ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH
    ).expanduser()

    manifests = [
        manifest for manifest in yaml.safe_load_all(file_path.read_text(encoding="utf-8")) if manifest
    ]

    try:
        # Use the kubectl binary so runtime behavior matches direct cluster operations.
        subprocess.run(
            ["kubectl", "apply", "--kubeconfig", str(kubeconfig_path), "-f", str(file_path)],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        detail = f": {stderr}" if stderr else ""
        raise ValueError(f"Failed to apply manifests from {file_path}{detail}") from exc

    return manifests
