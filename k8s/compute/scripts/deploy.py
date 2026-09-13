# /// script
# requires-python = ">=3.12"
# dependencies = ["PyYAML==6.0.3"]
# ///
"""Render and apply a pinned Compute package using kubectl and Kustomize."""

import json
import time
import yaml
import fcntl
import hashlib
import argparse
import subprocess
from pathlib import Path
from datetime import UTC, datetime

ROOT = Path(__file__).resolve().parents[1]


def mapping(value: object) -> dict[str, object]:
    """Validate a YAML or JSON mapping at the process boundary."""

    # Refuse malformed documents before constructing Kubernetes commands.
    if not isinstance(value, dict) or any(not isinstance(key, str) for key in value):
        raise ValueError("Expected a mapping with string keys")
    return dict(value)


def run(*arguments: str, content: str | None = None) -> str:
    """Run an explicit command and propagate errors without printing Secret content."""

    result = subprocess.run(arguments, input=content, text=True, stdout=subprocess.PIPE, check=True)
    return result.stdout


def render(overlay: Path) -> list[dict[str, object]]:
    """Render all stages before making any cluster changes."""

    # An environment replaces individual stages with overlays referencing package bases.
    if not overlay.is_dir():
        raise ValueError("Environment overlay directory does not exist")
    release = mapping(yaml.safe_load(ROOT.joinpath("release.yaml").read_text()))
    stages = release["stages"]
    if not isinstance(stages, list) or not all(isinstance(stage, str) for stage in stages):
        raise ValueError("Release stages must be paths")
    rendered = []
    for stage in stages:
        directory = overlay / stage if (overlay / stage / "kustomization.yaml").exists() else ROOT / stage
        documents = [mapping(document) for document in yaml.safe_load_all(run("kubectl", "kustomize", str(directory))) if document]
        rendered.append({"name": stage, "documents": documents})
    return rendered


