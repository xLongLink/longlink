# Contributing to LongLink

The LongLink Platform owns authentication, authorization, orchestration, storage, and routing for Solutions.

The web package owns native TypeScript Platform pages and the isolated JSX Solution View runtime used by both Platform and SDK bundles.

The SDK owns each Solution's local users table alongside Python helpers for Solution projects, project migrations, CLI commands, database helpers, and packaged JSX authoring declarations. The API sends signed user profiles with authenticated requests; Solution runtimes persist last-seen profiles in their own schemas.

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
  Minimalist monochrome technical sketch matching the reference. Thin white pencil lines, slightly rough and grainy, with imperfect hand-drawn contours, sparse construction lines, and very light hatching. Simple geometric forms, strong silhouettes, lots of negative space. Fully transparent background. No color, text, gradients, shadows, photorealism, or dense detail.
</style>
```

## Release

```bash
git fetch origin main
git tag vX.Y.Z origin/main
git push origin vX.Y.Z
```
