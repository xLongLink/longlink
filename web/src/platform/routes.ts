import { componentDocumentation } from './publications';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
    {
        file: './layouts/page.tsx',
        children: [
            { index: true, file: './routes/index.tsx' },
            { path: 'pricing', file: './routes/pricing.tsx' },
            { path: 'blog', file: './routes/blog/index.tsx' },
            { path: 'blog/why-longlink', file: './routes/blog/why-long-link.tsx' }
        ]
    },
    { path: 'docs/introduction', file: './routes/docs/introduction.tsx' },
    {
        file: './layouts/documentation.tsx',
        children: [
            { path: 'docs', index: true, file: './routes/docs/index.tsx' },
            { path: 'docs/sdk', index: true, file: './routes/docs/sdk/index.tsx' },
            { path: 'docs/sdk/building', file: './routes/docs/sdk/building.tsx' },
            { path: 'docs/sdk/database', file: './routes/docs/sdk/database.tsx' },
            { path: 'docs/sdk/environments', file: './routes/docs/sdk/environments.tsx' },
            { path: 'docs/sdk/routes', file: './routes/docs/sdk/routes.tsx' },
            { path: 'docs/sdk/storage', file: './routes/docs/sdk/storage.tsx' },
            { path: 'docs/sdk/testing', file: './routes/docs/sdk/testing.tsx' },
            { path: 'docs/sdk/views', index: true, file: './routes/docs/sdk/views.tsx' },
            { path: 'docs/sdk/views/button-group', file: './routes/docs/sdk/views/button-group.tsx' },
            { path: 'docs/sdk/views/action-button-group', file: './routes/docs/sdk/views/action-button-group.tsx' },

            // Keep component routes aligned with the published documentation catalog.
            ...componentDocumentation.map(({ slug }) => ({
                path: `docs/sdk/views/${slug}`,
                file: `./routes/docs/sdk/views/${slug}.tsx`
            })),
            { path: 'docs/api', index: true, file: './routes/docs/api/index.tsx' },
            { path: 'docs/api/organizations', file: './routes/docs/api/organizations.tsx' },
            { path: 'docs/api/solutions', file: './routes/docs/api/solutions.tsx' },
            { path: 'docs/api/mcp', file: './routes/docs/api/mcp.tsx' },
            { path: 'docs/api/billing', file: './routes/docs/api/billing.tsx' },
            { path: 'docs/api/self-hosted/platform', file: './routes/docs/api/self-hosted/platform.tsx' },
            { path: 'docs/api/self-hosted/compute', file: './routes/docs/api/self-hosted/compute.tsx' },
            { path: 'docs/alternatives', file: './routes/docs/alternatives/index.tsx' },
            { path: 'docs/*', file: '../components/layouts/not-found.tsx', id: 'docs-not-found' }
        ]
    },
    {
        file: './layouts/legal.tsx',
        children: [
            { path: 'terms', file: './routes/legal/terms.tsx' },
            { path: 'impressum', file: './routes/legal/impressum.tsx' },
            { path: 'privacy', file: './routes/legal/privacy.tsx' },
            { path: 'branding/assets', file: './routes/branding/assets.tsx' },
            { path: 'branding/values', file: './routes/branding/values.tsx' },
            { path: 'branding/comunication', file: './routes/branding/communication.tsx' }
        ]
    },
    {
        file: './layouts/account.tsx',
        children: [
            { path: 'login', file: './routes/auth/login.tsx' },
            { path: 'auth/register', file: './routes/auth/register.tsx' },
            { path: 'auth/forgot-password', file: './routes/auth/forgot-password.tsx' },
            { path: 'auth/reset-password', file: './routes/auth/reset-password.tsx' }
        ]
    },
    {
        file: './layouts/brand.tsx',
        children: [
            { path: 'auth/verify-email', file: './routes/auth/verify-email.tsx' },
            { path: 'mcp/authorize', file: './routes/auth/mcp.tsx' },
            { path: '404', file: '../components/layouts/not-found.tsx', id: 'not-found' },
            { path: '*', file: '../components/layouts/not-found.tsx' }
        ]
    },
    {
        file: './layouts/authenticated.tsx',
        children: [
            {
                file: './layouts/user.tsx',
                children: [
                    { path: 'user/organizations', file: './routes/user/organizations.tsx' },
                    { path: 'user/settings', file: './routes/user/settings.tsx' }
                ]
            },
            {
                file: './layouts/admin.tsx',
                children: [
                    { id: 'admin-users', path: 'admin/users', file: './routes/admin/users.tsx' },
                    { id: 'admin-solutions', path: 'admin/solutions', file: './routes/admin/solutions.tsx' },
                    {
                        id: 'admin-organizations',
                        path: 'admin/organizations',
                        file: './routes/admin/organizations.tsx'
                    },
                    { id: 'admin-compute', path: 'admin/compute', file: './routes/admin/compute.tsx' },
                    { id: 'admin-operations', path: 'admin/operations', file: './routes/admin/operations.tsx' }
                ]
            },
            {
                file: './layouts/organization-access.tsx',
                children: [
                    {
                        file: './layouts/organization.tsx',
                        children: [
                            { path: 'orgs/:organization', index: true, file: './routes/orgs/organization.tsx' },
                            { path: 'orgs/:organization/settings', file: './routes/orgs/settings.tsx' }
                        ]
                    },
                    { path: 'orgs/:organization/solutions/:solution/*', file: './routes/orgs/solution.tsx' }
                ]
            }
        ]
    }
] satisfies RouteConfig;
