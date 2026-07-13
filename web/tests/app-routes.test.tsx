import { getRoutes } from '@/App';
import { describe, expect, it } from 'bun:test';

type RouteLike = {
    index?: boolean;
    path?: string;
    children?: RouteLike[];
};

/** Collects route paths from nested route trees using full browser paths. */
function collectRoutePaths(routes: RouteLike[], parentPath = ''): string[] {
    return routes.flatMap((route) => {
        const routePath = route.path ?? '';
        const path = routePath ? [parentPath, routePath].filter(Boolean).join('/') : parentPath;
        const routePaths = routePath || route.index ? [path] : [];
        const childPaths = route.children ? collectRoutePaths(route.children, path) : [];

        return [...routePaths, ...childPaths];
    });
}

describe('getRoutes', () => {
    it('builds the SDK wildcard route only in SDK mode', () => {
        const routes = getRoutes('sdk');

        expect(routes).toHaveLength(1);
        expect(routes[0].path).toBe('*');
    });

    it('builds the API-mode public, organization, admin, and gateway-backed app routes', () => {
        const routes = getRoutes('api');
        const routePaths = collectRoutePaths(routes);

        expect(routePaths).toContain('/');
        expect(routePaths).toContain('admin');
        expect(routePaths).toContain('admin/users');
        expect(routePaths).toContain('admin/locations');
        expect(routePaths).toContain('organizations');
        expect(routePaths).toContain('orgs/:organization');
        expect(routePaths).toContain('orgs/:organization/settings/applications');
        expect(routePaths).toContain('orgs/:organization/settings/applications/:settingsApplication');
        expect(routePaths).toContain('orgs/:organization/settings/database');
        expect(routePaths).toContain(
            'orgs/:organization/settings/database/:settingsDatabaseResourceType/:settingsDatabaseResource'
        );
        expect(routePaths).toContain('orgs/:organization/settings/storage');
        expect(routePaths).toContain('orgs/:organization/settings/storage/:settingsBucket');
        expect(routePaths).toContain('orgs/:organization/apps/:application/*');
        expect(routePaths).toContain('*');
    });
});
