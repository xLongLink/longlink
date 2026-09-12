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

Restart your shell after installing `uv`, then install Vite+:

```bash
curl -fsSL https://vite.plus | bash
. "$HOME/.vite-plus/env"
vp env setup
```

```bash
make install  # Install development dependencies
make check    # Run lint, type, and contract checks
make format   # Format source and documentation
make build    # Typecheck and build both web bundles
make test     # Build required bundles and run all tests

make up       # Initialize local services, cluster, and sample image
make down     # Stop local services and cluster; preserve caches and sdk/dev
make seed     # Migrate and seed the Platform test Organization
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
