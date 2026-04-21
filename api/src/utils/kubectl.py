from __future__ import annotations

from pathlib import Path

import yaml
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from src.env import env



def _resource_path(manifest: dict, default_namespace: str = "default") -> str:
    """Return the Kubernetes REST path for a manifest."""
    namespace = manifest.get("metadata", {}).get("namespace", default_namespace)
    name = manifest["metadata"]["name"]
    kind = manifest["kind"]

    if kind == "Deployment":
        return f"/apis/apps/v1/namespaces/{namespace}/deployments/{name}"
    if kind == "Service":
        return f"/api/v1/namespaces/{namespace}/services/{name}"
    if kind == "Ingress":
        return f"/apis/networking.k8s.io/v1/namespaces/{namespace}/ingresses/{name}"
    if kind == "ConfigMap":
        return f"/api/v1/namespaces/{namespace}/configmaps/{name}"
    if kind == "Secret":
        return f"/api/v1/namespaces/{namespace}/secrets/{name}"

    raise ValueError(f"Unsupported kind: {kind}")



def apply(f: str | Path, kubeconfig: str | Path | None = None) -> list[dict]:
    """Apply a multi-document YAML file to Kubernetes like `kubectl apply -f`."""
    file_path = Path(f).expanduser()
    kubeconfig_path = Path(
        kubeconfig or env.ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH
    ).expanduser()

    config.load_kube_config(config_file=str(kubeconfig_path))
    api = client.ApiClient()
    manifests = [
        manifest for manifest in yaml.safe_load_all(file_path.read_text(encoding="utf-8")) if manifest
    ]

    try:
        for manifest in manifests:
            path = _resource_path(manifest)
            api.call_api(
                path,
                "PATCH",
                header_params={"Content-Type": "application/apply-patch+yaml"},
                query_params=[("fieldManager", "kubectl"), ("force", "true")],
                body=manifest,
                response_type="object",
                _preload_content=False,
            )
    except ApiException as exc:
        raise ValueError(f"Failed to apply manifests from {file_path}") from exc

    return manifests
