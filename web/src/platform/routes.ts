import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
    index('./Home.tsx'),
    route('docs/*', './routes/docs.tsx'),
    route('terms', './routes/legal.tsx', { id: 'terms' }),
    route('privacy', './routes/legal.tsx', { id: 'privacy' }),
    route('impressum', './routes/legal.tsx', { id: 'impressum' }),
    route('pricing', './Pricing.tsx'),
    route('marketplace', './routes/marketplace.tsx'),
    route('auth/register', './auth/Register.tsx'),
    route('auth/verify-email', './auth/VerifyEmail.tsx'),
    route('auth/forgot-password', './auth/ForgotPassword.tsx'),
    route('auth/reset-password', './auth/ResetPassword.tsx'),
    route('organizations', './Organizations.tsx'),
    route('settings', './routes/settings.tsx'),
    layout('./Admin.tsx', [
        route('admin/users', './admin/Users.tsx'),
        route('admin/applications', './admin/Applications.tsx'),
        route('admin/organizations', './admin/Organizations.tsx'),
        route('admin/database', './admin/Database.tsx'),
        route('admin/storage', './admin/Storage.tsx'),
        route('admin/compute', './admin/Compute.tsx'),
        route('admin/operations', './admin/Operations.tsx'),
    ]),
    route('orgs/:organization', './routes/organization.tsx', { id: 'organization' }),
    route('orgs/:organization/settings', './routes/organization.tsx', { id: 'organization-settings' }),
    route('orgs/:organization/settings/applications', './routes/organization.tsx', {
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
    route('orgs/:organization/apps/:application/*', './OrganizationApplication.tsx'),
    route('*', './NotFound.tsx'),
] satisfies RouteConfig;
