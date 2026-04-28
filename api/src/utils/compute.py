from __future__ import annotations

import yaml
from pathlib import Path
from src.env import env
from src.constants import PATH
from src.utils.validate import knames
from src.utils.templates import yaml as template_yaml

TEMPLATES_PATH = PATH / "templates" / "compute"


class Compute:
    """Manage a persisted desired Kubernetes state for compute applications."""

    def __init__(
        self,
        state_path: str | Path = "state.yaml",
        namespace: str = "default",
        ingress_name: str = "control-ingress",
        ingress_host: str = "localhost",
    ) -> None:
        """Initialize the compute state manager."""
        self.state_path = Path(state_path).expanduser()
        self.namespace = namespace
        self.ingress_name = ingress_name
        self.ingress_host = ingress_host
        self.applications: dict[str, dict[str, str]] = {}

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
            template_yaml(TEMPLATES_PATH / "base-router-service.yml", namespace=self.namespace),
            template_yaml(TEMPLATES_PATH / "base-router-deployment.yml", namespace=self.namespace),
        ]

    def _application_manifests(self) -> list[dict]:
        """Return the service and deployment manifests for managed applications."""
        manifests: list[dict] = []
        for name, application in sorted(self.applications.items()):
            manifests.append(
                template_yaml(
                    TEMPLATES_PATH / "application-service.yml",
                    name=name,
                    namespace=self.namespace,
                )
            )
            manifests.append(
                template_yaml(
                    TEMPLATES_PATH / "application-deployment.yml",
                    image=application["image"],
                    name=name,
                    namespace=self.namespace,
                )
            )
        return manifests

    def _ingress_manifest(self) -> dict:
        """Return the shared ingress manifest for all managed applications."""
        paths = self._ingress_paths()
        manifest = template_yaml(
            TEMPLATES_PATH / "ingress.yml",
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

    def create(self, name: str, image: str) -> list[dict]:
        """Add or replace one managed application, then persist state."""
        knames(self.namespace, "Namespace")
        knames(name, "Application name")
        self.applications[name] = {"image": image}
        self.save()
        return self.manifests()

    def delete(self, name: str) -> list[dict]:
        """Remove one managed application, then persist state."""
        knames(name, "Application name")
        self.applications.pop(name, None)
        self.save()
        return self.manifests()



compute = Compute(namespace=env.ENV_PROVISION_COMPUTE_NAMESPACE)


if __name__ == "__main__":
    compute.load()
    compute.create("sample1", "tiangolo/uvicorn-gunicorn-fastapi:python3.11")
    compute.create("sample2", "tiangolo/uvicorn-gunicorn-fastapi:python3.11")
    print(compute.list())
    compute.delete("sample2")
    compute.delete("sample1")
    print(compute.list())
