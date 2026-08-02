import pytest
import ipaddress
from uuid import UUID
from datetime import timedelta
from cryptography import x509
from cryptography.x509.oid import ExtendedKeyUsageOID
from src.kubernetes.gateway import generate_gateway_tls

pytestmark = pytest.mark.no_db


def test_gateway_tls_covers_the_compute_address() -> None:
    """Generate a gateway certificate trusted by its private compute CA."""

    # Generate material for one IPv4 compute gateway address.
    compute_id = UUID("00000000-0000-4000-8000-000000000001")
    address = "192.0.2.1"
    gateway_certificate, certificate, _ = generate_gateway_tls(compute_id, address)

    # Verify the server certificate preserves its issuing CA and gateway IP SAN.
    ca_certificate = x509.load_pem_x509_certificate(gateway_certificate.encode("ascii"))
    server_certificate = x509.load_pem_x509_certificate(certificate.encode("ascii"))
    names = server_certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    assert server_certificate.issuer == ca_certificate.subject
    assert names.get_values_for_type(x509.IPAddress) == [ipaddress.ip_address(address)]
    assert server_certificate.not_valid_after_utc - server_certificate.not_valid_before_utc == timedelta(days=3650, minutes=5)
    assert list(server_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.SERVER_AUTH]
