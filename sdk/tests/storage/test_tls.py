import ssl
import pytest
from pathlib import Path
from longlink.storage import tls


def test_certificate_file_rejects_invalid_pem_before_creating_file(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject an invalid storage CA before publishing its temporary filename."""

    # Arrange
    def unexpected_file(*_args: object, **_kwargs: object) -> None:
        """Reject temporary file creation before CA validation."""

        raise AssertionError("Invalid CA must not create a temporary file")

    monkeypatch.setattr(tls.tempfile, "NamedTemporaryFile", unexpected_file)

    # Act and assert
    with pytest.raises(ssl.SSLError):
        with tls.certificate_file("storage-ca-pem"):
            pass


def test_certificate_file_publishes_validated_pem_for_caller_lifetime(ca_certificate: str) -> None:
    """Publish the validated storage CA only for the caller's chosen lifetime."""

    # Act
    with tls.certificate_file(ca_certificate) as filename:
        certificate_path = Path(filename)

        # Assert
        assert certificate_path.read_text() == ca_certificate

    # Assert
    assert not certificate_path.exists()


def test_session_restores_hostname_verification() -> None:
    """Verify the S3 hostname as well as its CA on asynchronous connections."""

    # Arrange
    session = tls.Session()

    # Act
    context = session._get_ssl_context()

    # Assert
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True
