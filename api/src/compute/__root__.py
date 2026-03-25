

class Compute:
    def create(self, app_id: str) -> ComputeEnv:
        pass

    def deploy(self, app_id: str, image: str):
        pass

    def delete(self, app_id: str):
        pass
