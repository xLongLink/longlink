import pytest
from pathlib import Path


@pytest.fixture
def ca_certificate() -> str:
    """Provide a valid CA certificate for offline database and storage TLS checks."""

    # Share one certificate input without replacing standard-library TLS behavior.
    return """-----BEGIN CERTIFICATE-----
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


@pytest.fixture
def solution_source(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """Create the minimum generated Solution source layout."""

    # Create the source directories required by the runtime.
    source_directory = tmp_path / "src"
    (source_directory / "views").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)

    return source_directory
