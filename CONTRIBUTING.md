# Contributing to LongLink

The LongLink Platform owns authentication, authorization, orchestration, storage, and routing for Solutions.

The web package owns the shared frontend runtime and the XML rendering path used by both platform and SDK bundles.

The SDK owns shared-schema models, migrations, and synchronization helpers alongside Python helpers for Solution projects, project migrations, CLI commands, database helpers, and packaged XML schema assets. The API executes shared migrations and writes with control-plane credentials; Solution runtimes receive read-only shared access.

<br />

## Development

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and [Vite+](https://viteplus.dev) before running the development commands:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```bash
curl -fsSL https://vite.plus | bash
. "$HOME/.vite-plus/env"
vp env setup
```

```bash
sudo snap install helm --classic
mkdir -p "$HOME/.local/bin"
curl -fsSL https://get.helm.sh/helm-v4.3.0-linux-amd64.tar.gz | tar -xzO linux-amd64/helm > "$HOME/.local/bin/helm"
chmod +x "$HOME/.local/bin/helm"
```

```bash
make install  # Install development dependencies
make check    # Run lint, type, and contract checks
make format   # Format source and documentation
make build    # Typecheck and build both web bundles
make test     # Build required bundles and run all tests

make up       # Initialize local services and cluster
make down     # Stop local services and cluster; preserve caches and sdk/dev
make seed     # Seed the Platform test Organization after its sample image is pushed
make api      # Run the Platform API
make web      # Run the Web development server
make sdk      # Run the local sample Solution
make image    # Build and push the local sample image
```

## Test the SDK in development

```bash
make sdk            # Build the SDK web bundle and run the generated SDK service
```

## Publish a beta release

After the changes are merged into `main`, choose a new tag for the intended
next stable version, for example `v0.4.1-beta.2` if the next stable release
will be `v0.4.1` and `v0.4.1-beta.1` has already been published. Use
`vMAJOR.MINOR.PATCH-beta.NUMBER` (with a hyphen before `beta`), not
`v0.4.1.beta1`. From this repository, replacing the example with an unused tag:

```bash
git fetch origin main
git tag v0.4.1-beta.2 origin/main
git push origin v0.4.1-beta.2
```

Pushing the tag starts the [Publish Beta workflow](.github/workflows/beta.yml).
It verifies that the tag points to a commit on the default branch, runs the
tests, publishes the API image and matching Compute OCI chart to GHCR, and
then creates the GitHub **pre-release**. Check the workflow run and the
resulting release before using its artifacts. Do not create the pre-release
manually in the GitHub UI to start this process; that alone does not trigger
the tag-push workflow. Use a new beta number for another attempt rather than
moving a published tag.

A beta release does not update `latest`, publish the SDK to PyPI, sync the
sample repository, or deploy anything. To test it in the managed environment,
pin its chart version and API image digest in a separate
[LinkLong](https://github.com/xLongLink/linklong) Terraform change. See the
[Compute release instructions](k8s/README.md#beta-releases) for artifact names
and promotion guidance.

## Theme

Use the Astryx theme primitives rather than custom color or spacing values:

```text
background  # Page background color
primary     # Default text color
accent      # Interactive and emphasized content color
muted       # Secondary content color
radius      # none | small | medium | large
```

## Images

```xml
<style>
  Minimalist monochrome technical sketch matching the reference. Thin white pencil/chalk lines, slightly rough and grainy, with imperfect hand-drawn contours, sparse construction lines, and very light hatching. Simple geometric forms, strong silhouettes, lots of negative space. Fully transparent background. No color, text, gradients, shadows, photorealism, or dense detail.
</style>
```
