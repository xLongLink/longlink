from fastapi import HTTPException
from src.utils import images
from src.models.metadata import LongLinkMetadata
from src.models.applications import ApplicationCreate


async def application_image_metadata(payload: ApplicationCreate) -> LongLinkMetadata:
    """Resolve immutable image metadata before provisioning a LongLink Application runtime.

    Reject application and image declarations of Platform-reserved variables and require every required application-managed value.
    """

    reserved_payload = sorted(name for name in payload.envs if name.startswith("LONGLINK_"))

    # User payloads cannot provide values reserved for platform injection.
    if reserved_payload:
        raise HTTPException(status_code=409, detail=f"Reserved platform environment variables: {', '.join(reserved_payload)}")

    # Image inspection must succeed before the platform can trust runtime metadata.
    metadata = await images.metadata(payload.image)
    if metadata is None:
        raise HTTPException(status_code=409, detail="Image metadata could not be inspected")

    # Deployments must use a resolved immutable image reference.
    if metadata.digest is None or metadata.image is None:
        raise HTTPException(status_code=409, detail="Image digest could not be resolved")

    # LongLink-prefixed values are always injected by the LongLink Platform, never declared by applications.
    reserved_image: list[str] = []
    missing: list[str] = []

    # Walk required metadata envs once and split them by validation outcome.
    for env in metadata.environments:

        # Optional envs do not need payload or platform guarantees.
        if not env.required:
            continue

        # Runtime values with the platform prefix are injected later by the LongLink Platform.
        if env.name.startswith("LONGLINK_"):
            reserved_image.append(env.name)
            continue

        # Non-platform required values must be supplied by the application creation payload.
        if not payload.envs.get(env.name, "").strip():
            missing.append(env.name)

    reserved_image.sort()

    # Reject images that try to declare LongLink-managed runtime values.
    if reserved_image:
        raise HTTPException(status_code=409, detail=f"Reserved platform environment variables: {', '.join(reserved_image)}")

    missing.sort()

    # Reject images whose app-managed required values are absent.
    if missing:
        raise HTTPException(status_code=409, detail=f"Missing required environment variables: {', '.join(missing)}")

    return metadata
