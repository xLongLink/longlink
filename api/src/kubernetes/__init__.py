# Kubernetes
# ==========
#
# Scopes
# - `platform`: system Namespace, gateway, and cluster components.
# - `application`: Organization Namespaces and Application workloads.
# - Every resource is labeled with its manager, compute, and scope.
#
# Platform release
# 1. Queue clusters running an older Platform version.
# 2. Apply new Platform resources.
# 3. Wait until replacements are ready.
# 4. Prune obsolete Platform resources.
# 5. Record success, or retry after failure.
# 6. Never mutate Application resources or Pods.
#
# Application change
# 1. Reconcile Application resources and providers.
# 2. Update gateway routes.
# 3. Wait until workloads are ready.
# 4. Prune removed Application resources.
