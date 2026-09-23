// @vitest-environment happy-dom
import { act } from 'react';
import { ApiProvider } from '@/providers';
import { MemoryRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { cleanupMountedRoot } from './xml/helpers';
import { PlatformView } from '@/components/PlatformView';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import settingsSource from '@/platform/views/orgs/settings.xml?raw';

const organizationId = '00000000-0000-4000-8000-000000000003';
const solutionId = '00000000-0000-4000-8000-000000000002';
const revisionId = '00000000-0000-4000-8000-000000000001';
const candidate = {
    current_image: `ghcr.io/owner/sample@sha256:${'a'.repeat(64)}`,
    revision_id: revisionId,
    configured_envs: [],
    metadata: {
        image: `ghcr.io/owner/sample@sha256:${'b'.repeat(64)}`,
        environments: [],
    },
};

describe('Solution source update dialog', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let container: HTMLElement | undefined;

    afterEach(async () => {
        await cleanupMountedRoot(root);
        container?.remove();
        vi.unstubAllGlobals();
    });

    it('uses the native XML dialog to review and submit a source update', async () => {
        const submissions: unknown[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const path = new URL(request.url).pathname;

            if (request.method === 'POST') {
                submissions.push(await request.json());
                return new Response(null, { status: 204 });
            }

            if (path === '/api/v1/organizations/slug/development') {
                return Response.json({ organization: { id: organizationId }, role: 'maintain' });
            }
            if (path === `/api/v1/organizations/${organizationId}`) {
                return Response.json({ organization: { name: 'Development' }, members: [], invitations: [] });
            }
            if (path === `/api/v1/organizations/${organizationId}/storage`)
                return Response.json({ space_used: 0, quota_bytes: 1 });
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
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        await act(async () =>
            root?.render(
                <LayerProvider>
                    <ApiProvider>
                        <MemoryRouter initialEntries={['/#solutions']}>
                            <PlatformView source={settingsSource} params={{ organization: 'development' }} />
                        </MemoryRouter>
                    </ApiProvider>
                </LayerProvider>
            )
        );

        await act(async () => vi.waitFor(() => expect(moreMenu()).not.toBeNull()));
        await act(async () => moreMenu()?.click());
        await act(async () => vi.waitFor(() => expect(menuItem('Update')).not.toBeNull()));
        await act(async () => menuItem('Update')?.click());
        await act(async () => vi.waitFor(() => expect(button('Update solution').disabled).toBe(false)));
        await act(async () => button('Update solution').click());
        await act(async () => vi.waitFor(() => expect(submissions).toHaveLength(1)));

        expect(document.body.textContent).toContain('Current sha256:aaaaaaaaaaaa');
        expect(document.body.textContent).toContain('New sha256:bbbbbbbbbbbb');
        expect(document.body.textContent).not.toContain('Always on');
        expect(submissions).toEqual([{ envs: {}, expected_revision_id: revisionId }]);
    });

    /** Find the named native XML action without replacing UI components. */
    function button(label: string) {
        const found = [...document.querySelectorAll('button')].find((item) => item.textContent === label);
        if (!found) throw new Error(`Button not found: ${label}`);
        return found;
    }

    /** Return the solution overflow-menu trigger. */
    function moreMenu() {
        return document.querySelector<HTMLButtonElement>('button[aria-label="More options"]');
    }

    /** Return the named overflow-menu item. */
    function menuItem(label: string) {
        return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
            (item) => item.textContent === label
        );
    }
});
