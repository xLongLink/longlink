from __future__ import annotations
import os
import re
import yaml
from pathlib import Path
from kubernetes import client, config
from kubernetes.client.rest import ApiException

DEFAULT_KUBECONFIG = Path(__file__).resolve().parents[2] / "kubeconfig.yaml"
DEFAULT_STATE_PATH = Path(__file__).resolve().parents[2] / "state.yaml"


class ComputeConnectionError(RuntimeError):
    """Raised when the Kubernetes API cannot be reached or configured."""


class Compute:
    """Manage a persisted desired Kubernetes state for compute applications."""

    def __init__(
        self,
        kubeconfig_path: str | Path,
        state_path: str | Path = DEFAULT_STATE_PATH,
        namespace: str = "default",
        ingress_name: str = "control-ingress",
        ingress_host: str = "localhost",
    ) -> None:
        """Initialize the compute state manager and Kubernetes client."""
        self.kubeconfig_path = Path(kubeconfig_path).expanduser()
        self.state_path = Path(state_path).expanduser()
        self.namespace = namespace
        self.ingress_name = ingress_name
        self.ingress_host = ingress_host
        self.applications: dict[str, dict[str, str]] = {}
        self.api_client = self._load_api_client()

    def _load_api_client(self) -> client.ApiClient:
        """Load Kubernetes config and return a configured API client."""
        try:
            if self.kubeconfig_path.exists():
                config.load_kube_config(config_file=str(self.kubeconfig_path))
            elif DEFAULT_KUBECONFIG.exists():
                config.load_kube_config(config_file=str(DEFAULT_KUBECONFIG))
            else:
                config.load_incluster_config()
        except Exception as exc:
            raise ComputeConnectionError("Unable to load Kubernetes configuration") from exc

        return client.ApiClient()

    def _validate_name(self, value: str, label: str) -> None:
        """Validate a Kubernetes DNS label value."""
        if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
            raise ValueError(
                f"{label} must contain only lowercase letters, numbers, and hyphens"
            )

    def _base_router_deployment_manifest(self) -> dict:
        """Return the fallback deployment that keeps ingress routing valid."""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": "compute-router",
                "namespace": self.namespace,
                "labels": {
                    "managed-by": "control-plane",
                    "compute-role": "base",
                    "app": "compute-router",
                },
            },
            "spec": {
                "replicas": 1,
                "selector": {"matchLabels": {"app": "compute-router"}},
                "template": {
                    "metadata": {"labels": {"app": "compute-router"}},
                    "spec": {
                        "containers": [
                            {
                                "name": "compute-router",
                                "image": "hashicorp/http-echo:1.0.0",
                                "args": [
                                    "-listen=:5678",
                                    "-status=404",
                                    "-text=application not found",
                                ],
                                "ports": [{"containerPort": 5678}],
                            }
                        ]
                    },
                },
            },
        }

    def _base_router_service_manifest(self) -> dict:
        """Return the fallback service used as ingress default backend."""
        return {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": "compute-router",
                "namespace": self.namespace,
                "labels": {"managed-by": "control-plane", "compute-role": "base"},
            },
            "spec": {
                "selector": {"app": "compute-router"},
                "ports": [{"port": 5678, "targetPort": 5678}],
            },
        }

    def _deployment_manifest(self, name: str, image: str) -> dict:
        """Return the deployment manifest for one managed application."""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": name,
                "namespace": self.namespace,
                "labels": {
                    "managed-by": "control-plane",
                    "compute-role": "application",
                    "app": name,
                },
            },
            "spec": {
                "replicas": 1,
                "selector": {"matchLabels": {"app": name}},
                "template": {
                    "metadata": {"labels": {"app": name}},
                    "spec": {
                        "containers": [
                            {
                                "name": name,
                                "image": image,
                                "ports": [{"containerPort": 80}],
                            }
                        ]
                    },
                },
            },
        }

    def _service_manifest(self, name: str) -> dict:
        """Return the service manifest for one managed application."""
        return {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": name,
                "namespace": self.namespace,
                "labels": {
                    "managed-by": "control-plane",
                    "compute-role": "application",
                },
            },
            "spec": {
                "selector": {"app": name},
                "ports": [{"port": 80, "targetPort": 80}],
            },
        }

    def _ingress_manifest(self) -> dict:
        """Return the shared ingress manifest for all managed applications."""
        paths = []

        # Keep a single shared ingress and extend it as applications are added.
        for name in sorted(self.applications):
            paths.append(
                {
                    "path": f"/{name}(/|$)(.*)",
                    "pathType": "ImplementationSpecific",
                    "backend": {
                        "service": {"name": name, "port": {"number": 80}},
                    },
                }
            )

        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "Ingress",
            "metadata": {
                "name": self.ingress_name,
                "namespace": self.namespace,
                "annotations": {
                    "nginx.ingress.kubernetes.io/use-regex": "true",
                    "nginx.ingress.kubernetes.io/rewrite-target": "/$2",
                },
                "labels": {"managed-by": "control-plane", "compute-role": "base"},
            },
            "spec": {
                "ingressClassName": "nginx",
                "defaultBackend": {
                    "service": {
                        "name": "compute-router",
                        "port": {"number": 5678},
                    }
                },
                "rules": [
                    {
                        "host": self.ingress_host,
                        "http": {"paths": paths},
                    }
                ],
            },
        }

    def manifests(self) -> list[dict]:
        """Build the full desired cluster state from the current application map."""
        manifests = [
            self._base_router_service_manifest(),
            self._base_router_deployment_manifest(),
        ]

        for name, application in sorted(self.applications.items()):
            manifests.append(self._service_manifest(name))
            manifests.append(self._deployment_manifest(name, application["image"]))

        manifests.append(self._ingress_manifest())
        return manifests

    def save(self, filename: str | Path | None = None) -> Path:
        """Persist the current desired cluster state to YAML."""
        target = Path(filename).expanduser() if filename is not None else self.state_path
        target.parent.mkdir(parents=True, exist_ok=True)

        with target.open("w", encoding="utf-8") as file_handle:
            yaml.dump_all(self.manifests(), file_handle, sort_keys=False)

        return target

    def load(self, filename: str | Path | None = None) -> list[dict]:
        """Load state from YAML and rebuild the in-memory application map."""
        target = Path(filename).expanduser() if filename is not None else self.state_path
        if not target.exists():
            self.applications = {}
            return self.manifests()

        with target.open("r", encoding="utf-8") as file_handle:
            manifests = [manifest for manifest in yaml.safe_load_all(file_handle) if manifest]

        self.applications = {}

        # Rebuild managed applications from persisted deployment manifests.
        for manifest in manifests:
            if manifest.get("kind") != "Deployment":
                continue

            metadata = manifest.get("metadata", {})
            labels = metadata.get("labels", {})
            if labels.get("compute-role") != "application":
                continue

            containers = (
                manifest.get("spec", {})
                .get("template", {})
                .get("spec", {})
                .get("containers", [])
            )
            if not containers:
                continue

            name = metadata.get("name")
            image = containers[0].get("image")
            if name and image:
                self.applications[name] = {"image": image}

        return manifests

    def list(self) -> list[str]:
        """Return the active managed application names from persisted state."""
        self.load()
        return sorted(self.applications)

    def show(self) -> list[dict]:
        """Return the full persisted desired state manifests."""
        return self.load()

    def _apply_manifest(self, manifest: dict) -> object:
        """Apply a single manifest via Kubernetes server-side apply."""
        namespace = manifest["metadata"].get("namespace", self.namespace)
        name = manifest["metadata"]["name"]
        kind = manifest["kind"]

        if kind == "Deployment":
            path = f"/apis/apps/v1/namespaces/{namespace}/deployments/{name}"
        elif kind == "Service":
            path = f"/api/v1/namespaces/{namespace}/services/{name}"
        elif kind == "Ingress":
            path = f"/apis/networking.k8s.io/v1/namespaces/{namespace}/ingresses/{name}"
        else:
            raise ValueError(f"Unsupported kind: {kind}")

        return self.api_client.call_api(
            path,
            "PATCH",
            header_params={"Content-Type": "application/apply-patch+yaml"},
            query_params=[("fieldManager", "control-plane"), ("force", "true")],
            body=manifest,
            response_type="object",
            _preload_content=False,
        )

    def apply(self) -> list[dict]:
        """Apply the current desired state to the Kubernetes cluster."""
        manifests = self.manifests()
        order = {"Service": 1, "Deployment": 2, "Ingress": 3}
        manifests.sort(key=lambda manifest: order.get(manifest["kind"], 99))

        try:
            for manifest in manifests:
                self._apply_manifest(manifest)
        except ApiException as exc:
            raise ComputeConnectionError("Failed to apply manifests to Kubernetes") from exc

        return manifests

    def _delete_live_resource(self, kind: str, name: str) -> None:
        """Delete one live application resource if it exists."""
        try:
            if kind == "Deployment":
                client.AppsV1Api(self.api_client).delete_namespaced_deployment(name, self.namespace)
            elif kind == "Service":
                client.CoreV1Api(self.api_client).delete_namespaced_service(name, self.namespace)
            else:
                raise ValueError(f"Unsupported kind: {kind}")
        except ApiException as exc:
            if exc.status != 404:
                raise ComputeConnectionError(f"Failed deleting {kind} '{name}'") from exc

    def create(self, name: str, image: str) -> list[dict]:
        """Add or replace one managed application, then persist and apply state."""
        self._validate_name(self.namespace, "Namespace")
        self._validate_name(name, "Application name")
        self.applications[name] = {"image": image}
        self.save()
        return self.apply()

    def delete(self, name: str) -> list[dict]:
        """Remove one managed application, then persist and apply state."""
        self._validate_name(name, "Application name")
        self.applications.pop(name, None)
        self._delete_live_resource("Service", name)
        self._delete_live_resource("Deployment", name)
        self.save()
        return self.apply()


