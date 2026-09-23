import ssl
import pytest
from pathlib import Path
from longlink.storage import tls

TEST_CA_PEM = """-----BEGIN CERTIFICATE-----
MIIDFzCCAf+gAwIBAgIUKH8LlV2LrpFgbzaNntn8wzcwxcowDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAwwQbG9uZ2xpbmstdGVzdC1jYTAeFw0yNjA5MTYxMzM5MTha
Fw0zNjA5MTMxMzM5MThaMBsxGTAXBgNVBAMMEGxvbmdsaW5rLXRlc3QtY2EwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCaO5eife0ECX6DD73RswrQbmZb
6j6d9HpOdSY1N+N4tb3fRto9BQax9Cw3SMoc9l4y/bIT86ajgc6a6JkImgQoiyrk
b00YEOZThhm/9Z2Y7SCLK9vW5BGGZu/3W+k6vC2n+56LVwv58iAD9P7q8OLm9LkZ
UsYl4F7woL7lkvmTY7BG6hOblBXK7LmkVWK1OqMPSm2gDzW2Upet8qHlON/0JryX
ZSxjboOlX9/YZk8noHaVYSIOAZ21P5F3iVu8fd93RchOPlt7AaxapEz7j+zIc15L
s8Eg8aajwitVoSg0Y2ddvCo+Z3g7wSiaSju+hWiLdY3ca8GazpLDR377teTHAgMB
AAGjUzBRMB0GA1UdDgQWBBTt5u03jxgGardLghA5ygSBVGnFAzAfBgNVHSMEGDAW
gBTt5u03jxgGardLghA5ygSBVGnFAzAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQB2Dg7SUcrm6vj0THULYiynTEwvFiB6cdjWRFxMU8c8ECvECtNG
H0Ln0RooobjXf3HFOu8LWXxfv4bCX3NnBjMzlQzl90JnFDpotEFlCz6heL4SvmRJ
9SLjNr6I5humGNLU4rSexoz/ZwnfHUkJSaEs0jMnE1MFGWYTOaJtGUcGkDUT5NFj
sNp/SuaVQhMVaEvc6y3xi9X5SqKFrO2rcXKRIpiAGj7iJ1cYvqAUPwx1sYgbZ2sf
KUn7gDnOEsj7153NQj/TEo9AuMZCutX1sfnYZzjbPkqgDu2Oy/ui7D71o74cTaDX
OEByyXcs3Bef0FLkH/Mp/KriexKxoCEGaBXq
-----END CERTIFICATE-----
"""


def test_certificate_file_rejects_invalid_pem_before_creating_file() -> None:
    """Reject an invalid storage CA before publishing its temporary filename."""

    # Act and assert
    with pytest.raises(ssl.SSLError):
        with tls.certificate_file("storage-ca-pem"):
            pass


def test_certificate_file_publishes_validated_pem_for_caller_lifetime() -> None:
    """Publish the validated storage CA only for the caller's chosen lifetime."""

    # Act
    with tls.certificate_file(TEST_CA_PEM) as filename:
        # Assert
        assert Path(filename).suffix == ".crt"
        assert Path(filename).read_text() == TEST_CA_PEM

    # Assert
    assert not Path(filename).exists()


def test_session_restores_hostname_verification() -> None:
    """Verify the S3 hostname as well as its CA on asynchronous connections."""

    # Arrange
    session = tls.Session()

    # Act
    context = session._get_ssl_context()

    # Assert
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname is True
