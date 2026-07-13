from longlink import Envs, create_fs

env = Envs()
fs = create_fs(env, env.STORAGE_BUCKET or "")
shared_fs = create_fs(env, env.STORAGE_SHARED_BUCKET or "")