def _default_compute(namespace: str = "default") -> Compute:
    """Return a compute instance configured from the standard kubeconfig path."""
    kubeconfig_path = Path(os.environ.get("KUBECONFIG", "/app/kubeconfig")).expanduser()
    return Compute(kubeconfig_path=kubeconfig_path, namespace=namespace)


def _validate_kubernetes_name(value: str, label: str) -> None:
    """Validate a Kubernetes DNS label value before connecting to the cluster."""
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
        raise ValueError(
            f"{label} must contain only lowercase letters, numbers, and hyphens"
        )


async def create(
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None = None,
    args: list[str] | None = None,
    env_vars: dict[str, str] | None = None,
    container_port: int | None = None,
) -> list[dict]:
    """Backward-compatible async wrapper around the state-driven compute manager."""
    del command, args, env_vars, container_port
    _validate_kubernetes_name(namespace, "Namespace")
    _validate_kubernetes_name(pod_name, "Application name")
    compute = _default_compute(namespace=namespace)
    compute.load()
    return compute.create(name=pod_name, image=image)


async def delete(namespace: str, pod_name: str) -> list[dict]:
    """Backward-compatible async wrapper around application deletion."""
    _validate_kubernetes_name(namespace, "Namespace")
    _validate_kubernetes_name(pod_name, "Application name")
    compute = _default_compute(namespace=namespace)
    compute.load()
    return compute.delete(name=pod_name)


if __name__ == "__main__":
    manager = Compute(kubeconfig_path=DEFAULT_KUBECONFIG)
    manager.load()
    manager.create("sample1", "tiangolo/uvicorn-gunicorn-fastapi:python3.11")
    manager.create("sample2", "tiangolo/uvicorn-gunicorn-fastapi:python3.11")
    print(manager.list())
    print(manager.show())
    manager.delete("sample2")
