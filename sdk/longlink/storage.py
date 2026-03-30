import fsspec
from longlink.envs import envs

"""
It shall provide a space where the SDK can store data
"""


if envs.DEV:
    # local
    fs = fsspec.filesystem("file")

else:
    # S3
    fs = fsspec.filesystem(
        "s3",
        key=envs.storage_key,
        secret=envs.storage_secret,
        client_kwargs={"endpoint_url": envs.storage_endpoint},
    )


# S3 — via s3fs
# Google Cloud Storage (GCS) — via gcsfs
# Azure Blob Storage — via adlfs
# Azure Data Lake Gen1 / Gen2 — via adlfs
# OpenStack Swift
# Alibaba OSS
# Cloudflare R2 (S3-compatible, via s3fs)
# Wasabi / MinIO / any S3-compatible storage — via s3fs


# FTP
# SFTP
