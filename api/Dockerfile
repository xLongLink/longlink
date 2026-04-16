FROM oven/bun:1 AS web-builder

WORKDIR /web
COPY web/package.json web/bun.lock ./
COPY xml /xml
RUN bun install --frozen-lockfile
WORKDIR /xml
RUN bun install --frozen-lockfile
WORKDIR /web
COPY web/ ./
RUN bun run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY api /app
RUN pip install --no-cache-dir .
COPY --from=web-builder /api/static /app/static

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
