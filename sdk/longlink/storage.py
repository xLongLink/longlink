import fsspec

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
