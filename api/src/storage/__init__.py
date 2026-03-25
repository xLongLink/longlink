"""
This folder contains the storage provider adapters
- Local file system
- Amazon S3 -> Boto3
- Google Cloud Storage -> google-cloud-storage
- Azure Blob Storage -> azure-storage-blob
- ...

Each app gets a storage space:
s3://main-bucket/app-id-123/
gcs://main-bucket/app-id-123/
azure://container/app-id-123/


The idea here is to keep is flexible and allow users to choose their storage provider.
- Cloudflare
- Wasabi
- Backblaze
- DigitalOcean
- Scaleway
- OVHcloud
- Infomaniak
Or self hosted:
- MinIO
- Ceph
- SeaweedFS

in the __root__.py file we define the Storage class which is the interface that all storage providers must implement.
"""