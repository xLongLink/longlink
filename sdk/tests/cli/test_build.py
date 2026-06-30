from longlink.cli.build import render_dockerfile, resolve_image_tag


def test_render_dockerfile_copies_full_workspace_for_editable_sources() -> None:
    """Keep editable path dependencies available in the runtime image."""

    # Arrange

    # Act
    dockerfile = render_dockerfile("/workspace/dev", "LABEL longlink.name=\"test\"", "0.1.0")

    # Assert
    assert "COPY --from=builder /workspace /workspace" in dockerfile


def test_resolve_image_tag_keeps_existing_local_tag_format() -> None:
    """Build the default local image tag without a registry prefix."""

    # Arrange

    # Act
    image_tag = resolve_image_tag("LongLink App", "0.1.0")

    # Assert
    assert image_tag == "longlink-app:0.1.0"


def test_resolve_image_tag_adds_registry_prefix() -> None:
    """Build a registry-prefixed image tag for local pushes."""

    # Arrange

    # Act
    image_tag = resolve_image_tag("LongLink_App", "dev", "localhost:15000/")

    # Assert
    assert image_tag == "localhost:15000/longlink-app:dev"
