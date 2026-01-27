# File storage

# File storage
# https://www.infomaniak.com/it/backup-e-archiviazione/nas-synology
# Ideally integrate with other providers
# Creates a folder viavia
# Enables transparency -> User can mount and see all the files
# Each application can read/write in it's space (settings file, etc.)

# Shall support multiple types of archive, starting from simple file storage to S3 buckets.
# TODO: Does it makes sense to use it as a sync???

# TODO: This is quite easy
# TODO: In development mode, we can just use local folders
```
/shared
/viavai
 ├── app1
 │    ├── readonly
 │    └── writable
 ├── app2
 └── app3
And:

Some users can see files but not modify

Some users can modify only specific subfolders

Permissions enforced reliably, not by convention
```