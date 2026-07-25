import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
    index('./routes/home.tsx'),
    route('docs/*', './routes/docs.tsx'),
    route('terms', './routes/legal.tsx', { id: 'terms' }),
    route('privacy', './routes/legal.tsx', { id: 'privacy' }),
    route('impressum', './routes/legal.tsx', { id: 'impressum' }),
    route('pricing', './routes/pricing.tsx'),
    route('auth/register', '../pages/auth/Register.tsx'),
    route('auth/verify-email', '../pages/auth/VerifyEmail.tsx'),
    route('auth/forgot-password', '../pages/auth/ForgotPassword.tsx'),
    route('auth/reset-password', '../pages/auth/ResetPassword.tsx'),
    route('auth/complete', '../pages/auth/Complete.tsx'),
    route('organizations', '../pages/Organizations.tsx'),
    route('settings', './routes/settings.tsx'),
    layout('../pages/Admin.tsx', [
        route('admin/users', '../pages/admin/Users.tsx'),
        route('admin/applications', '../pages/admin/Applications.tsx'),
        route('admin/organizations', '../pages/admin/Organizations.tsx'),
        route('admin/database', '../pages/admin/Database.tsx'),
        route('admin/storage', '../pages/admin/Storage.tsx'),
        route('admin/compute', '../pages/admin/Compute.tsx'),
        route('admin/compute/:compute', '../pages/admin/ComputeNamespaces.tsx'),
        route('admin/compute/:compute/namespace/:namespace', '../pages/admin/ComputePods.tsx'),
        route('admin/operations', '../pages/admin/Operations.tsx'),
    ]),
    route('orgs/:organization', './routes/organization.tsx', { id: 'organization' }),
    route('orgs/:organization/settings', './routes/organization.tsx', { id: 'organization-settings' }),
    route('orgs/:organization/settings/applications/:settingsApplication?', './routes/organization.tsx', {
        id: 'organization-application-settings',
    }),
    route('orgs/:organization/settings/people', './routes/organization.tsx', {
        id: 'organization-people',
    }),
    route('orgs/:organization/settings/database', './routes/organization.tsx', {
        id: 'organization-database',
    }),
    route('orgs/:organization/settings/storage', './routes/organization.tsx', {
        id: 'organization-storage',
    }),
    route('orgs/:organization/apps/:application/*', '../pages/OrganizationApplication.tsx'),
    route('*', '../pages/NotFound.tsx'),
] satisfies RouteConfig;
