import ssl
import yaml
import httpx2
import asyncio
from typing import TYPE_CHECKING
from urllib.parse import urlsplit
from src.environments import env
from importlib.resources import files
from kr8s.asyncio.objects import Secret, Service, Namespace, Deployment, CustomResourceDefinition, new_class, object_from_spec
from src.kubernetes.utils import apply, deployment_is_ready, wait_crd_established

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

KNATIVE_VERSION = "v1.23.0"
CNPG_VERSION = "v1.29.1"
KOURIER_ENVOY_IMAGE = "docker.io/envoyproxy/envoy@sha256:ea33a83e4bb1b34b9345f1d98930af9c70d19a0ee1680d9ff087789636fdbc34"

# Register release resource kinds not supplied by kr8s for object_from_spec's version-aware lookup.
MutatingWebhookConfigurationResource = new_class(
    "MutatingWebhookConfiguration",
    "admissionregistration.k8s.io/v1",
    asyncio=True,
    namespaced=False,
    plural="mutatingwebhookconfigurations",
)
ValidatingWebhookConfigurationResource = new_class(
    "ValidatingWebhookConfiguration",
    "admissionregistration.k8s.io/v1",
    asyncio=True,
    namespaced=False,
    plural="validatingwebhookconfigurations",
)
CertificateResource = new_class("Certificate", "networking.internal.knative.dev/v1alpha1", asyncio=True, plural="certificates")
ImageResource = new_class("Image", "caching.internal.knative.dev/v1alpha1", asyncio=True, plural="images")


