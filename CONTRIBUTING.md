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
curl -fsSL \
  https://github.com/helmfile/helmfile/releases/download/v1.8.0/helmfile_1.8.0_linux_amd64.tar.gz \
  | tar -xzO helmfile > "$HOME/.local/bin/helmfile"
chmod +x "$HOME/.local/bin/helmfile"
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
<image>
  <style>
    Minimalist monochrome technical sketch matching the reference. Thin white pencil/chalk lines, slightly rough and grainy, with imperfect hand-drawn contours, sparse construction lines, and very light hatching. Simple geometric forms, strong silhouettes, lots of negative space. Fully transparent background. No color, text, gradients, shadows, photorealism, or dense detail.
  </style>

  <content>
  </content>
</image>

```
