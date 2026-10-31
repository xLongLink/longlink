import type { ReactNode } from 'react';
import { renderStatic } from '../render';
import { ApiErrorContext } from '@/lib/errors';
import { Outlet, Route, Routes } from 'react-router';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';
import type { OrganizationContext } from '@/platform/layouts/Organization';
import { zCurrentUser, zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

export const user = zCurrentUser.parse({
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Owner',
    email: 'owner@example.com',
    avatar: '',
    administrator: false,
    theme: 'system',
    accent: 'neutral',
    navigation: 'topbar',
});

export const membership = zUserOrganizationMembership.parse({
    organization: { id: '00000000-0000-4000-8000-000000000002', name: 'Acme', slug: 'acme', status: 'running' },
    role: 'owner',
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
            <AuthenticatedUserContext value={user}>
                <Routes>
                    <Route element={<Outlet context={context} />}>
                        <Route path={pattern} element={children} />
                    </Route>
                </Routes>
            </AuthenticatedUserContext>
        </ApiErrorContext>,
        path,
        resources
    );
}
