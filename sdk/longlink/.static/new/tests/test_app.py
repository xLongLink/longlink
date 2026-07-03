import asyncio


def test_form_endpoint_returns_submitted_payload() -> None:
    """Load the scaffolded application and run its starter form endpoint."""

    # Arrange
    from main import app
    from src.routes.submissions import form_post_endpoint

    submitted_payload = {"name": "Ada", "team": "ops"}

    # Act
    payload = asyncio.run(form_post_endpoint(submitted_payload))

    # Assert
    assert app is not None
    assert payload == {"message": "Form submission received", "payload": submitted_payload}
