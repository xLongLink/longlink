class Storage:
    def create(self) -> None:
        raise NotImplementedError
    
    def delete(self) -> None:
        raise NotImplementedError
    
    def credentials(self) -> dict:
        raise NotImplementedError
