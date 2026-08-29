import { index, layout, prefix, route, type RouteConfig } from '@react-router/dev/routes';

export default [
    route('ppt', './routes/Ppt.tsx'),
    layout('./layouts/Page.tsx', [index('./routes/Index.tsx'), route('pricing', './routes/Pricing.tsx')]),
    ...prefix('docs', [
        layout('./layouts/Documentation.tsx', [
            index('./routes/docs/Index.tsx'),
            ...prefix('api', [
                index('./routes/docs/api/Index.tsx'),
                route('applications', './routes/docs/api/Applications.tsx'),
                route('organizations', './routes/docs/api/Organizations.tsx'),
            ]),
            ...prefix('sdk', [
                index('./routes/docs/sdk/Index.tsx'),
                route('building', './routes/docs/sdk/Building.tsx'),
                route('database', './routes/docs/sdk/Database.tsx'),
                route('environments', './routes/docs/sdk/Environments.tsx'),
                route('routes', './routes/docs/sdk/Routes.tsx'),
                route('storage', './routes/docs/sdk/Storage.tsx'),
                route('testing', './routes/docs/sdk/Testing.tsx'),
                ...prefix('pages', [
                    index('./routes/docs/sdk/Pages.tsx'),
                    route('bindings', './routes/docs/sdk/pages/Bindings.tsx'),
                    route('expressions', './routes/docs/sdk/pages/Expressions.tsx'),
                    route(':component', './routes/docs/sdk/pages/Component.tsx'),
                ]),
            ]),
            route('*', '../components/layouts/NotFound.tsx', { id: 'docs-not-found' }),
        ]),
    ]),
    layout('./layouts/Legal.tsx', [
        route('terms', './routes/legal/Terms.tsx'),
        route('privacy', './routes/legal/Privacy.tsx'),
        route('impressum', './routes/legal/Impressum.tsx'),
    ]),
    layout('./layouts/Brand.tsx', [
        ...prefix('auth', [
            route('register', './routes/auth/Register.tsx'),
            route('verify-email', './routes/auth/VerifyEmail.tsx'),
            route('forgot-password', './routes/auth/ForgotPassword.tsx'),
            route('reset-password', './routes/auth/ResetPassword.tsx'),
        ]),
        route('login', './routes/auth/Login.tsx'),
        route('*', '../components/layouts/NotFound.tsx'),
    ]),
    layout('./layouts/Authenticated.tsx', [
        ...prefix('user', [
            layout('./layouts/User.tsx', [
                route('organizations', './routes/user/Organizations.tsx'),
                route('settings', './routes/user/Settings.tsx'),
            ]),
        ]),
        ...prefix('admin', [
            layout('./layouts/Admin.tsx', [
                route('users', './routes/admin/Users.tsx'),
                route('applications', './routes/admin/Applications.tsx'),
                route('organizations', './routes/admin/Organizations.tsx'),
                route('database', './routes/admin/Database.tsx'),
                route('storage', './routes/admin/Storage.tsx'),
                route('compute', './routes/admin/Compute.tsx'),
                route('operations', './routes/admin/Operations.tsx'),
            ]),
        ]),
        ...prefix('orgs/:organization', [
            layout('./layouts/Organization.tsx', [
                index('./routes/orgs/Organization.tsx'),
                route('settings', './routes/orgs/Settings.tsx'),
            ]),
            route('apps/:application/*', './routes/orgs/Application.tsx'),
        ]),
    ]),
] satisfies RouteConfig;
