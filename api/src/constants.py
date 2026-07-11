from pathlib import Path

# Path to the root of api
ROOT = Path(__file__).resolve().parent

GATEWAY_APPLICATION_HEADER = "x-longlink-application-id"
GATEWAY_SECRET_HEADER = "x-longlink-gateway-secret"
GATEWAY_USER_HEADER = "x-user-id"
