// @vitest-environment happy-dom
import { act } from 'react';
import PlatformRoot from '@/platform/root';
import { createRoot } from 'react-dom/client';
import Settings from '@/platform/routes/orgs/Settings';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrganizationLayout from '@/platform/layouts/Organization';
import AuthenticatedLayout from '@/platform/layouts/Authenticated';

const organizationId = '00000000-0000-4000-8000-000000000003';

const solutionId = '00000000-0000-4000-8000-000000000002';

const revisionId = '00000000-0000-4000-8000-000000000001';

const candidate = {
    current_image: `ghcr.io/owner/sample@sha256:${'a'.repeat(64)}`,
    revision_id: revisionId,
    configured_envs: [],
    min_scale: 0,
    idle_seconds: 60,
    metadata: {
        image: `ghcr.io/owner/sample@sha256:${'b'.repeat(64)}`,
        environments: [],
    },
};

describe('Solution source update dialog', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let container: HTMLElement | undefined;

    afterEach(async () => {
        // Unmount before removing the container and restoring globals.
        const mountedRoot = root;

        if (mountedRoot) await act(async () => mountedRoot.unmount());

        container?.remove();
        vi.unstubAllGlobals();
    });

    it('uses the native TSX dialog to review and submit a source update', async () => {
        const submissions: { path: string; body: unknown }[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const path = new URL(request.url).pathname;

            if (request.method === 'POST') {
                submissions.push({ path, body: await request.json() });

                return new Response(null, { status: 204 });
            }

            if (path === '/api/v1/me') {
                return Response.json({
                    id: '00000000-0000-4000-8000-000000000004',
                    name: 'Maintainer',
                    email: 'maintainer@example.com',
                    avatar: '',
                    administrator: false,
                });
            }

            if (path === '/api/v1/organizations/slug/development') {
                return Response.json({
                    organization: { id: organizationId, name: 'Development', slug: 'development', status: 'running' },
                    role: 'maintain',
                });
            }

            if (path === `/api/v1/organizations/${organizationId}/solutions`) {
                return Response.json([
                    {
                        id: solutionId,
                        name: 'Sample',
                        slug: 'sample',
                        status: 'running',
                        desired_revision_id: revisionId,
                        deployment_pending: false,
                    },
                ]);
            }

            if (path === `/api/v1/solutions/${solutionId}/update`) return Response.json(candidate);

            throw new Error(`Unexpected request ${request.method} ${path}`);
        });
        container = document.createElement('section');
        document.body.append(container);
        const mountedRoot = createRoot(container);
        root = mountedRoot;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        await act(async () =>
            mountedRoot.render(
                <MemoryRouter initialEntries={['/orgs/development/settings#solutions']}>
                    <Routes>
                        <Route element={<PlatformRoot />}>
                            <Route element={<AuthenticatedLayout />}>
                                <Route path="/orgs/:organization" element={<OrganizationLayout />}>
                                    <Route path="settings" element={<Settings />} />
                                </Route>
                            </Route>
                        </Route>
                    </Routes>
                </MemoryRouter>
            )
        );

        await vi.waitFor(async () => {
            await act(async () => {});
            moreMenu();
        });
        await act(async () => moreMenu().click());
        await act(async () => {
            await vi.waitFor(() => menuItem('Update'));
        });
        await act(async () => menuItem('Update').click());
        await act(async () => vi.waitFor(() => button('Next')));
        expect(document.body.textContent).toContain('sha256:aaaaaaaaaaaa');
        expect(document.body.textContent).toContain('sha256:bbbbbbbbbbbb');
        await act(async () => button('Next').click());
        await act(async () => vi.waitFor(() => expect(button('Update solution').disabled).toBe(false)));
        await act(async () => button('Update solution').click());
        await act(async () =>
            vi.waitFor(() =>
                expect(submissions).toEqual([
                    {
                        path: `/api/v1/solutions/${solutionId}/update`,
                        body: { envs: {}, expected_revision_id: revisionId },
                    },
                ])
            )
        );
    });

    /** Find the named native action without replacing UI components. */
    function button(label: string) {
        const found = [...document.querySelectorAll('button')].find((item) => item.textContent === label);

        if (!found) throw new Error(`Button not found: ${label}`);

        return found;
    }

    /** Return the solution overflow-menu trigger. */
    function moreMenu() {
        const found = document.querySelector<HTMLButtonElement>('button[aria-label="More options"]');

        if (!found) throw new Error('Solution overflow-menu trigger not found');

        return found;
    }

    /** Return the named overflow-menu item. */
    function menuItem(label: string) {
        const found = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
            (item) => item.textContent === label
        );

        if (!found) throw new Error(`Menu item not found: ${label}`);

        return found;
    }
});
