from longlink import Envs, create_fs

env = Envs()
fs = create_fs(env, env.STORAGE_BUCKET or "", env.STORAGE_PREFIX or "")
shared_fs = create_fs(env, env.STORAGE_BUCKET or "", env.STORAGE_SHARED_PREFIX or "")
