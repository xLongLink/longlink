import { getRoutes } from '@/App';
import { describe, expect, it } from 'bun:test';

describe('getRoutes', () => {
    it('builds the SDK wildcard route only in SDK mode', () => {
        const routes = getRoutes('sdk');

        expect(routes).toHaveLength(1);
        expect(routes[0].path).toBe('*');
    });

    it('builds the API-mode public, docs, organization, admin, and proxied app route tree', () => {
        const routes = getRoutes('api');
        const routePaths = routes.map((route) => route.path);
        const adminRoute = routes.find((route) => route.path === 'admin');
        const adminChildPaths = adminRoute?.children?.map((route) => route.path ?? 'index') ?? [];

        expect(routePaths).toContain('/');
        expect(routePaths).toContain('pricing');
        expect(routePaths).toContain('impressum');
        expect(routePaths).toContain('privacy');
        expect(routePaths).toContain('terms');
        expect(routePaths).toContain('docs');
        expect(routePaths).toContain('organizations');
        expect(routePaths).toContain('settings');
        expect(routePaths).toContain('orgs/:organization');
        expect(routePaths).toContain('orgs/:organization/apps/:application/*');
        expect(routePaths).toContain('*');
        expect(adminChildPaths).toEqual([
            'index',
            'users',
            'applications',
            'organizations',
            'locations',
            'database',
            'database/:database',
            'database/:database/databases/:databaseName',
            'storage',
            'storage/:storage',
            'storage/:storage/buckets/:bucket',
            'compute',
            'compute/:compute',
            'compute/:compute/namespace/:namespace',
            'operations',
        ]);
    });
});
