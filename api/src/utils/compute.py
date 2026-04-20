import os
import asyncio
from pathlib import Path

import kr8s.asyncio as kr8s
from kr8s.asyncio.objects import Ingress, Service, Deployment

# =========================
# CONFIG
# =========================

KUBECONFIG_PATH = os.environ.get("KUBECONFIG", "/app/kubeconfig")
DEFAULT_KUBECONFIG = Path(__file__).resolve().parents[2] / "kubeconfig.yaml"
NAMESPACE = "default"


# =========================
# INIT API
# =========================

async def get_api():
    if KUBECONFIG_PATH:
        kubeconfig_path = Path(KUBECONFIG_PATH).expanduser()
        if kubeconfig_path.exists():
            return await kr8s.api(kubeconfig=str(kubeconfig_path))

    if DEFAULT_KUBECONFIG.exists():
        return await kr8s.api(kubeconfig=str(DEFAULT_KUBECONFIG))

    return await kr8s.api()


# =========================
# REMOVE
# =========================

async def remove(name: str):
    await get_api()

    async def safe_delete(cls):
        try:
            obj = await cls.get(name, namespace=NAMESPACE)
            await obj.delete()
        except Exception:
            pass

    await safe_delete(Ingress)
    await safe_delete(Service)
    await safe_delete(Deployment)


# =========================
# CREATE (FINAL FIX)
# =========================

async def create(name: str, image: str):
    await get_api()

    # clean previous resources
    await remove(name)

    # -------------------------
    # Deployment
    # -------------------------
    deployment = await Deployment({
        "metadata": {
            "name": name,
            "namespace": NAMESPACE,
            "labels": {"app": name}
        },
        "spec": {
            "replicas": 1,
            "selector": {"matchLabels": {"app": name}},
            "template": {
                "metadata": {"labels": {"app": name}},
                "spec": {
                    "containers": [{
                        "name": name,
                        "image": image,
                        "ports": [{"containerPort": 80}]
                    }]
                }
            }
        }
    })
    await deployment.create()

    # -------------------------
    # Service
    # -------------------------
    service = await Service({
        "metadata": {
            "name": name,
            "namespace": NAMESPACE
        },
        "spec": {
            "selector": {"app": name},
            "ports": [{"port": 80, "targetPort": 80}],
            "type": "ClusterIP"
        }
    })
    await service.create()

    # -------------------------
    # Ingress (FINAL FIX)
    # -------------------------
    ingress = await Ingress({
        "metadata": {
            "name": name,
            "namespace": NAMESPACE,
            "annotations": {
                "nginx.ingress.kubernetes.io/rewrite-target": "/$2",
                "nginx.ingress.kubernetes.io/use-regex": "true"
            }
        },
        "spec": {
            "ingressClassName": "nginx",   # <-- CRITICAL FIX
            "rules": [{
                "http": {
                    "paths": [{
                        "path": f"/{name}(/|$)(.*)",
                        "pathType": "ImplementationSpecific",
                        "backend": {
                            "service": {
                                "name": name,
                                "port": {"number": 80},
                            }
                        },
                    }]
                }
            }]
        }
    })
    await ingress.create()

    # -------------------------
    # Wait for pod ready
    # -------------------------
    for _ in range(60):
        pods = [pod async for pod in kr8s.get(
            "pods",
            namespace=NAMESPACE,
            label_selector=f"app={name}"
        )]

        ready = False
        for pod in pods:
            if pod.status.phase == "Running":
                for c in pod.status.get("conditions", []):
                    if c["type"] == "Ready" and c["status"] == "True":
                        ready = True
                        break

        if ready:
            break

        await asyncio.sleep(2)
    else:
        raise RuntimeError(f"Pod for {name} not ready")

    # -------------------------
    # Get ingress endpoint
    # -------------------------
    for _ in range(30):
        ingress = await Ingress.get(name, namespace=NAMESPACE)

        lb = getattr(ingress.status, "loadBalancer", None)
        if lb:
            entries = getattr(lb, "ingress", None) or []
            if entries:
                entry = entries[0]
                address = getattr(entry, "ip", None) or getattr(entry, "hostname", None)
                if address:
                    return f"http://{address}/{name}"

        await asyncio.sleep(2)

    raise RuntimeError(f"Ingress for {name} has no address")


# =========================
# EXAMPLE
# =========================

if __name__ == "__main__":
    async def run():
        e1 = await create(
            "fastapi-test",
            "tiangolo/uvicorn-gunicorn-fastapi:python3.11"
        )
        print("Endpoint:", e1)

        e2 = await create(
            "fastapi-test2",
            "tiangolo/uvicorn-gunicorn-fastapi:python3.11"
        )
        print("Endpoint:", e2)

    asyncio.run(run())