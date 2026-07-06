import { getRoutes } from '@/App';
import { describe, expect, it } from 'bun:test';

describe('getRoutes', () => {
    it('builds the SDK wildcard route only in SDK mode', () => {
        const routes = getRoutes('sdk');

        expect(routes).toHaveLength(1);
        expect(routes[0].path).toBe('*');
    });

    it('builds the API-mode public, organization, admin, and proxied app routes', () => {
        const routes = getRoutes('api');
        const routePaths = routes.map((route) => route.path);
        const adminRoute = routes.find((route) => route.path === 'admin');

        expect(routePaths).toContain('/');
        expect(routePaths).toContain('organizations');
        expect(routePaths).toContain('orgs/:organization');
        expect(routePaths).toContain('orgs/:organization/settings/applications');
        expect(routePaths).toContain('orgs/:organization/settings/applications/:settingsApplication');
        expect(routePaths).toContain('orgs/:organization/settings/database');
        expect(routePaths).toContain(
            'orgs/:organization/settings/database/:settingsDatabaseResourceType/:settingsDatabaseResource'
        );
        expect(routePaths).toContain(
            'orgs/:organization/settings/database/:settingsDatabaseResourceType/:settingsDatabaseResource/tables/:settingsDatabaseTable'
        );
        expect(routePaths).toContain('orgs/:organization/settings/storage');
        expect(routePaths).toContain('orgs/:organization/settings/storage/:settingsBucket');
        expect(routePaths).toContain('orgs/:organization/apps/:application/*');
        expect(routePaths).toContain('*');
        expect(adminRoute?.children?.length).toBeGreaterThan(0);
    });
});
