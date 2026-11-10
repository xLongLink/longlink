import { componentDocumentation } from './publications';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
    {
        file: './layouts/Page.tsx',
        children: [
            { index: true, file: './routes/Index.tsx' },
            { path: 'pricing', file: './routes/Pricing.tsx' },
            { path: 'blog', file: './routes/blog/Index.tsx' },
            { path: 'blog/why-longlink', file: './routes/blog/WhyLongLink.tsx' },
        ],
    },
    { path: 'docs/introduction', file: './routes/docs/Introduction.tsx' },
    {
        file: './layouts/Documentation.tsx',
        children: [
            { path: 'docs', index: true, file: './routes/docs/Index.tsx' },
            { path: 'docs/sdk', index: true, file: './routes/docs/sdk/Index.tsx' },
            { path: 'docs/sdk/building', file: './routes/docs/sdk/Building.tsx' },
            { path: 'docs/sdk/database', file: './routes/docs/sdk/Database.tsx' },
            { path: 'docs/sdk/environments', file: './routes/docs/sdk/Environments.tsx' },
            { path: 'docs/sdk/routes', file: './routes/docs/sdk/Routes.tsx' },
            { path: 'docs/sdk/storage', file: './routes/docs/sdk/Storage.tsx' },
            { path: 'docs/sdk/testing', file: './routes/docs/sdk/Testing.tsx' },
            { path: 'docs/sdk/views', index: true, file: './routes/docs/sdk/Views.tsx' },

            // Keep component routes aligned with the published documentation catalog.
            ...componentDocumentation.map(({ slug, label }) => ({
                path: `docs/sdk/views/${slug}`,
                file: `./routes/docs/sdk/views/${label}.tsx`,
            })),
            { path: 'docs/api', index: true, file: './routes/docs/api/Index.tsx' },
            { path: 'docs/api/organizations', file: './routes/docs/api/Organizations.tsx' },
            { path: 'docs/api/solutions', file: './routes/docs/api/Solutions.tsx' },
            { path: 'docs/api/mcp', file: './routes/docs/api/Mcp.tsx' },
            { path: 'docs/api/billing', file: './routes/docs/api/Billing.tsx' },
            { path: 'docs/api/self-hosted/platform', file: './routes/docs/api/self-hosted/Platform.tsx' },
            { path: 'docs/api/self-hosted/compute', file: './routes/docs/api/self-hosted/Compute.tsx' },
            { path: 'docs/alternatives', file: './routes/docs/alternatives/Index.tsx' },
            { path: 'docs/*', file: '../components/layouts/NotFound.tsx', id: 'docs-not-found' },
        ],
    },
    {
        file: './layouts/Legal.tsx',
        children: [
            { path: 'terms', file: './routes/legal/Terms.tsx' },
            { path: 'impressum', file: './routes/legal/Impressum.tsx' },
            { path: 'privacy', file: './routes/legal/Privacy.tsx' },
            { path: 'branding/assets', file: './routes/branding/Assets.tsx' },
            { path: 'branding/values', file: './routes/branding/Values.tsx' },
            { path: 'branding/comunication', file: './routes/branding/Communication.tsx' },
        ],
    },
    {
        file: './layouts/Account.tsx',
        children: [
            { path: 'login', file: './routes/auth/Login.tsx' },
            { path: 'auth/register', file: './routes/auth/Register.tsx' },
            { path: 'auth/forgot-password', file: './routes/auth/ForgotPassword.tsx' },
            { path: 'auth/reset-password', file: './routes/auth/ResetPassword.tsx' },
        ],
    },
    {
        file: './layouts/Brand.tsx',
        children: [
            { path: 'auth/verify-email', file: './routes/auth/VerifyEmail.tsx' },
            { path: 'mcp/authorize', file: './routes/auth/Mcp.tsx' },
            { path: '404', file: '../components/layouts/NotFound.tsx', id: 'not-found' },
            { path: '*', file: '../components/layouts/NotFound.tsx' },
        ],
    },
    {
        file: './layouts/Authenticated.tsx',
        children: [
            {
                file: './layouts/User.tsx',
                children: [
                    { path: 'user/organizations', file: './routes/user/Organizations.tsx' },
                    { path: 'user/settings', file: './routes/user/Settings.tsx' },
                ],
            },
            {
                file: './layouts/Admin.tsx',
                children: [
                    { id: 'admin-users', path: 'admin/users', file: './routes/admin/Users.tsx' },
                    { id: 'admin-solutions', path: 'admin/solutions', file: './routes/admin/Solutions.tsx' },
                    {
                        id: 'admin-organizations',
                        path: 'admin/organizations',
                        file: './routes/admin/Organizations.tsx',
                    },
                    { id: 'admin-compute', path: 'admin/compute', file: './routes/admin/Compute.tsx' },
                    { id: 'admin-operations', path: 'admin/operations', file: './routes/admin/Operations.tsx' },
                ],
            },
            {
                file: './layouts/OrganizationAccess.tsx',
                children: [
                    {
                        file: './layouts/Organization.tsx',
                        children: [
                            { path: 'orgs/:organization', index: true, file: './routes/orgs/Organization.tsx' },
                            { path: 'orgs/:organization/settings', file: './routes/orgs/Settings.tsx' },
                        ],
                    },
                    { path: 'orgs/:organization/solutions/:solution/*', file: './routes/orgs/Solution.tsx' },
                ],
            },
        ],
    },
] satisfies RouteConfig;
