// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import { membership, user } from '../render';
import { ApiErrorContext } from '@/lib/errors';
import Layout from '@/platform/layouts/Organization';
import { Outlet, Route, Routes } from 'react-router';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { zOrganizationTagResponse } from '@/lib/generated/platform-api-v1/zod.gen';

it('selects the query category and updates it when following organization links', async () => {
    // Arrange
    const base = `/orgs/${membership.organization.id}`;

    const tags = zOrganizationTagResponse.array().parse([
        { id: '00000000-0000-4000-8000-000000000003', name: 'All', kind: 'all', icon: 'app-window' },
        { id: '00000000-0000-4000-8000-000000000004', name: 'Finance', kind: 'tag', icon: 'app-window' }
    ]);

    const categoryHref = `${base}?tag=${tags[1].id}`;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnMount: false } } });

    try {
        client.setQueryData(['api', `/api/v1/organizations/${membership.organization.id}/tags`], tags);

        // Act
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={() => undefined}>
                    <AuthenticatedUserContext value={user}>
                        <Routes>
                            <Route element={<Outlet context={membership} />}>
                                <Route path="/orgs/:organization" element={<Layout />} />
                            </Route>
                        </Routes>
                    </AuthenticatedUserContext>
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                // Assert
                expect(output.querySelector(`a[href="${base}"]`)).not.toBeNull();
                expect(output.querySelector(`a[href="${base}/settings"]`)).not.toBeNull();
                expect(
                    Array.from(
                        output.querySelectorAll('nav[aria-label="Section navigation"] a[aria-current="page"]'),
                        (link) => link.getAttribute('href')
                    )
                ).toEqual([categoryHref]);

                // Act
                await act(async () =>
                    output
                        .querySelector<HTMLAnchorElement>(`nav[aria-label="Section navigation"] a[href="${base}"]`)
                        ?.click()
                );

                // Assert
                expect(
                    Array.from(
                        output.querySelectorAll('nav[aria-label="Section navigation"] a[aria-current="page"]'),
                        (link) => link.getAttribute('href')
                    )
                ).toEqual([base]);

                // Act
                await act(async () => output.querySelector<HTMLAnchorElement>(`a[href="${categoryHref}"]`)?.click());

                // Assert
                expect(
                    Array.from(
                        output.querySelectorAll('nav[aria-label="Section navigation"] a[aria-current="page"]'),
                        (link) => link.getAttribute('href')
                    )
                ).toEqual([categoryHref]);
            },
            `${base}?view=grid&tag=${tags[1].id}`
        );
    } finally {
        client.clear();
    }
});
