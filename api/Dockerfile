FROM oven/bun:1 AS web-builder

WORKDIR /repo
COPY web/package.json web/bun.lock web/ ./web/
COPY api/ ./api/
WORKDIR /repo/web
RUN bun install --frozen-lockfile
RUN bun run build:api

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEV=
ENV KEY=
ENV ORGANIZATION_NAME=
ENV DATABASE_URL=
ENV OIDC_CLIENT_ID=
ENV OIDC_CLIENT_SECRET=
ENV OIDC_ISSUER=
ENV OIDC_REDIRECT_URI=
ENV OIDC_SCOPES=
ENV DATABASE_HOST=
ENV DATABASE_PORT=
ENV DATABASE_USERNAME=
ENV DATABASE_PASSWORD=
ENV DATABASE_MAINTENANCE_DATABASE=
ENV DATABASE_SSLMODE=
ENV STORAGE_ENDPOINT_URL=
ENV STORAGE_ACCESS_KEY_ID=
ENV STORAGE_SECRET_ACCESS_KEY=
ENV STORAGE_REGION_NAME=
ENV COMPUTE_URL=
ENV COMPUTE_KUBE_CONFIG_PATH=
ENV COMPUTE_NAMESPACE=
ENV URL=

LABEL org.opencontainers.image.title="longlink-api"
LABEL org.opencontainers.image.description="LongLink backend API"
LABEL org.opencontainers.image.source="https://github.com/xLongLink/longlink"

WORKDIR /app

RUN apt-get update && apt-get install -y curl && \
    curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl && \
    apt-get clean

COPY api/ /app/
RUN pip install --no-cache-dir .
COPY --from=web-builder /repo/api/src/.static/web /app/src/.static/web

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
