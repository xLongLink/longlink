import yaml
import asyncio
import contextlib
from kr8s import NotFoundError
from pathlib import Path
from datetime import UTC, datetime, timedelta
from cryptography import x509
from src.environments import env
from importlib.resources import files
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Secret, Namespace, StatefulSet, NetworkPolicy, new_class, object_from_spec
from src.kubernetes.utils import apply
from src.kubernetes.client import Kubernetes
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

CSIDriver = new_class("CSIDriver", "storage.k8s.io/v1", asyncio=True, namespaced=False, plural="csidrivers")
from src.kubernetes.storage import StorageClass


async def prepare(kubeconfig: Path) -> str:
    """Prepare the single-node development backing storage and return its public CA."""

    # This provisioner deliberately uses loop-backed files and is never installed by production reconciliation.
    if not env.DEVELOPMENT:
        raise RuntimeError("Local storage preparation requires DEVELOPMENT=true")
    cluster = Kubernetes(kubeconfig_mapping(kubeconfig.read_text(encoding="utf-8")))
    async with contextlib.aclosing(cluster), asyncio.timeout(300):
        api = await cluster.api()
        namespace = Namespace({"metadata": {"name": "longlink-development"}}, api=api)
        await apply(namespace)
        root = files("src.development").joinpath("templates")
        for filename in ("provisioner", "attacher", "driver", "plugin"):
            for document in yaml.safe_load_all(root.joinpath(f"hostpath-{filename}.yml").read_text()):
                if not document:
                    continue
                kind = document["kind"]
                # Only attach and provision are needed; omit snapshot, expansion, and health controllers and bindings.
                if kind in {"ClusterRoleBinding", "RoleBinding"} and document["roleRef"]["name"] not in {
                    "external-attacher-runner",
                    "external-attacher-cfg",
                    "external-provisioner-runner",
                    "external-provisioner-cfg",
                }:
                    continue
                if kind in {"Role", "RoleBinding", "ServiceAccount", "StatefulSet"}:
                    document["metadata"]["namespace"] = "longlink-development"
                for subject in document.get("subjects", []):
                    if subject["kind"] == "ServiceAccount":
                        subject["namespace"] = "longlink-development"
                if kind == "StatefulSet":
                    pod = document["spec"]["template"]["spec"]
                    pod["containers"] = [
                        container
                        for container in pod["containers"]
                        if container["name"] in {"hostpath", "node-driver-registrar", "liveness-probe", "csi-attacher", "csi-provisioner"}
                    ]
                resource = object_from_spec(document, api=api)
                await apply(resource)
        storage_class = StorageClass(
            {
                "metadata": {"name": "longlink-development"},
                "provisioner": "hostpath.csi.k8s.io",
                "reclaimPolicy": "Delete",
                "volumeBindingMode": "WaitForFirstConsumer",
            },
            api=api,
        )
        await apply(storage_class)
        driver = StatefulSet("csi-hostpathplugin", namespace="longlink-development", api=api)
        while True:
            await driver.refresh()
            status = driver.raw.get("status", {})
            if (
                status.get("readyReplicas") == 1
                and status.get("updatedReplicas") == 1
                and status.get("currentRevision") == status.get("updateRevision")
                and status.get("observedGeneration") == driver.metadata.get("generation")
            ):
                break
            await asyncio.sleep(2)

        # Reuse make up's local CA. The server certificate includes the internal service names used by Rook and SDK.
        certificates = Path(__file__).resolve().parents[3] / "dev/certificates"
        authority = certificates.joinpath("ca.crt").read_text(encoding="ascii")
        ca = x509.load_pem_x509_certificate(authority.encode())
        ca_key = serialization.load_pem_private_key(certificates.joinpath("ca.key").read_bytes(), password=None)
        if not isinstance(ca_key, rsa.RSAPrivateKey):
            raise ValueError("Local development CA must use an RSA key")
        namespace = Namespace({"metadata": {"name": "rook-ceph"}}, api=api)
        await apply(namespace)
        secret = Secret("longlink-storage-tls", namespace="rook-ceph", api=api)
        if not await secret.exists():
            key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, "LongLink development storage")])
            certificate = (
                x509.CertificateBuilder()
                .subject_name(name)
                .issuer_name(ca.subject)
                .public_key(key.public_key())
                .serial_number(x509.random_serial_number())
                .not_valid_before(datetime.now(UTC) - timedelta(minutes=1))
                .not_valid_after(min(datetime.now(UTC) + timedelta(days=365), ca.not_valid_after_utc))
                .add_extension(
                    x509.SubjectAlternativeName(
                        [
                            x509.DNSName("rook-ceph-rgw-longlink.rook-ceph.svc"),
                            x509.DNSName("rook-ceph-rgw-longlink.rook-ceph.svc.cluster.local"),
                        ]
                    ),
                    critical=False,
                )
                .sign(ca_key, hashes.SHA256())
            )
            secret = Secret(
                {
                    "metadata": {"name": "longlink-storage-tls", "namespace": "rook-ceph"},
                    "type": "kubernetes.io/tls",
                    "stringData": {
                        "tls.crt": certificate.public_bytes(serialization.Encoding.PEM).decode() + authority,
                        "tls.key": key.private_bytes(
                            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
                        ).decode(),
                    },
                },
                api=api,
            )
            await apply(secret)

        # Replace the previous external allow-all rule with authenticated API tunnels.
        policy = NetworkPolicy("longlink-local-api", namespace="kourier-system", api=api)
        try:
            await policy.delete()
        except NotFoundError:
            pass
    return authority


def main() -> None:
    """Prepare the local k3d compute created by make up."""

    asyncio.run(prepare(Path(__file__).resolve().parents[2] / "kubeconfig.yaml"))


if __name__ == "__main__":
    main()
