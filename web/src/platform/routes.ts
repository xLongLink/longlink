import { legalPages } from './legal';
import { adminPages } from './navigation';
// Use cases are a work in progress; keep their routes unpublished until ready.
// import { useCasePages } from './usecases';
import { componentDocumentation } from './docs';
import { index, layout, prefix, route, type RouteConfig } from '@react-router/dev/routes';

export default [
    layout('./layouts/Page.tsx', [
        index('./routes/Index.tsx'),
        route('pricing', './routes/Pricing.tsx'),
        // route('use-cases', './routes/usecases/Index.tsx'),
    ]),
    /* Use cases are a work in progress; retain the route definitions for later.
    layout('./layouts/UseCases.tsx', [
        ...prefix('use-cases', [
            ...useCasePages.map(({ path, module }) => route(path.slice('/use-cases/'.length), module)),
            route('*', '../components/layouts/NotFound.tsx', { id: 'use-cases-not-found' }),
        ]),
    ]),
    */
    ...prefix('docs', [
        layout('./layouts/Documentation.tsx', [
            index('./routes/docs/Index.tsx'),
            route('introduction', './routes/docs/Introduction.tsx'),
            ...prefix('sdk', [
                index('./routes/docs/sdk/Index.tsx'),
                route('building', './routes/docs/sdk/Building.tsx'),
                route('database', './routes/docs/sdk/Database.tsx'),
                route('environments', './routes/docs/sdk/Environments.tsx'),
                route('routes', './routes/docs/sdk/Routes.tsx'),
                route('storage', './routes/docs/sdk/Storage.tsx'),
                route('testing', './routes/docs/sdk/Testing.tsx'),
                ...prefix('views', [
                    index('./routes/docs/sdk/Views.tsx'),

                    // Keep component routes aligned with the published documentation catalog.
                    ...componentDocumentation.map(({ slug, label }) =>
                        route(slug, `./routes/docs/sdk/views/${label}.tsx`)
                    ),
                ]),
            ]),
            ...prefix('api', [index('./routes/docs/api/Index.tsx')]),
            route('*', '../components/layouts/NotFound.tsx', { id: 'docs-not-found' }),
        ]),
    ]),
    layout('./layouts/Legal.tsx', [
        ...legalPages.map(({ path, module }) => route(path.slice(1), module)),
        ...prefix('branding', [
            route('assets', './routes/branding/Assets.tsx'),
            route('values', './routes/branding/Values.tsx'),
            route('comunication', './routes/branding/Communication.tsx'),
        ]),
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
            layout(
                './layouts/Admin.tsx',
                adminPages.map(({ id, path, module }) => route(path, module, { id }))
            ),
        ]),
        ...prefix('orgs/:organization', [
            layout('./layouts/Organization.tsx', [
                index('./routes/orgs/Organization.tsx'),
                route('settings', './routes/orgs/Settings.tsx'),
            ]),
            route('solutions/:solution/*', './routes/orgs/Solution.tsx'),
        ]),
    ]),
] satisfies RouteConfig;
