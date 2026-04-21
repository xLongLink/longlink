import os
import time
from pathlib import Path

from kubernetes import client, config
from kubernetes.client.rest import ApiException

# =========================
# CONFIG
# =========================

KUBECONFIG_PATH = os.environ.get("KUBECONFIG", "/app/kubeconfig")
DEFAULT_KUBECONFIG = Path(__file__).resolve().parents[2] / "kubeconfig.yaml"
NAMESPACE = "default"


# =========================
# INIT API
# =========================

def get_clients():
    if KUBECONFIG_PATH:
        kubeconfig_path = Path(KUBECONFIG_PATH).expanduser()
        if kubeconfig_path.exists():
            config.load_kube_config(config_file=str(kubeconfig_path))
        elif DEFAULT_KUBECONFIG.exists():
            config.load_kube_config(config_file=str(DEFAULT_KUBECONFIG))
        else:
            config.load_incluster_config()
    else:
        config.load_incluster_config()

    return (
        client.AppsV1Api(),
        client.CoreV1Api(),
        client.NetworkingV1Api(),
    )


# =========================
# REMOVE
# =========================

def remove(name: str):
    apps, core, net = get_clients()

    def safe_delete(func):
        try:
            func()
        except ApiException:
            pass

    safe_delete(lambda: net.delete_namespaced_ingress(name, NAMESPACE))
    safe_delete(lambda: core.delete_namespaced_service(name, NAMESPACE))
    safe_delete(lambda: apps.delete_namespaced_deployment(name, NAMESPACE))


# =========================
# CREATE
# =========================

def create(name: str, image: str):
    apps, core, net = get_clients()

    # cleanup
    remove(name)

    # -------------------------
    # Deployment
    # -------------------------
    deployment = client.V1Deployment(
        metadata=client.V1ObjectMeta(
            name=name,
            namespace=NAMESPACE,
            labels={"app": name}
        ),
        spec=client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(
                match_labels={"app": name}
            ),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels={"app": name}),
                spec=client.V1PodSpec(
                    containers=[
                        client.V1Container(
                            name=name,
                            image=image,
                            ports=[client.V1ContainerPort(container_port=80)],
                        )
                    ]
                )
            )
        )
    )

    apps.create_namespaced_deployment(NAMESPACE, deployment)

    # -------------------------
    # Service
    # -------------------------
    service = client.V1Service(
        metadata=client.V1ObjectMeta(
            name=name,
            namespace=NAMESPACE
        ),
        spec=client.V1ServiceSpec(
            selector={"app": name},
            ports=[client.V1ServicePort(port=80, target_port=80)],
            type="ClusterIP"
        )
    )

    core.create_namespaced_service(NAMESPACE, service)

    # -------------------------
    # Ingress
    # -------------------------
    ingress = client.V1Ingress(
        metadata=client.V1ObjectMeta(
            name=name,
            namespace=NAMESPACE,
            annotations={
                "nginx.ingress.kubernetes.io/rewrite-target": "/$2",
                "nginx.ingress.kubernetes.io/use-regex": "true"
            }
        ),
        spec=client.V1IngressSpec(
            ingress_class_name="nginx",
            rules=[
                client.V1IngressRule(
                    http=client.V1HTTPIngressRuleValue(
                        paths=[
                            client.V1HTTPIngressPath(
                                path=f"/{name}(/|$)(.*)",
                                path_type="ImplementationSpecific",
                                backend=client.V1IngressBackend(
                                    service=client.V1IngressServiceBackend(
                                        name=name,
                                        port=client.V1ServiceBackendPort(number=80)
                                    )
                                )
                            )
                        ]
                    )
                )
            ]
        )
    )

    net.create_namespaced_ingress(NAMESPACE, ingress)

    # -------------------------
    # Wait for pod ready
    # -------------------------
    for _ in range(60):
        pods = core.list_namespaced_pod(
            namespace=NAMESPACE,
            label_selector=f"app={name}"
        )

        ready = False
        for pod in pods.items:
            if pod.status.phase == "Running":
                for c in pod.status.conditions or []:
                    if c.type == "Ready" and c.status == "True":
                        ready = True
                        break

        if ready:
            break

        time.sleep(2)
    else:
        raise RuntimeError(f"Pod for {name} not ready")

    # -------------------------
    # Get ingress endpoint
    # -------------------------
    for _ in range(30):
        ing = net.read_namespaced_ingress(name, NAMESPACE)

        lb = ing.status.load_balancer
        if lb and lb.ingress:
            entry = lb.ingress[0]
            address = entry.ip or entry.hostname
            if address:
                return f"http://{address}/{name}"

        time.sleep(2)

    raise RuntimeError(f"Ingress for {name} has no address")


# =========================
# EXAMPLE
# =========================

if __name__ == "__main__":
    e1 = create(
        "fastapi-test",
        "tiangolo/uvicorn-gunicorn-fastapi:python3.11"
    )
    print("Endpoint:", e1)

    e2 = create(
        "fastapi-test2",
        "tiangolo/uvicorn-gunicorn-fastapi:python3.11"
    )
    print("Endpoint:", e2)