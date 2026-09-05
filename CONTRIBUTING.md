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
make install        # Install all the dependencies
make api:install    # Install API dependencies
make sdk:install    # Install SDK dependencies
make web:install    # Install web dependencies

make build          # Typecheck and build API and SDK web bundles
make api:build      # Build the API web bundle
make sdk:build      # Build the embedded SDK web bundle

make seed           # Migrate and seed the Platform test Organization

make clean          # Remove tracked remote development resources

make format         # Format the code
make api:format     # Format API code
make sdk:format     # Format SDK code
make web:format     # Format web and docs code

make ty             # Run API and SDK type checks
make api:ty         # Run API type checks
make sdk:ty         # Run SDK type checks

make up             # Initialize local services, cluster, and Solution image
make web            # Run the Vite web app
make api            # Run the LongLink Platform API after seeding

make down           # Stop local services and the cluster; retain volumes
make clear          # Remove local Compose volumes
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
        Minimalist monochrome line-art; hand-drawn white-pencil strokes; slightly irregular, organic contours; fully transparent background; sparse fine hatching for subtle depth; simple geometric forms and clear silhouettes; generous negative space; technical sketch aesthetic; highly simplified, precise, and uncluttered; no gradients, shadows, decoration, text, or visual noise.
        Simple, Futuristic, technical, analytical, controlled, efficient, and clear.
    </style>

    <content>
    
    </content>
</image>
```

