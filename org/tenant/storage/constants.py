"""Constants for tenant storage resources."""

import re

STORAGE_BUCKET_PREFIX = "longlink"
STORAGE_BUCKET_MAX_LENGTH = 63
STORAGE_BUCKET_PATTERN = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")
SHARED_BUCKET_SLUG = "shared"
