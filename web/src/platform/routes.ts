import { index, layout, prefix, route, type RouteConfig } from '@react-router/dev/routes';

export default [
    layout('./layouts/Page.tsx', [
        index('./routes/Index.tsx'),
        route('pricing', './routes/Pricing.tsx'),
        route('marketplace', './routes/Marketplace.tsx'),
    ]),
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
                    route('action', './routes/docs/sdk/pages/Action.tsx'),
                    route('avatar', './routes/docs/sdk/pages/Avatar.tsx'),
                    route('badge', './routes/docs/sdk/pages/Badge.tsx'),
                    route('bindings', './routes/docs/sdk/pages/Bindings.tsx'),
                    route('button', './routes/docs/sdk/pages/Button.tsx'),
                    route('card', './routes/docs/sdk/pages/Card.tsx'),
                    route('checkbox-input', './routes/docs/sdk/pages/CheckboxInput.tsx'),
                    route('dialog', './routes/docs/sdk/pages/Dialog.tsx'),
                    route('divider', './routes/docs/sdk/pages/Divider.tsx'),
                    route('expressions', './routes/docs/sdk/pages/Expressions.tsx'),
                    route('file-input', './routes/docs/sdk/pages/FileInput.tsx'),
                    route('for', './routes/docs/sdk/pages/For.tsx'),
                    route('grid', './routes/docs/sdk/pages/Grid.tsx'),
                    route('heading', './routes/docs/sdk/pages/Heading.tsx'),
                    route('icon', './routes/docs/sdk/pages/Icon.tsx'),
                    route('if', './routes/docs/sdk/pages/If.tsx'),
                    route('link', './routes/docs/sdk/pages/Link.tsx'),
                    route('menu', './routes/docs/sdk/pages/Menu.tsx'),
                    route('number-input', './routes/docs/sdk/pages/NumberInput.tsx'),
                    route('query', './routes/docs/sdk/pages/Query.tsx'),
                    route('radio-list', './routes/docs/sdk/pages/RadioList.tsx'),
                    route('selector', './routes/docs/sdk/pages/Selector.tsx'),
                    route('slider', './routes/docs/sdk/pages/Slider.tsx'),
                    route('stack', './routes/docs/sdk/pages/Stack.tsx'),
                    route('state', './routes/docs/sdk/pages/State.tsx'),
                    route('switch', './routes/docs/sdk/pages/Switch.tsx'),
                    route('tab', './routes/docs/sdk/pages/Tab.tsx'),
                    route('table', './routes/docs/sdk/pages/Table.tsx'),
                    route('text', './routes/docs/sdk/pages/Text.tsx'),
                    route('text-area', './routes/docs/sdk/pages/TextArea.tsx'),
                    route('text-input', './routes/docs/sdk/pages/TextInput.tsx'),
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
