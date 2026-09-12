import yaml
import pytest
import jsonschema
from src.utils import templates
from importlib.resources import files

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
