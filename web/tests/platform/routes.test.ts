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
