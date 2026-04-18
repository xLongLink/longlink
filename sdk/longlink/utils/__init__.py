from .page import Page
from .settings import Settings
from .organization import Organization

# Expose a shared organization settings singleton for use across the application.
organization = Organization()

