from asyncio import run


def test_sample_endpoint_returns_initial_payload() -> None:
    """Load the scaffolded application and run its starter sample endpoint."""

    # Arrange
    from main import app
    from src.routes.sample import sample_get_endpoint

    # Act
    payload = run(sample_get_endpoint())

    # Assert
    assert app is not None
    assert payload["message"] == "Sample GET endpoint received data"
    assert payload["required"] == "required"
    assert payload["optional"] == "optional"
    assert payload["filesystem_type"] == "Storage"
