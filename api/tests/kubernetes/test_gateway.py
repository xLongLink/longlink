import pytest
import ipaddress
from uuid import UUID
from cryptography import x509
from cryptography.x509.oid import ExtendedKeyUsageOID
from src.kubernetes.gateway import generate_gateway_tls

pytestmark = pytest.mark.no_db


def test_gateway_tls_covers_the_compute_address() -> None:
    """Generate server and Platform client certificates trusted by one Compute CA."""

    # Generate material for one IPv4 compute gateway address.
    address = "192.0.2.1"
    tls = generate_gateway_tls(UUID("00000000-0000-4000-8000-000000000001"), address)

    # Verify both leaf certificates preserve their issuing CA and intended extended usage.
    ca_certificate = x509.load_pem_x509_certificate(tls.ca_certificate.encode("ascii"))
    server_certificate = x509.load_pem_x509_certificate(tls.server_certificate.encode("ascii"))
    client_certificate = x509.load_pem_x509_certificate(tls.client_certificate.encode("ascii"))
    names = server_certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    assert server_certificate.issuer == ca_certificate.subject
    assert client_certificate.issuer == ca_certificate.subject
    assert names.get_values_for_type(x509.IPAddress) == [ipaddress.ip_address(address)]
    assert list(server_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.SERVER_AUTH]
    assert list(client_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.CLIENT_AUTH]
