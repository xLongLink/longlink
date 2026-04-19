# Build and Publish an SDK Application Container

Use `long-ling build` to package your SDK application into a container image for LongLink runtime.

The build flow is designed so the container itself becomes the deployable application artifact. During build, LongLink reads your Python-defined environment contract and your package metadata, then injects both into the generated container artifacts.

## What `long-ling build` does

```bash
long-ling build
```

When you run this command, LongLink should:

1. Read application metadata from `pyproject.toml`.
2. Read required runtime environment variables from your Python environment definition module.
3. Generate a Dockerfile that includes required runtime configuration hooks.
4. Build the container image.
5. Produce container metadata payload with:
   - Application metadata (same values as `pyproject.toml`)
   - Required environment variable schema

This ensures the control plane can start the container with the correct metadata and all required environment variables.

## Metadata and environment injection model

Keep a single metadata source in `pyproject.toml`.

LongLink uses that metadata in two places:

- **Inside the application container**: The application can read its own identity and version metadata at runtime.
- **Inside container metadata for control plane**: The control plane receives the same metadata and required environment variable definitions before container startup.

Use this model to keep build-time metadata, runtime metadata, and deployment metadata consistent.

## GitHub Action: Build image

Use this workflow to build the SDK container on every push.

```yaml
name: sdk-build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install SDK tooling
        run: pip install longlink

      - name: Build container
        run: long-ling build
```

## GitHub Action: Publish image

Use this workflow to publish after the build succeeds.

```yaml
name: sdk-publish

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Login to GHCR
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u "${{ github.actor }}" --password-stdin

      - name: Build SDK container
        run: long-ling build

      - name: Tag and push image
        run: |
          docker tag longlink-app ghcr.io/${{ github.repository }}/longlink-app:${{ github.ref_name }}
          docker push ghcr.io/${{ github.repository }}/longlink-app:${{ github.ref_name }}
```

For production publishing, use immutable tags and keep release metadata aligned with `pyproject.toml` version fields.

## GitLab CI: Build and publish image

Use this pipeline to build and publish to the GitLab container registry.

```yaml
stages:
  - build
  - publish

build_sdk:
  stage: build
  image: python:3.12
  services:
    - docker:dind
  script:
    - pip install longlink
    - long-ling build

publish_sdk:
  stage: publish
  image: docker:stable
  services:
    - docker:dind
  script:
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
    - docker tag longlink-app "$CI_REGISTRY_IMAGE/longlink-app:$CI_COMMIT_TAG"
    - docker push "$CI_REGISTRY_IMAGE/longlink-app:$CI_COMMIT_TAG"
  only:
    - tags
```

Set release tags in GitLab to publish immutable images. The control plane should then deploy containers using that published tag plus the generated metadata and required environment variable schema.
