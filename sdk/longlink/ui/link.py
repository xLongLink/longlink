from typing import Literal, TypeAlias
from dataclasses import dataclass


@dataclass
class Link(str):
    """LongLink Link component
    
    This is a simple link component    
    """
    url: str
    text: str

    def __str__(self) -> str:
        return f"link('{self.text}', '{self.url}')"
    