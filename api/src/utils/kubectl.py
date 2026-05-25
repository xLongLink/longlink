from __future__ import annotations

import yaml
import subprocess
from pathlib import Path
from kubernetes import client, config


# kubectl get pods
def apply(f: str | Path, kube_config_path: str) -> list[dict]:
    """Apply a multi-document YAML state file to Kubernetes like `kubectl apply -f`."""
    file_path = Path(f).expanduser()
    kpath = Path(kube_config_path).expanduser()

    # Parse manifests first so callers can keep working with the exact applied state.
    manifests = [
        manifest for manifest in yaml.safe_load_all(file_path.read_text(encoding="utf-8")) if manifest
    ]

    try:
        # Use the kubectl binary so runtime behavior matches direct cluster operations.
        # We always apply from a persisted YAML state file, never from ad-hoc objects.
        subprocess.run(
            ["kubectl", "apply", "--kubeconfig", str(kpath), "-f", str(file_path)],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        detail = f": {stderr}" if stderr else ""
        raise ValueError(f"Failed to apply manifests from {file_path}{detail}") from exc

    return manifests


def registry(
    name: str,
    server: str,
    username: str,
    password: str,
    email: str,
    kube_config_path: str,
) -> None:
    """Create a Docker registry pull secret like `kubectl create secret docker-registry`."""
    kpath = Path(kube_config_path).expanduser()

    # Use the kubectl CLI so the generated secret matches cluster-native behavior.
    try:
        subprocess.run(
            [
                "kubectl",
                "create",
                "secret",
                "docker-registry",
                name,
                f"--docker-server={server}",
                f"--docker-username={username}",
                f"--docker-password={password}",
                f"--docker-email={email}",
                "--kubeconfig",
                str(kpath),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        detail = f": {stderr}" if stderr else ""
        raise ValueError(f"Failed to create secret {name}{detail}") from exc


def logs(name: str, namespace: str, kube_config_path: str) -> str:
    """Return the logs for the first pod matching an app label."""
    config.load_kube_config(config_file=str(Path(kube_config_path).expanduser()))
    core_api = client.CoreV1Api()

    try:
        pods = core_api.list_namespaced_pod(namespace, label_selector=f"app={name}")
        for pod in pods.items:
            try:
                return core_api.read_namespaced_pod_log(
                    pod.metadata.name,
                    namespace,
                    tail_lines=50,
                )
            except client.ApiException:
                continue
    except client.ApiException as exc:
        raise ValueError(f"Failed to fetch logs for app {name}") from exc

    raise ValueError(f"No pods found for app {name}")
