import httpx
import asyncio
import kr8s.asyncio as kr8s_asyncio
from kr8s.asyncio.objects import Pod, Service

DEFAULT_NAMESPACE = "default"

# IMPORTANT: use HTTPS (your proxy is TLS)
KUBECTL_PROXY = "http://127.0.0.1:8001"

# -----------------------------
# CREATE POD + SERVICE
# -----------------------------
async def create(
    *,
    pod_name: str,
    image: str,
    env_vars: dict[str, str] | None = None,
) -> str:
    api = await kr8s_asyncio.api()

    labels = {"app": pod_name}

    # --- POD ---
    try:
        await Pod.get(pod_name, namespace=DEFAULT_NAMESPACE, api=api)
    except Exception:
        container = {
            "name": pod_name,
            "image": image,
            "ports": [{"containerPort": 80}],
        }

        if env_vars:
            container["env"] = [
                {"name": k, "value": v} for k, v in env_vars.items()
            ]

        pod = Pod(
            {
                "metadata": {"name": pod_name, "labels": labels},
                "spec": {"containers": [container]},
            },
            namespace=DEFAULT_NAMESPACE,
            api=api,
        )
        await pod.create()

    # --- SERVICE ---
    try:
        await Service.get(pod_name, namespace=DEFAULT_NAMESPACE, api=api)
    except Exception:
        service = Service(
            {
                "metadata": {"name": pod_name},
                "spec": {
                    "selector": labels,
                    "ports": [
                        {
                            "name": "http",
                            "port": 80,
                            "targetPort": 80,
                        }
                    ],
                },
            },
            namespace=DEFAULT_NAMESPACE,
            api=api,
        )
        await service.create()

    # --- WAIT UNTIL READY ---
    while True:
        pod = await Pod.get(pod_name, namespace=DEFAULT_NAMESPACE, api=api)

        if (
            pod.status.phase == "Running"
            and pod.status.conditions
            and any(
                c.type == "Ready" and c.status == "True"
                for c in pod.status.conditions
            )
        ):
            break

        await asyncio.sleep(1)

    return pod_name


# -----------------------------
# PROXY VIA KUBECTL PROXY
# -----------------------------
async def query_via_proxy(service_name: str) -> httpx.Response:
    url = (
        f"{KUBECTL_PROXY}/api/v1/namespaces/{DEFAULT_NAMESPACE}/"
        f"services/{service_name}/proxy/"
    )

    async with httpx.AsyncClient(
        timeout=10.0,
        # verify=False,  # REQUIRED for self-signed TLS
    ) as client:
        return await client.get(url)


# -----------------------------
# LIST
# -----------------------------
async def list() -> list[str]:
    api = await kr8s_asyncio.api()

    return [
        pod.metadata.name
        async for pod in Pod.list(namespace=DEFAULT_NAMESPACE, api=api)
    ]


# -----------------------------
# REMOVE
# -----------------------------
async def remove(*, pod_name: str) -> None:
    api = await kr8s_asyncio.api()

    try:
        pod = await Pod.get(pod_name, namespace=DEFAULT_NAMESPACE, api=api)
        await pod.delete()
    except Exception:
        pass

    try:
        service = await Service.get(
            pod_name, namespace=DEFAULT_NAMESPACE, api=api
        )
        await service.delete()
    except Exception:
        pass


# -----------------------------
# MAIN
# -----------------------------
async def _example_main() -> None:
    pod_name = "fastapi-sample"

    print("Creating pod + service...")
    service_name = await create(
        pod_name=pod_name,
        image="tiangolo/uvicorn-gunicorn-fastapi:python3.11",
        env_vars={
            # REQUIRED for this image to work correctly
            "APP_MODULE": "app.main:app"
        },
    )
    print(f"Service ready: {service_name}")

    await asyncio.sleep(2)

    print("\nQuerying via kubectl proxy...")
    response = await query_via_proxy(service_name)

    print(f"GET / -> {response.status_code}")
    print(response.text[:300])

    print("\nListing pods:")
    pods = await list()
    for p in pods:
        print(f"- {p}")

    print("\nDeleting resources...")
    await remove(pod_name=pod_name)
    print(f"Deleted: {pod_name}")


if __name__ == "__main__":
    asyncio.run(_example_main())