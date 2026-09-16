"""Define platform-controlled provisioning policy for Organizations."""


# Database size per Organization instance in GiB.
DATABASE_SIZE_GIB = 10

# Database instances per Organization cluster.
DATABASE_INSTANCES = 1

# Object storage byte quota per Organization bucket.
BUCKET_SIZE_BYTES = 1073741824

# Compute ResourceQuota limits per Organization namespace.
COMPUTE_CPU_LIMIT = 4
COMPUTE_MEMORY_LIMIT_GIB = 3
COMPUTE_EPHEMERAL_LIMIT_GIB = 4
COMPUTE_PODS = 8
