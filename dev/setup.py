# /// script
# requires-python = ">=3.12"
# dependencies = ["PyYAML==6.0.3", "cryptography==50.0.0", "python-dotenv==1.2.2"]
# ///
"""Prepare workstation configuration, local backing storage, and S3 certificates."""

import json
import yaml
import socket
import argparse
import ipaddress
import subprocess
from dotenv import dotenv_values
from pathlib import Path
from datetime import UTC, datetime, timedelta
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = Path(__file__).resolve().parent


def configure() -> None:
    """Fill missing local settings without replacing existing workstation credentials."""

    # API startup reads an ordinary .env file in every environment.
    sample = dotenv_values(ROOT.parent / "api/.env.sample")
    path = ROOT.parent / "api/.env"
    existing = dotenv_values(path)
    with path.open("a") as output:
        path.chmod(0o600)
        for name, value in sample.items():
            if name not in existing and value is not None:
                output.write(f"\n{name}={json.dumps(value)}\n")


def kubectl(*arguments: str, content: str | None = None) -> str:
    """Run kubectl with the explicit local connection and keep Secrets out of logs."""

    result = subprocess.run(
        ["kubectl", "--kubeconfig", str(ROOT.parent / "api/kubeconfig.yaml"), *arguments],
        input=content,
        text=True,
        stdout=subprocess.PIPE,
        check=True,
    )
    return result.stdout


def prepare() -> None:
    """Install the development-only CSI driver and certificate resources."""

    # Both the host API and Pods must resolve the shared hostname through their normal resolvers.
    addresses = socket.getaddrinfo("storage.localhost", 9443, type=socket.SOCK_STREAM)
    if not addresses or not all(ipaddress.ip_address(address[4][0]).is_loopback for address in addresses):
        raise RuntimeError("Configure storage.localhost to resolve to loopback on this workstation before make up")

    # Select only the attach/provision subset of the pinned hostpath driver.
    documents: list[dict[str, object]] = [{"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": "longlink-development"}}]
    for filename in ("provisioner", "attacher", "driver", "plugin"):
        for document in yaml.safe_load_all((ROOT / f"compute/backing/hostpath-{filename}.yml").read_text()):
            if not document:
                continue
            kind = document["kind"]
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
            documents.append(document)
    documents.append(
        {
            "apiVersion": "storage.k8s.io/v1",
            "kind": "StorageClass",
            "metadata": {"name": "longlink-development"},
            "provisioner": "hostpath.csi.k8s.io",
            "reclaimPolicy": "Delete",
            "volumeBindingMode": "WaitForFirstConsumer",
        }
    )
    kubectl("apply", "--server-side", "--field-manager=longlink-development", "-f", "-", content=yaml.safe_dump_all(documents))
    kubectl("rollout", "status", "statefulset/csi-hostpathplugin", "-n", "longlink-development", "--timeout=300s")

    # Issue a certificate covering the shared endpoint and Rook's internal management hostname.
    certificates = ROOT / "certificates"
    authority = certificates.joinpath("ca.crt").read_text(encoding="ascii")
    ca = x509.load_pem_x509_certificate(authority.encode())
    ca_key = serialization.load_pem_private_key(certificates.joinpath("ca.key").read_bytes(), password=None)
    if not isinstance(ca_key, rsa.RSAPrivateKey):
        raise ValueError("Local development CA must use an RSA key")
    certificate_path = certificates / "storage.crt"
    key_path = certificates / "storage.key"
    if not certificate_path.exists() or not key_path.exists():
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, "storage.localhost")])
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
                        x509.DNSName("storage.localhost"),
                        x509.DNSName("rook-ceph-rgw-longlink.rook-ceph.svc"),
                        x509.DNSName("rook-ceph-rgw-longlink.rook-ceph.svc.cluster.local"),
                    ]
                ),
                critical=False,
            )
            .sign(ca_key, hashes.SHA256())
        )
        key_path.touch(mode=0o600)
        key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        certificate_path.write_bytes(certificate.public_bytes(serialization.Encoding.PEM) + authority.encode())
    kubectl("apply", "-f", "-", content="apiVersion: v1\nkind: Namespace\nmetadata:\n  name: rook-ceph\n")
    secret = kubectl(
        "create",
        "secret",
        "tls",
        "longlink-storage-tls",
        "-n",
        "rook-ceph",
        f"--cert={certificate_path}",
        f"--key={key_path}",
        "--dry-run=client",
        "-o",
        "yaml",
    )
    kubectl("apply", "--server-side", "--field-manager=longlink-development", "-f", "-", content=secret)

    # Split DNS keeps one S3 URL and TLS/signing identity for the host API and Solution Pods.
    kubectl("apply", "-k", str(ROOT / "compute/connectivity"))
    kubectl("rollout", "restart", "deployment/coredns", "-n", "kube-system")
    kubectl("rollout", "status", "deployment/coredns", "-n", "kube-system", "--timeout=120s")


def main() -> None:
    """Run local setup independently of the API package and runtime settings."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("configure", "prepare"))
    arguments = parser.parse_args()
    if arguments.action == "configure":
        configure()
    else:
        prepare()


if __name__ == "__main__":
    main()
