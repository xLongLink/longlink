from longlink import Router

router = Router()

router.frontend("/", directory="dist", check_dir=False)