def deploy(kubeconfig: str, overlay: Path, expected_uid: str, adopt: bool) -> None:
    """Install or resume a supported release with component readiness gates."""

    # Render and validate target identity before mutating any resource.
    stages = render(overlay)
    release = mapping(yaml.safe_load(ROOT.joinpath("release.yaml").read_text()))
    command = ("kubectl", "--kubeconfig", kubeconfig, "--request-timeout=60s")
    uid = run(*command, "get", "namespace", "kube-system", "-o", "jsonpath={.metadata.uid}")
    if uid != expected_uid:
        raise ValueError("Compute cluster UID does not match the selected environment")
    version = mapping(json.loads(run(*command, "version", "-o", "json")))
    server = mapping(version["serverVersion"])
    minor = int(str(server["minor"]).rstrip("+"))
    supported = mapping(release["kubernetes"])
    if str(server["major"]) != "1" or not int(str(supported["minimumMinor"])) <= minor <= int(str(supported["maximumMinor"])):
        raise ValueError("Kubernetes version is outside the package compatibility range")

    # Missing release metadata on an occupied cluster requires explicit ownership adoption.
    upgrades = release["upgradeFrom"]
    if not isinstance(upgrades, list):
        raise ValueError("Supported upgrade paths must be a list")
    digest = hashlib.sha256(json.dumps(stages, sort_keys=True).encode()).hexdigest()
    previous = run(*command, "get", "configmap", "compute-release", "-n", "longlink-system", "--ignore-not-found", "-o", "json")
    if previous:
        data = mapping(mapping(json.loads(previous))["data"])
        if data.get("clusterUID") != uid:
            raise ValueError("Installed release belongs to another physical cluster")
        if data.get("version") != release["version"] and data.get("version") not in upgrades:
            raise ValueError("No supported upgrade path from the installed release")
    elif not adopt:
        pending = run(*command, "get", "configmap", "compute-deployment", "-n", "longlink-system", "--ignore-not-found", "-o", "json")
        existing = run(*command, "get", "deployment", "rook-ceph-operator", "-n", "rook-ceph", "--ignore-not-found", "-o", "name")
        if existing and not pending:
            raise ValueError("Existing infrastructure has no release record; review it and use --adopt with Platform workers stopped")
        if pending:
            data = mapping(mapping(json.loads(pending))["data"])
            if data.get("clusterUID") != uid or data.get("configurationDigest") != digest:
                raise ValueError("Resume the interrupted configuration before selecting a different package")

    # Validate externally provisioned storage and certificates before installing controllers.
    for namespace, name in (("knative-serving", "longlink-gateway-tls"), ("rook-ceph", "longlink-storage-tls")):
        certificate = mapping(json.loads(run(*command, "get", "secret", name, "-n", namespace, "-o", "json")))
        data = mapping(certificate.get("data", {}))
        if not data.get("tls.crt") or not data.get("tls.key"):
            raise ValueError(f"{namespace}/{name} requires a TLS certificate and key")
    for stage in stages:
        documents = stage["documents"]
        if isinstance(documents, list):
            for item in documents:
                document = mapping(item)
                if document.get("kind") == "CephCluster":
                    spec = mapping(document["spec"])
                    mon = mapping(spec["mon"])
                    claim = mapping(mapping(mon["volumeClaimTemplate"])["spec"])
                    run(*command, "get", "storageclass", str(claim["storageClassName"]), "-o", "name")

    # Persist attempt identity before controllers can continue work beyond this process lifetime.
    run(*command, "apply", "--server-side", "--field-manager=longlink-compute", "-f", str(ROOT / "boundaries/namespace.yml"))
    attempt = {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {"name": "compute-deployment", "namespace": "longlink-system"},
        "data": {"clusterUID": uid, "configurationDigest": digest, "version": str(release["version"])},
    }
    run(*command, "apply", "--server-side", "--field-manager=longlink-compute", "-f", "-", content=yaml.safe_dump(attempt))

    # Apply individual documents so CRDs establish before resources referencing them.
    for stage in stages:
        print(f"Applying {stage['name']}", flush=True)
        documents = stage["documents"]
        if not isinstance(documents, list):
            raise ValueError("Stage documents must be a list")
        ordered = sorted(documents, key=lambda item: {"Namespace": 0, "CustomResourceDefinition": 1}.get(str(mapping(item)["kind"]), 2))
        deployments: list[tuple[str, str]] = []
        webhooks: list[tuple[str, str]] = []
        for item in ordered:
            document = mapping(item)
            metadata = mapping(document["metadata"])
            kind, name = str(document["kind"]), str(metadata["name"])
            namespace = str(metadata.get("namespace", "default"))

            # Admission controllers own injected authorities; the package never claims these fields.
            if kind in {"MutatingWebhookConfiguration", "ValidatingWebhookConfiguration"}:
                hooks = document.get("webhooks", [])
                if not isinstance(hooks, list):
                    raise ValueError("Webhook configuration requires a list")
                cleaned = []
                for hook in hooks:
                    webhook = mapping(hook)
                    if name.endswith(".serving.knative.dev"):
                        webhook.pop("rules", None)
                    config = mapping(webhook["clientConfig"])
                    config.pop("caBundle", None)
                    webhook["clientConfig"] = config
                    cleaned.append(webhook)
                document["webhooks"] = cleaned
                webhooks.append((kind, name))
            run(*command, "apply", "--server-side", "--field-manager=longlink-compute", "-f", "-", content=yaml.safe_dump(document))
            if kind == "CustomResourceDefinition":
                run(*command, "wait", f"crd/{name}", "--for=condition=Established", "--timeout=120s")
            if kind == "Deployment":
                deployments.append((namespace, name))

        # Wait for this stage's current rollout and admission trust before moving on.
        for namespace, name in deployments:
            print(f"Waiting for {namespace}/{name}", flush=True)
            run(*command, "rollout", "status", f"deployment/{name}", "-n", namespace, "--timeout=900s")
        for kind, name in webhooks:
            deadline = time.monotonic() + 180
            while True:
                value = mapping(json.loads(run(*command, "get", kind, name, "-o", "json")))
                hooks = value.get("webhooks")
                if isinstance(hooks, list) and hooks and all(mapping(mapping(hook)["clientConfig"]).get("caBundle") for hook in hooks):
                    break
                if time.monotonic() >= deadline:
                    raise TimeoutError(f"Admission trust not ready: {name}")
                time.sleep(2)

    # Ceph readiness must acknowledge the current desired generation, including the probe identity.
    for resource, name in (("cephclusters", "rook-ceph"), ("cephobjectstores", "longlink"), ("cephobjectstoreusers", "longlink-health")):
        print(f"Waiting for {resource}/{name}", flush=True)
        deadline = time.monotonic() + 1800
        while True:
            value = mapping(json.loads(run(*command, "get", resource, name, "-n", "rook-ceph", "-o", "json")))
            status = mapping(value.get("status", {}))
            metadata = mapping(value["metadata"])
            if status.get("phase") == "Ready" and status.get("observedGeneration") == metadata.get("generation"):
                break
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Storage did not converge: {resource}/{name}")
            time.sleep(5)

    # Only successful convergence advances the release record; configuration content participates in its digest.
    record = {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {"name": "compute-release", "namespace": "longlink-system"},
        "data": {
            "version": str(release["version"]),
            "contract": str(release["contract"]),
            "clusterUID": uid,
            "configurationDigest": digest,
            "completedAt": datetime.now(UTC).isoformat(),
            "components": json.dumps(release["components"], sort_keys=True),
        },
    }
    run(*command, "apply", "--server-side", "--field-manager=longlink-compute", "-f", "-", content=yaml.safe_dump(record))
    run(*command, "delete", "configmap", "compute-deployment", "-n", "longlink-system")
    print(f"Compute {uid}: release {release['version']} ready", flush=True)


def main() -> None:
    """Expose rendering and deployment without importing the Platform application."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("render", "apply"))
    parser.add_argument("--overlay", type=Path, required=True)
    parser.add_argument("--kubeconfig")
    parser.add_argument("--cluster-uid")
    parser.add_argument("--adopt", action="store_true", help="adopt reviewed existing resources with Platform workers stopped")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--local", action="store_true", help="acquire the local API's exclusive deployment lock")
    mode.add_argument("--offline", action="store_true", help="deploy a hosted Compute with all Platform workers stopped")
    arguments = parser.parse_args()
    if arguments.action == "render":
        for stage in render(arguments.overlay.resolve()):
            documents = stage["documents"]
            if isinstance(documents, list):
                print(yaml.safe_dump_all(documents, explicit_start=True), end="")
        return
    if not arguments.kubeconfig or not arguments.cluster_uid:
        parser.error("apply requires --kubeconfig and --cluster-uid")
    if arguments.local:
        with (ROOT.parents[1] / "dev/compute.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                parser.error("Stop local Platform workers before running make compute")
            deploy(arguments.kubeconfig, arguments.overlay.resolve(), arguments.cluster_uid, arguments.adopt)
    elif arguments.offline:
        deploy(arguments.kubeconfig, arguments.overlay.resolve(), arguments.cluster_uid, arguments.adopt)
    else:
        parser.error("apply requires --local or --offline; online hosted maintenance is not implemented yet")


if __name__ == "__main__":
    main()
