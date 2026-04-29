FROM oven/bun:1 AS web-builder

WORKDIR /web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
WORKDIR /web
COPY web/ ./
RUN bun run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y curl && \
    curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && \
    rm kubectl && \
    apt-get clean

COPY api /app
RUN pip install --no-cache-dir .
COPY --from=web-builder /api/.static /app/.static

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
