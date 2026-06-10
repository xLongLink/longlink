<div align="center">

# Development tools

</div>

<br />

## k3d local cluster

Use a fixed ingress entry point for the compute cluster so local traffic stays stable:

```bash
k3d cluster create compute \
  --api-port 0.0.0.0:8001 \
  -p "8080:80@loadbalancer" \
  -p "8443:443@loadbalancer" \
  || true
```

Use `localhost:8443` as the compute ingress host in local config.

Install Kong into the cluster before provisioning apps:

```bash
kubectl apply -k dev/kong
kubectl -n kong rollout status deployment/kong-ingress-kong --timeout=5m
```

Export the kubeconfig afterward:

```bash
k3d kubeconfig get compute > api/kubeconfig.yaml
```
