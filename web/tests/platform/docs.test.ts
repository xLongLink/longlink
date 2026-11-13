import { it, expect } from 'vitest';
import routes from '@/platform/routes';
import type { RouteConfigEntry } from '@react-router/dev/routes';
import { componentDocumentation, documentationPaths } from '@/platform/publications';

it('uses the public Buttons route without publishing companion-only components', () => {
    // Assert
    expect(componentDocumentation.find((component) => component.name === 'Button')?.slug).toBe('buttons');
    expect(documentationPaths).toContain('/docs/sdk/views/buttons');
    expect(componentDocumentation.some((component) => component.name === 'CodeBlock')).toBe(false);
    expect(new Set(documentationPaths).size).toBe(documentationPaths.length);
});

it('publishes the data-driven table at the canonical Table documentation route', () => {
    const table = componentDocumentation.find((component) => component.name === 'DataTable');

    const pages = routes.flatMap<RouteConfigEntry>((route) => ('children' in route ? (route.children ?? []) : []));

    expect(table?.label).toBe('Table');
    expect(documentationPaths).toContain('/docs/sdk/views/table');
    expect(documentationPaths).not.toContain('/docs/sdk/views/data-table');
    expect(componentDocumentation.some((component) => component.name === 'Table')).toBe(false);
    expect(pages.find((page) => page?.path === 'docs/sdk/views/table')?.file).toBe('./routes/docs/sdk/views/table.tsx');
    expect(pages.some((page) => page?.path === 'docs/sdk/views/data-table')).toBe(false);
});
