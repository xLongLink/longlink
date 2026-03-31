"""
Compute provider adapters for control-plane integrations.

- Docker
- Podman
"""

from src.compute.docker import Docker
from src.compute.podman import Podman
from src.compute.__root__ import Compute

__all__ = ['Compute', 'Docker', 'Podman']
