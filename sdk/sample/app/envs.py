from longlink import Enviroments


class Env(Enviroments):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API: str


env = Env()
