import type { ReactNode } from 'react';
import { renderStatic } from '../render';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import { AccountProvider } from '@/platform/account';
import { Outlet, Route, Routes } from 'react-router';
import { AuthenticatedUserContext } from '@/platform/hooks/use-user';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { zCurrentUser, zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

export const user = zCurrentUser.parse({
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Owner',
    email: 'owner@example.com',
    avatar: '',
    administrator: false,
    theme: 'system'
});

export const membership = zUserOrganizationMembership.parse({
    organization: { id: '00000000-0000-4000-8000-000000000002', name: 'Acme', status: 'running' },
    role: 'owner'
});

/** Renders a resolved Platform route with validated identity and explicit cached API responses. */
export function renderPlatform(
    children: ReactNode,
    path = '/',
    resources: ReadonlyArray<readonly [string, object]> = [],
    pattern = '*',
    context: typeof membership | OrganizationContext = membership
) {
    return renderStatic(
        <ApiErrorContext value={() => undefined}>
            <AccountProvider>
                <AuthenticatedUserContext value={user}>
                    <Routes>
                        <Route element={<Outlet context={context} />}>
                            <Route path={pattern} element={<ApiBoundary>{children}</ApiBoundary>} />
                        </Route>
                    </Routes>
                </AuthenticatedUserContext>
            </AccountProvider>
        </ApiErrorContext>,
        path,
        resources
    );
}
