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


@pytest.mark.parametrize("mismatch", ["bytes", "object-count", "stale-claim-uid"])
async def test_quota_waits_for_rook_acknowledgement_of_existing_bound_claim(mismatch: str) -> None:
    """Keep the lifecycle gate closed until the bound bucket matches the claim UID and both quotas."""

    # Arrange: start with a Bound claim and exactly one mismatched bucket admission predicate.
    organization = uuid4()
    uid = str(uuid4())
    initial_uid = str(uuid4()) if mismatch == "stale-claim-uid" else uid
    initial_size = "16384" if mismatch == "bytes" else "8192"
    initial_objects = "4" if mismatch == "object-count" else "2"
    observed = asyncio.Event()
    acknowledge = asyncio.Event()
    compute = ComputeRegistry(cluster_uid="storage-cluster", bucket_size_bytes=8192, bucket_max_objects=2)

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
                        "claimRef": {"uid": uid if acknowledge.is_set() else initial_uid},
                        "endpoint": {
                            "additionalConfig": {
                                "bucketMaxSize": "8192" if acknowledge.is_set() else initial_size,
                                "bucketMaxObjects": "2" if acknowledge.is_set() else initial_objects,
                            }
                        },
                    },
                }
            )
        raise web.HTTPNotFound()

    # Act: run the production reconciler against a real local HTTP server with its normal polling interval.
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
                observed.clear()

                # Assert: another poll proves the first mismatched response did not release the gate.
                await asyncio.wait_for(observed.wait(), timeout=5)
            except TimeoutError:
                if task.done():
                    await task
                raise
            assert not task.done()

            # Act: acknowledge the current claim UID and both requested quotas together.
            acknowledge.set()

            # Assert: the corrected bucket response releases the lifecycle gate.
            assert await asyncio.wait_for(task, timeout=5) is None
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            await cluster.aclose()
