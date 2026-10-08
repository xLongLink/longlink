# LongLink Compute

This Helm chart installs shared Knative, Kourier, CloudNativePG, and RustFS infrastructure.
Install it before registering a Compute in the Platform. Registration requires a
kubeconfig with cluster access and the gateway and storage addresses.


## Install

From source:

```bash
helm upgrade --install longlink-compute k8s/chart \
  --namespace <release-namespace> \
  --create-namespace \
  --set gateway.address=<gateway-address> \
  --set storage.address=<storage-address> \
  --set gatewayAllowedSourceCidr=<gateway-allowed-source-cidr>
```


## Uninstall

```bash
helm uninstall longlink-compute --namespace <release-namespace>
```
