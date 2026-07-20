<div align="center">

# Development tools

</div>

<br />

## k3d local cluster

Start the local service dependencies, including the local OCI registry on `localhost:15000`:

```bash
docker compose -f dev/compose.yml up -d
```

Use a fixed gateway entry point for the compute cluster so local traffic stays stable:

```bash
k3d cluster create compute \
  --api-port 0.0.0.0:8001 \
  -p "8080:80@loadbalancer" \
  -p "8443:443@loadbalancer" \
  --registry-config dev/registries.yml \
  --k3s-arg "--disable=traefik@server:0" \
  || true
```

LongLink owns the local gateway LoadBalancer. The `8443` host mapping is available for manual HTTPS checks, while reconciliation records the Kubernetes-published endpoint for API proxy traffic.
Use `localhost:15000/<image>:<tag>` for images pushed to the local registry.

Export the kubeconfig afterward:

```bash
k3d kubeconfig get compute > api/kubeconfig.yaml
```

## Local seed setup

Start local services, build the generated SDK development application, push it to the local registry, run API migrations, and seed local data:

```bash
make seed
```

The pushed image is `localhost:15000/longlink-app:dev` by default.
