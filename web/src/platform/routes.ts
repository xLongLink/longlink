import type { RouteConfig } from '@react-router/dev/routes';
import { brandingPages, documentationPages, legalPages } from './publications';

export default [
    {
        file: './layouts/page.tsx',
        children: [
            { index: true, file: './routes/index.tsx' },
            { path: 'pricing', file: './routes/pricing.tsx' }
        ]
    },
    {
        file: './layouts/explore.tsx',
        children: [
            { path: 'explore', file: './routes/explore-solutions.tsx', id: 'explore' },
            { path: 'explore/solutions', file: './routes/explore-solutions.tsx' },
            { path: 'explore/catalog', file: './routes/explore.tsx', id: 'explore-catalog' }
        ]
    },
    { path: 'explore/solutions/:solution/*', file: './routes/public-solution.tsx' },
    {
        file: './layouts/documentation.tsx',
        children: [
            ...documentationPages.map(({ path, file, index }) => ({
                path: path.slice(1),
                file,
                ...(index ? { index } : {})
            })),
            { path: 'docs/*', file: '../components/layouts/not-found.tsx', id: 'docs-not-found' }
        ]
    },
    {
        file: './layouts/legal.tsx',
        children: [...legalPages, ...brandingPages].map(({ path, file }) => ({ path: path.slice(1), file }))
    },
    {
        file: './layouts/account.tsx',
        children: [
            { path: 'login', file: './routes/auth/login.tsx' },
            { path: 'auth/register', file: './routes/auth/register.tsx' },
            { path: 'auth/verify-email', file: './routes/auth/verify-email.tsx' },
            { path: 'auth/forgot-password', file: './routes/auth/forgot-password.tsx' },
            { path: 'auth/reset-password', file: './routes/auth/reset-password.tsx' }
        ]
    },
    {
        file: './layouts/brand.tsx',
        children: [
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
