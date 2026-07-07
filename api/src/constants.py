from pathlib import Path

# Path to the root of api
ROOT = Path(__file__).resolve().parent

TEMPLATES = ROOT / "templates"
MAIL_TEMPLATES = TEMPLATES / "mail"
INGRESS_NAME = "longlink-gateway"
APP_SERVICE_PORT = 8000
