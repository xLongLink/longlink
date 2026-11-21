import type { ReactNode } from 'react';
import { renderStatic } from '../render';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import { useQuery } from '@tanstack/react-query';
import { currentUserKey } from '@/lib/react-query';
import { Outlet, Route, Routes } from 'react-router';
import { CurrentUserContext } from '@/platform/hooks/use-user';
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

/** Supplies an account observer without requesting an unrelated identity refresh. */
export function TestAccountProvider({
    children,
    account = user
}: {
    children: ReactNode;
    account?: typeof user | null;
}) {
    const currentUser = useQuery({ queryKey: currentUserKey, initialData: account, enabled: false });

    return <CurrentUserContext value={currentUser}>{children}</CurrentUserContext>;
}

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
            <TestAccountProvider>
                <Routes>
                    <Route element={<Outlet context={context} />}>
                        <Route path={pattern} element={<ApiBoundary>{children}</ApiBoundary>} />
                    </Route>
                </Routes>
            </TestAccountProvider>
        </ApiErrorContext>,
        path,
        resources
    );
}
