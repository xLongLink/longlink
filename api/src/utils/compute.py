from __future__ import annotations

import re
import yaml
from string import Template
from pathlib import Path
from src.env import env
from src.utils import kubectl
from kubernetes import client, config
from src.constants import PATH
from kubernetes.client.rest import ApiException


TEMPLATES_PATH = PATH / "templates" / "compute"


def _validate_kubernetes_name(value: str, label: str) -> None:
    """Validate a Kubernetes DNS label value before connecting to the cluster."""
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
        raise ValueError(
            f"{label} must contain only lowercase letters, numbers, and hyphens"
        )


class Compute:
    """Manage a persisted desired Kubernetes state for compute applications."""

    def __init__(
        self,
        kubeconfig: str | Path,
        state_path: str | Path = "state.yaml",
        namespace: str = "default",
        ingress_name: str = "control-ingress",
        ingress_host: str = "localhost",
    ) -> None:
        """Initialize the compute state manager."""
        self.kubeconfig_path = Path(kubeconfig).expanduser()
        self.state_path = Path(state_path).expanduser()
        self.namespace = namespace
        self.ingress_name = ingress_name
        self.ingress_host = ingress_host
        self.applications: dict[str, dict[str, str]] = {}

    def _render_template(self, template_name: str, **context: str) -> dict:
        """Render one YAML template into a manifest dictionary."""
        template_text = TEMPLATES_PATH / template_name
        rendered = Template(template_text.read_text(encoding="utf-8")).safe_substitute(**context)
        return yaml.safe_load(rendered)

    def _api_client(self) -> client.ApiClient:
        """Return a Kubernetes API client for the configured kubeconfig."""
        config.load_kube_config(config_file=str(self.kubeconfig_path))
        return client.ApiClient()

    def _manifest_key(self, manifest: dict) -> tuple[str, str, str]:
        """Return the unique resource key for one manifest."""
        metadata = manifest["metadata"]
        return (
            manifest["kind"],
            metadata["name"],
            metadata.get("namespace", self.namespace),
        )

    def _managed_live_resources(self, api_client: client.ApiClient) -> list[tuple[str, str, str]]:
        """Return managed live resources in the configured namespace."""
        resources: list[tuple[str, str, str]] = []

        # Only reconcile resources created by the compute state manager.
        for kind, items in (
            (
                "Deployment",
                client.AppsV1Api(api_client).list_namespaced_deployment(self.namespace).items,
            ),
            (
                "Service",
                client.CoreV1Api(api_client).list_namespaced_service(self.namespace).items,
            ),
            (
                "Ingress",
                client.NetworkingV1Api(api_client).list_namespaced_ingress(self.namespace).items,
            ),
        ):
            for item in items:
                labels = item.metadata.labels or {}
                if labels.get("managed-by") != "control-plane":
                    continue
                if labels.get("compute-role") not in {"base", "application"}:
                    continue
                resources.append((kind, item.metadata.name, item.metadata.namespace or self.namespace))

        return resources

    def _delete_live_resource(
        self,
        api_client: client.ApiClient,
        kind: str,
        name: str,
        namespace: str,
    ) -> None:
        """Delete one live managed resource if it exists."""
        try:
            if kind == "Deployment":
                client.AppsV1Api(api_client).delete_namespaced_deployment(name, namespace)
            elif kind == "Service":
                client.CoreV1Api(api_client).delete_namespaced_service(name, namespace)
            elif kind == "Ingress":
                client.NetworkingV1Api(api_client).delete_namespaced_ingress(name, namespace)
            else:
                raise ValueError(f"Unsupported kind: {kind}")
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting {kind} '{name}'") from exc

    def _ingress_paths(self) -> list[dict]:
        """Return the ingress paths for the current application set."""
        return [
            {
                "path": f"/{name}(/|$)(.*)",
                "pathType": "ImplementationSpecific",
                "backend": {"service": {"name": name, "port": {"number": 80}}},
            }
            for name in sorted(self.applications)
        ]

    def _base_manifests(self) -> list[dict]:
        """Return the shared router manifests required for all application states."""
        return [
            self._render_template("base-router-service.yml", namespace=self.namespace),
            self._render_template("base-router-deployment.yml", namespace=self.namespace),
        ]

    def _application_manifests(self) -> list[dict]:
        """Return the service and deployment manifests for managed applications."""
        manifests: list[dict] = []
        for name, application in sorted(self.applications.items()):
            manifests.append(
                self._render_template(
                    "application-service.yml",
                    name=name,
                    namespace=self.namespace,
                )
            )
            manifests.append(
                self._render_template(
                    "application-deployment.yml",
                    image=application["image"],
                    name=name,
                    namespace=self.namespace,
                )
            )
        return manifests

    def _ingress_manifest(self) -> dict:
        """Return the shared ingress manifest for all managed applications."""
        paths = self._ingress_paths()
        manifest = self._render_template(
            "ingress.yml",
            ingress_host=self.ingress_host,
            ingress_name=self.ingress_name,
            namespace=self.namespace,
        )

        # An ingress rule cannot contain an empty paths list, so drop rules entirely
        # when only the default backend should remain.
        if paths:
            manifest["spec"]["rules"][0]["http"]["paths"] = paths
        else:
            manifest["spec"].pop("rules", None)

        return manifest

    def manifests(self) -> list[dict]:
        """Build the full desired cluster state from the current application map."""
        manifests = self._base_manifests()
        manifests.extend(self._application_manifests())
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

    def apply(self) -> list[dict]:
        """Apply the current desired state to the Kubernetes cluster."""
        target = self.save()
        manifests = kubectl.apply(target, kubeconfig=self.kubeconfig_path)
        desired_resources = {self._manifest_key(manifest) for manifest in manifests}
        api_client = self._api_client()

        # Prune managed resources that are no longer present in the desired state.
        for kind, name, namespace in self._managed_live_resources(api_client):
            if (kind, name, namespace) in desired_resources:
                continue
            self._delete_live_resource(api_client, kind, name, namespace)

        return manifests

    def create(self, name: str, image: str) -> list[dict]:
        """Add or replace one managed application, then persist and apply state."""
        _validate_kubernetes_name(self.namespace, "Namespace")
        _validate_kubernetes_name(name, "Application name")
        self.applications[name] = {"image": image}
        return self.apply()

    def delete(self, name: str) -> list[dict]:
        """Remove one managed application, then persist and apply state."""
        _validate_kubernetes_name(name, "Application name")
        self.applications.pop(name, None)
        return self.apply()



compute = Compute(kubeconfig=env.ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH, namespace=env.ENV_PROVISION_COMPUTE_NAMESPACE)


if __name__ == "__main__":
    compute.load()
    compute.create("sample1", "tiangolo/uvicorn-gunicorn-fastapi:python3.11")
    compute.create("sample2", "tiangolo/uvicorn-gunicorn-fastapi:python3.11")
    print(compute.list())
    compute.delete("sample2")
    compute.delete("sample1")
    print(compute.list())
