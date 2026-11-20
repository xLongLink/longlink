import { it, expect } from 'vitest';
import routes from '@/platform/routes';
import { matchRoutes } from 'react-router';

it.each(['buttons', 'table'])('keeps the canonical %s documentation URL routable', (slug) => {
    // Act
    const route = matchRoutes(routes, `/docs/sdk/views/${slug}/`)?.at(-1)?.route;

    // Assert
    expect(route && 'file' in route ? route.file : undefined).toBe(`./routes/docs/sdk/views/${slug}.tsx`);
});

it.each(['code-block', 'data-table'])('does not expose a companion-only %s documentation page', (slug) => {
    // Act
    const route = matchRoutes(routes, `/docs/sdk/views/${slug}/`)?.at(-1)?.route;

    // Assert
    expect(route && 'id' in route ? route.id : undefined).toBe('docs-not-found');
});
