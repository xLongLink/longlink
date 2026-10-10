# Contributing to LongLink

The LongLink Platform owns authentication, authorization, orchestration, storage, and routing for Solutions.

The web package owns native TypeScript Platform pages and the isolated JSX Solution View runtime used by both Platform and SDK bundles.

The SDK owns shared-schema models, migrations, and synchronization helpers alongside Python helpers for Solution projects, project migrations, CLI commands, database helpers, and packaged JSX authoring declarations. The API executes shared migrations and writes with control-plane credentials; Solution runtimes receive read-only shared access.

<br />

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

## Release

```bash
git fetch origin main
git tag vX.Y.Z origin/main
git push origin vX.Y.Z
```
