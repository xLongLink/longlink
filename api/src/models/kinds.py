from enum import Enum


class DatabaseKind(str, Enum):
    """Supported database registry kinds."""

    postgre = "postgre"


class StorageKind(str, Enum):
    """Supported storage registry kinds."""

    s3 = "s3"


class ComputeKind(str, Enum):
    """Supported compute registry kinds."""

    kubernetes = "kubernetes"
