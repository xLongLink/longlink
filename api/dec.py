import httpx
import uvicorn
from fastapi import FastAPI, Request, Response
from src.env import env
from src.utils import kubectl
from src.utils.compute import compute as compute_state

SERVICES = ["sample1", "sample2"]
IMAGE = "tiangolo/uvicorn-gunicorn-fastapi:python3.11"

app = FastAPI()
client_http = httpx.AsyncClient()


async def forward(path: str, request: Request):
    """Proxy one request through the shared ingress endpoint."""
    url = f"{env.ENV_COMPUTE_URL.rstrip('/')}/{path}"

    resp = await client_http.request(
        request.method,
        url,
        headers={
            **{k: v for k, v in request.headers.items() if k.lower() != "host"},
            "Host": compute_state.ingress_host,
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
    """Proxy the sample1 root route."""
    return await forward("sample1", request)


@app.get("/sample2")
async def sample2_root(request: Request):
    """Proxy the sample2 root route."""
    return await forward("sample2", request)


@app.api_route("/sample1/{path:path}", methods=["GET", "POST"])
async def sample1(path: str, request: Request):
    """Proxy nested sample1 routes."""
    return await forward(f"sample1/{path}", request)


@app.api_route("/sample2/{path:path}", methods=["GET", "POST"])
async def sample2(path: str, request: Request):
    """Proxy nested sample2 routes."""
    return await forward(f"sample2/{path}", request)


# =========================
# SETUP (STATE-DRIVEN)
# =========================
def setup():
    """Ensure the shared compute state contains the demo services."""
    compute_state.load()

    # Reuse the shared compute state so dec.py does not maintain its own
    # manifest generation, persistence, or reconciliation logic.
    for service in SERVICES:
        compute_state.applications[service] = {"image": IMAGE}

    kubectl.apply(
        compute_state.save(),
        kubeconfig=env.ENV_COMPUTE_KUBE_CONFIG_PATH,
    )

    print("[READY] system operational")


# =========================
# ENTRYPOINT
# =========================
if __name__ == "__main__":
    setup()
    uvicorn.run(app, host="0.0.0.0", port=8000)
