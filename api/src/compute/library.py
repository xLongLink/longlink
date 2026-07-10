import asyncio
import inspect
from typing import Any, cast
from collections.abc import Callable

# kr8s 0.20.15 vendors asyncache, which calls the deprecated asyncio helper
# while decorators are evaluated during import on Python 3.14.
original_iscoroutinefunction = asyncio.iscoroutinefunction
asyncio.iscoroutinefunction = cast(Callable[[Any], bool], inspect.iscoroutinefunction)

# Temporarily patch coroutine detection while importing kr8s.
try:
    import kr8s
    from kr8s.asyncio.objects import (
        Pod,
        Node,
        Secret,
        Service,
        Ingress,
        APIObject,
        ConfigMap,
        Deployment,
        Namespace,
        NetworkPolicy,
        object_from_spec,
    )

# Always restore asyncio after kr8s import side effects finish.
finally:
    asyncio.iscoroutinefunction = original_iscoroutinefunction
