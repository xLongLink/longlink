from longlink import Envs, create_fs

# Load Application settings before constructing shared resources.
env = Envs()

# Create the Application and organization-shared storage filesystems.
fs = create_fs(env, env.STORAGE_BUCKET or "", env.STORAGE_PREFIX or "")
shared_fs = create_fs(env, env.STORAGE_BUCKET or "", env.STORAGE_SHARED_PREFIX or "")
