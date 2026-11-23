import ssl
import pytest
from s3fs import S3FileSystem
from typing import cast
from longlink import storage
from longlink.storage import tls
from longlink.utils.settings import Envs
from longlink.storage.filesystem import Filesystem


def test_certificate_file_rejects_invalid_pem_before_creating_file(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject an invalid storage CA before publishing its temporary filename."""

    # Arrange
    def unexpected_file(*_args: object, **_kwargs: object) -> None:
        """Reject temporary file creation before CA validation."""

        raise AssertionError("Invalid CA must not create a temporary file")

    monkeypatch.setattr(tls.tempfile, "NamedTemporaryFile", unexpected_file)

    # Act and assert
    with pytest.raises(ssl.SSLError), tls.certificate_file("storage-ca-pem"):
        pass


@pytest.mark.parametrize("custom_ca", [False, True])
async def test_session_restores_hostname_verification(
    production_settings: dict[str, str | int], ca_certificate: str, custom_ca: bool
) -> None:
    """Verify the S3 hostname as well as its CA on asynchronous connections."""

    # Arrange
    settings = Envs.model_validate(
        production_settings
        | {"STORAGE_ENDPOINT_URL": "https://storage.example.invalid"}
        | ({"STORAGE_CERTIFICATE": ca_certificate} if custom_ca else {})
    )
    objects = cast(Filesystem, storage.create_storage(settings))
    backend = cast(S3FileSystem, objects.filesystem.fs)
    try:
        # Act
        await objects._connect()
        session = await backend.s3._endpoint.http_session._get_session(None)
        context = session.connector._ssl

        # Assert
        assert isinstance(context, ssl.SSLContext)
        assert context.verify_mode == ssl.CERT_REQUIRED
        assert context.check_hostname is True
        if custom_ca:
            assert ssl.PEM_cert_to_DER_cert(ca_certificate) in context.get_ca_certs(binary_form=True)
    finally:
        await objects.close()
