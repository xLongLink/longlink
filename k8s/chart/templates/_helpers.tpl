{{/* Preserve existing operator selectors when using the upstream chart. */}}
{{- define "cloudnative-pg.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cloudnative-pg.name" . }}
app.kubernetes.io/instance: cnpg
{{- end }}
