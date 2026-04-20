<div align="center">

# Development tools

</div>

<br />

## k3d local cluster

Use a fixed ingress entry point for the compute cluster so local traffic stays stable:

```bash
k3d cluster create compute \
  --api-port 0.0.0.0:8001 \
  --registry-create compute-registry:0.0.0.0:5000 \
  -p "8080:80@loadbalancer" \
  -p "8443:443@loadbalancer" \
  || true
```

Export the kubeconfig afterward:

```bash
k3d kubeconfig get compute > api/kubeconfig.yaml
```
