import time
import os
import httpx
import yaml
from fastapi import FastAPI, Request, Response
import uvicorn

from kubernetes import client, config


# =========================
# CONFIG
# =========================
NAMESPACE = "default"
SERVICES = ["sample1", "sample2"]

IMAGE = "tiangolo/uvicorn-gunicorn-fastapi:python3.11"

INGRESS_NAME = "control-ingress"
INGRESS_HOST = "localhost"

CLUSTER_URL = os.getenv("CLUSTER_URL", "http://localhost:8080")


# =========================
# K8S INIT
# =========================
def load_kube():
    config.load_kube_config("kubeconfig.yaml")
    return client.ApiClient()


# =========================
# MANIFESTS (DESIRED STATE)
# =========================
def deployment_manifest(name):
    return {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": name,
            "namespace": NAMESPACE,
            "labels": {"managed-by": "control-plane"},
        },
        "spec": {
            "replicas": 1,
            "selector": {"matchLabels": {"app": name}},
            "template": {
                "metadata": {"labels": {"app": name}},
                "spec": {
                    "containers": [
                        {
                            "name": name,
                            "image": IMAGE,
                            "ports": [{"containerPort": 80}],
                            "command": ["/bin/sh", "-c"],
                            "args": [f"""
mkdir -p /app

cat <<EOF > /app/main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {{"service": "{name}"}}
EOF

uvicorn main:app --host 0.0.0.0 --port 80
"""],
                        }
                    ]
                },
            },
        },
    }


def service_manifest(name):
    return {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {
            "name": name,
            "namespace": NAMESPACE,
            "labels": {"managed-by": "control-plane"},
        },
        "spec": {
            "selector": {"app": name},
            "ports": [{"port": 80, "targetPort": 80}],
        },
    }


def ingress_manifest():
    paths = []

    for svc in SERVICES:
        paths.append({
            "path": f"/{svc}(/|$)(.*)",
            "pathType": "ImplementationSpecific",
            "backend": {
                "service": {
                    "name": svc,
                    "port": {"number": 80},
                }
            },
        })

    return {
        "apiVersion": "networking.k8s.io/v1",
        "kind": "Ingress",
        "metadata": {
            "name": INGRESS_NAME,
            "namespace": NAMESPACE,
            "annotations": {
                "nginx.ingress.kubernetes.io/use-regex": "true",
                "nginx.ingress.kubernetes.io/rewrite-target": "/$2",
            },
            "labels": {"managed-by": "control-plane"},
        },
        "spec": {
            "ingressClassName": "nginx",
            "rules": [
                {
                    "host": INGRESS_HOST,
                    "http": {"paths": paths},
                }
            ],
        },
    }


# =========================
# GENERATE FULL STATE
# =========================
def generate_cluster_state():
    manifests = []

    for svc in SERVICES:
        manifests.append(deployment_manifest(svc))
        manifests.append(service_manifest(svc))

    manifests.append(ingress_manifest())

    return manifests


# =========================
# YAML PERSISTENCE
# =========================
def save_state_to_yaml(manifests, filename="state.yaml"):
    with open(filename, "w") as f:
        yaml.dump_all(manifests, f, sort_keys=False)


def load_state_from_yaml(filename="state.yaml"):
    with open(filename, "r") as f:
        return list(yaml.safe_load_all(f))


# =========================
# APPLY (SERVER-SIDE APPLY)
# =========================
def apply_manifest(api_client, manifest):
    namespace = manifest["metadata"].get("namespace", NAMESPACE)
    name = manifest["metadata"]["name"]
    kind = manifest["kind"]

    if kind == "Deployment":
        path = f"/apis/apps/v1/namespaces/{namespace}/deployments/{name}"
    elif kind == "Service":
        path = f"/api/v1/namespaces/{namespace}/services/{name}"
    elif kind == "Ingress":
        path = f"/apis/networking.k8s.io/v1/namespaces/{namespace}/ingresses/{name}"
    else:
        raise ValueError(f"Unsupported kind: {kind}")

    return api_client.call_api(
        path,
        "PATCH",
        header_params={
            "Content-Type": "application/apply-patch+yaml",
        },
        query_params=[
            ("fieldManager", "control-plane"),
            ("force", "true"),
        ],
        body=manifest,
        response_type="object",
        _preload_content=False,
    )


def apply_state(api_client, manifests):
    # Optional ordering for safety
    order = {"Service": 1, "Deployment": 2, "Ingress": 3}
    manifests.sort(key=lambda m: order.get(m["kind"], 99))

    for manifest in manifests:
        if manifest:
            apply_manifest(api_client, manifest)


# =========================
# WAIT FOR READY
# =========================
def wait_for_ready(core, name):
    print(f"[WAIT] {name}")
    while True:
        ep = core.read_namespaced_endpoints(name, NAMESPACE)
        if ep.subsets and ep.subsets[0].addresses:
            print(f"[READY] {name}")
            return
        time.sleep(1)


# =========================
# FASTAPI PROXY
# =========================
app = FastAPI()
client_http = httpx.AsyncClient()


async def forward(path: str, request: Request):
    url = f"{CLUSTER_URL}/{path}"

    resp = await client_http.request(
        request.method,
        url,
        headers={
            **{k: v for k, v in request.headers.items() if k.lower() != "host"},
            "Host": INGRESS_HOST,
        },
        content=await request.body(),
    )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=dict(resp.headers),
    )


# =========================
# ROUTES
# =========================
@app.get("/sample1")
async def sample1_root(request: Request):
    return await forward("sample1", request)


@app.get("/sample2")
async def sample2_root(request: Request):
    return await forward("sample2", request)


@app.api_route("/sample1/{path:path}", methods=["GET", "POST"])
async def sample1(path: str, request: Request):
    return await forward(f"sample1/{path}", request)


@app.api_route("/sample2/{path:path}", methods=["GET", "POST"])
async def sample2(path: str, request: Request):
    return await forward(f"sample2/{path}", request)


# =========================
# SETUP (STATE-DRIVEN)
# =========================
def setup():
    api_client = load_kube()

    # 1. Generate desired state
    manifests = generate_cluster_state()

    # 2. Persist to YAML
    save_state_to_yaml(manifests)

    # 3. Load from YAML (source of truth)
    manifests_loaded = load_state_from_yaml()

    # 4. Apply state
    apply_state(api_client, manifests_loaded)

    # 5. Wait for readiness
    core = client.CoreV1Api(api_client)
    for svc in SERVICES:
        wait_for_ready(core, svc)

    print("[READY] system operational")


# =========================
# ENTRYPOINT
# =========================
if __name__ == "__main__":
    setup()
    uvicorn.run(app, host="0.0.0.0", port=8000)