class Gateway:
    """Install the fresh-cluster Serving, Kourier, and database control planes."""

    def __init__(self, client: "Kubernetes") -> None:
        """Share the Compute Kubernetes connection."""

        self._client = client

    async def apply(self, gateway_url: str, gateway_certificate: str | None = None) -> None:
        """Reconcile shared controllers and verify the operator-configured HTTPS endpoint."""

        # Validate the configured trust before any cluster mutation; never generate client identities.
        endpoint = urlsplit(gateway_url)
        if (
            endpoint.scheme != "https"
            or not endpoint.hostname
            or endpoint.username is not None
            or endpoint.password is not None
            or endpoint.path not in {"", "/"}
            or endpoint.query
            or endpoint.fragment
        ):
            raise ValueError("Gateway endpoint must be an HTTPS origin")
        context = ssl.create_default_context(cadata=gateway_certificate)
        api = await self._client.api()

        # Install deny-by-default shared ingress before any data-plane Pods can accept tenant traffic.
        root = files("src.kubernetes.templates").joinpath("platform")
        for document in yaml.safe_load_all(root.joinpath("gateway.yml").read_text()):
            resource = object_from_spec(document, api=api)
            await apply(resource)

        # The operator owns certificate issuance, renewal, DNS, and the external source allowlist.
        secret = Secret("longlink-gateway-tls", namespace="knative-serving", api=api)
        await secret.refresh()
        if not secret.raw.get("data", {}).get("tls.crt") or not secret.raw.get("data", {}).get("tls.key"):
            raise ValueError("knative-serving/longlink-gateway-tls requires tls.crt and tls.key")

        # Apply pinned releases in dependency order, including CRD establishment and current rollouts.
        try:
            async with asyncio.timeout(15 * 60):
                for filename in (
                    f"serving-crds-{KNATIVE_VERSION}.yml",
                    f"serving-core-{KNATIVE_VERSION}.yml",
                    f"kourier-{KNATIVE_VERSION}.yml",
                    f"cnpg-{CNPG_VERSION}.yml",
                ):
                    deployments: list[Deployment] = []
                    documents = [document for document in yaml.safe_load_all(root.joinpath(filename).read_text()) if document]
                    documents.sort(key=lambda document: {"Namespace": 0, "CustomResourceDefinition": 1}.get(document["kind"], 2))
                    for document in documents:
                        kind = document["kind"]
                        name = document["metadata"]["name"]

                        # Configure supported Pod fields and account for queue-proxy in tenant quotas.
                        if kind == "ConfigMap" and name == "config-network":
                            document["data"]["ingress-class"] = "kourier.ingress.networking.knative.dev"
                        if kind == "ConfigMap" and name == "config-features":
                            document["data"].update(
                                {
                                    "kubernetes.podspec-nodeselector": "enabled",
                                    "kubernetes.podspec-securitycontext": "enabled",
                                    "kubernetes.podspec-volumes-emptydir": "enabled",
                                    "secure-pod-defaults": "enabled",
                                }
                            )
                        if kind == "ConfigMap" and name == "config-deployment":
                            document["data"].update(
                                {
                                    "queue-sidecar-cpu-request": "25m",
                                    "queue-sidecar-cpu-limit": "200m",
                                    "queue-sidecar-memory-request": "64Mi",
                                    "queue-sidecar-memory-limit": "128Mi",
                                    "queue-sidecar-ephemeral-storage-request": "64Mi",
                                    "queue-sidecar-ephemeral-storage-limit": "128Mi",
                                }
                            )
                        if kind == "ConfigMap" and name == "config-kourier":
                            document["data"]["cluster-cert-secret"] = "longlink-gateway-tls"

                        # Only cluster-local TLS is published; no public HTTP or external-route listener.
                        if kind == "Deployment" and name == "3scale-kourier-gateway":
                            document["spec"]["template"]["spec"]["containers"][0]["image"] = KOURIER_ENVOY_IMAGE
                        if kind == "Service" and name == "kourier":
                            document["spec"]["ports"] = [{"name": "https", "port": 443, "targetPort": 8444, "protocol": "TCP"}]
                            document["spec"]["externalTrafficPolicy"] = "Local"

                        # Preserve certificate authorities injected by webhook controllers after installation.
                        if kind in {"MutatingWebhookConfiguration", "ValidatingWebhookConfiguration"}:
                            existing = object_from_spec(
                                {"apiVersion": document["apiVersion"], "kind": kind, "metadata": {"name": name}},
                                api=api,
                            )
                            if await existing.exists():
                                await existing.refresh()
                                authorities = {
                                    webhook["name"]: webhook.get("clientConfig", {}).get("caBundle")
                                    for webhook in existing.raw.get("webhooks", [])
                                }
                                for webhook in document["webhooks"]:
                                    authority = authorities.get(webhook["name"])
                                    if authority:
                                        webhook["clientConfig"]["caBundle"] = authority

                        # kr8s globally registers custom kinds by name; keep Knative's Service from shadowing core Services.
                        resource = (
                            Service(document, api=api)
                            if kind == "Service" and document["apiVersion"] == "v1"
                            else object_from_spec(document, api=api)
                        )
                        await apply(resource)
                        if isinstance(resource, CustomResourceDefinition):
                            await wait_crd_established(resource)
                        if isinstance(resource, Deployment):
                            deployments.append(resource)

                    for deployment in deployments:
                        while True:
                            await deployment.refresh()
                            if deployment_is_ready(deployment):
                                break
                            await asyncio.sleep(5)

                    # Do not admit database work until CNPG publishes trust for every admission webhook.
                    if filename == f"cnpg-{CNPG_VERSION}.yml":
                        mutating_webhooks = object_from_spec(
                            {
                                "apiVersion": "admissionregistration.k8s.io/v1",
                                "kind": "MutatingWebhookConfiguration",
                                "metadata": {"name": "cnpg-mutating-webhook-configuration"},
                            },
                            api=api,
                        )
                        validating_webhooks = object_from_spec(
                            {
                                "apiVersion": "admissionregistration.k8s.io/v1",
                                "kind": "ValidatingWebhookConfiguration",
                                "metadata": {"name": "cnpg-validating-webhook-configuration"},
                            },
                            api=api,
                        )
                        for configuration in (mutating_webhooks, validating_webhooks):
                            while True:
                                await configuration.refresh()
                                webhooks = configuration.raw.get("webhooks", [])
                                if webhooks and all(webhook.get("clientConfig", {}).get("caBundle") for webhook in webhooks):
                                    break
                                await asyncio.sleep(1)

                # Keep TLS SNI bound to the configured endpoint while addressing Kourier's local readiness vhost.
                if env.DEVELOPMENT:
                    from src.development import gateway

                    port = await self._client.portforward("kourier", "kourier-system", 8444)
                    transport = gateway.Transport(port, gateway_certificate)
                    client = httpx2.AsyncClient(transport=transport, follow_redirects=False, trust_env=False, timeout=300.0)
                else:
                    client = httpx2.AsyncClient(verify=context, trust_env=False, timeout=10, follow_redirects=False)
                async with client:
                    while True:
                        try:
                            response = await client.get(f"{gateway_url.rstrip('/')}/ready", headers={"Host": "internalkourier"})
                        except httpx2.TransportError:
                            await asyncio.sleep(5)
                            continue
                        if response.status_code == 200:
                            return
                        await asyncio.sleep(5)
        except TimeoutError:
            raise RuntimeError("Shared controllers or verified Kourier endpoint did not become ready") from None

    async def delete(self) -> None:
        """Remove dedicated shared namespaces after all tenant resources have been deleted."""

        # Keep CRDs and cluster RBAC; deleting CRDs could destroy a surviving database and its data.
        api = await self._client.api()
        for namespace in ("kourier-system", "knative-serving", "cnpg-system"):
            resource = Namespace(namespace, api=api)
            if await resource.exists():
                await resource.delete()
                await resource.wait("delete")
