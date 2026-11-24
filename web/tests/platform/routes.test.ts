import { it, expect } from 'vitest';
import routes from '@/platform/routes';
import { matchRoutes } from 'react-router';
import { brandingPaths } from '@/platform/publications';

it('keeps the legacy Communication URL routable and published', () => {
    // Arrange
    const path = '/branding/comunication';

    // Act
    const route = matchRoutes(routes, path)?.at(-1)?.route;

    // Assert
    expect(brandingPaths).toContain(path);
    expect(route && 'path' in route ? route.path : undefined).toBe(path.slice(1));
});

it.each([
    ['/docs', './routes/docs/index.tsx'],
    ['/docs/sdk', './routes/docs/sdk/index.tsx'],
    ['/docs/sdk/views', './routes/docs/sdk/views.tsx'],
    ['/docs/api', './routes/docs/api/index.tsx']
])('preserves the path-bearing index route for %s', (path, file) => {
    // Arrange
    const matches = matchRoutes(routes, path);

    // Act
    const route = matches?.at(-1)?.route;

    // Assert
    expect(route).toMatchObject({ path: path.slice(1), file, index: true });
});

it('keeps unknown documentation URLs inside the documentation layout', () => {
    // Arrange
    const path = '/docs/sdk/views/unknown-component';

    // Act
    const matches = matchRoutes(routes, path);

    // Assert
    expect(matches?.at(-2)?.route).toMatchObject({ file: './layouts/documentation.tsx' });
    expect(matches?.at(-1)?.route).toMatchObject({ id: 'docs-not-found' });
});
