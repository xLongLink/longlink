import yaml
import pytest
import asyncio
import jsonschema
from uuid import uuid4
from aiohttp import web
from src.utils import templates
from aiohttp.test_utils import TestServer
from importlib.resources import files
from src.kubernetes.client import Kubernetes
from src.database.models.computes import ComputeRegistry

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize("instances", [1, 3])
def test_storage_topology_matches_pinned_rook_schemas(instances: int) -> None:
    """Validate actual production manifests against their pinned operator contracts."""

    # Read the packaged CRDs, rather than duplicating the Rook field definitions.
    root = files("src.kubernetes.templates").joinpath("platform")
    schemas = {
        document["spec"]["names"]["kind"]: next(
            version["schema"]["openAPIV3Schema"] for version in document["spec"]["versions"] if version["storage"]
        )
        for document in yaml.safe_load_all(root.joinpath("rook-crds-v1.19.11.yml").read_text())
        if document and document["kind"] == "CustomResourceDefinition"
    }
    documents = templates.readyml_list(
        root.joinpath("storage.yml"),
        storage_class='"block-storage"',
        size_gib=100,
        instances=instances,
        managers=min(instances, 2),
        safe_replica_size="true" if instances > 1 else "false",
    )
    for document in documents:
        if document["kind"] in schemas:
            jsonschema.validate(document, schemas[document["kind"]])

    # Production consumes explicitly assigned PVCs and never discovers arbitrary host disks.
    cluster, store, storage_class = documents
    assert cluster["spec"]["storage"]["useAllDevices"] is False
    assert cluster["spec"]["storage"]["storageClassDeviceSets"][0]["volumeClaimTemplates"][0]["spec"]["volumeMode"] == "Block"
    assert store["spec"]["gateway"]["securePort"] == 443
    assert store["spec"]["gateway"]["port"] == 0
    assert storage_class["reclaimPolicy"] == "Delete"


async def test_quota_waits_for_rook_acknowledgement_of_existing_bound_claim() -> None:
    """Exercise real Kubernetes HTTP calls: Bound with stale quotas cannot release the lifecycle gate."""

    # The transport boundary starts with a Bound claim whose associated bucket still has old quotas.
    organization = uuid4()
    uid = str(uuid4())
    observed = asyncio.Event()
    acknowledge = asyncio.Event()
    compute = ComputeRegistry(bucket_size_bytes=8192, bucket_max_objects=2)

    async def handle(request: web.Request) -> web.Response:
        """Serve the minimal Kubernetes resource protocol while controlling Rook's acknowledgement."""

        if request.path.rstrip("/") == "/version":
            return web.json_response({"major": "1", "minor": "35", "gitVersion": "v1.35.0"})
        if "objectbucketclaims" in request.path:
            if request.method == "PATCH":
                payload = await request.json()
                assert payload == {"spec": {"additionalConfig": {"bucketMaxSize": "8192", "bucketMaxObjects": "2"}}}
            return web.json_response(
                {
                    "apiVersion": "objectbucket.io/v1alpha1",
                    "kind": "ObjectBucketClaim",
                    "metadata": {"name": "storage", "uid": uid, "namespace": f"longlink-storage-{organization.hex}"},
                    "spec": {"objectBucketName": "bound-bucket"},
                    "status": {"phase": "Bound"},
                }
            )
        if "objectbuckets" in request.path:
            observed.set()
            return web.json_response(
                {
                    "apiVersion": "objectbucket.io/v1alpha1",
                    "kind": "ObjectBucket",
                    "metadata": {"name": "bound-bucket"},
                    "spec": {
                        "claimRef": {"uid": uid},
                        "endpoint": {
                            "additionalConfig": {
                                "bucketMaxSize": "8192" if acknowledge.is_set() else "16384",
                                "bucketMaxObjects": "2",
                            }
                        },
                    },
                }
            )
        raise web.HTTPNotFound()

    # Run the production reconciler against a real local HTTP server without replacing resource methods or timers.
    app = web.Application()
    app.router.add_route("*", "/{path:.*}", handle)
    async with TestServer(app) as server:
        cluster = Kubernetes(
            {
                "clusters": [{"name": "test", "cluster": {"server": str(server.make_url("/"))}}],
                "contexts": [{"name": "test", "context": {"cluster": "test", "user": "test"}}],
                "users": [{"name": "test", "user": {}}],
                "current-context": "test",
            }
        )
        task = asyncio.create_task(cluster.storage.quota(organization, compute))
        try:
            try:
                await asyncio.wait_for(observed.wait(), timeout=5)
            except TimeoutError:
                if task.done():
                    await task
                raise
            assert not task.done()
            acknowledge.set()
            await asyncio.wait_for(task, timeout=5)
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            await cluster.aclose()
