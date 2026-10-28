// @vitest-environment happy-dom
import { act } from 'react';
import PlatformRoot from '@/platform/root';
import { createRoot } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeploymentReview from '@/platform/routes/orgs/DeploymentReview';

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

const secretCandidate = {
    ...candidate,
    configured_envs: ['REQUIRED_SECRET', 'OPTIONAL_SECRET'],
    metadata: {
        ...candidate.metadata,
        environments: [
            { name: 'REQUIRED_SECRET', required: true },
            { name: 'NEW_SECRET', required: true },
            { name: 'OPTIONAL_SECRET', required: false },
        ],
    },
};

describe('DeploymentReview', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let container: HTMLElement | undefined;

    afterEach(async () => {
        // Unmount before removing the container and restoring globals.
        const mountedRoot = root;

        if (mountedRoot) await act(async () => mountedRoot.unmount());

        container?.remove();
        vi.unstubAllGlobals();
    });

    it('submits the reviewed revision with a source update', async () => {
        // Arrange
        const submissions = await openReview(candidate);

        // Act
        await act(async () => button('Next').click());
        await act(async () => vi.waitFor(() => expect(button('Update solution').disabled).toBe(false)));
        await act(async () => button('Update solution').click());

        // Assert
        await vi.waitFor(() =>
            expect(submissions).toEqual([
                {
                    path: `/api/v1/solutions/${solutionId}/update`,
                    body: { envs: {}, expected_revision_id: revisionId },
                },
            ])
        );
    });

    it('preserves untouched configured secrets and gives removal precedence over an edited value', async () => {
        // Arrange
        const submissions = await openReview(secretCandidate);
        const user = userEvent.setup();
        await act(async () => button('Next').click());

        // Act
        // The image already changed, so only the missing required value blocks submission.
        expect(input('REQUIRED_SECRET').value).toBe('');
        expect(button('Update solution').disabled).toBe(true);
        await act(async () => user.type(input('NEW_SECRET'), '   '));
        expect(button('Update solution').disabled).toBe(true);
        await act(async () => user.clear(input('NEW_SECRET')));
        await act(async () => user.type(input('NEW_SECRET'), 'new-fixture-value'));
        expect(button('Update solution').disabled).toBe(false);
        await act(async () => user.type(input('OPTIONAL_SECRET'), 'replacement-fixture-value'));
        await act(async () => input('Remove OPTIONAL_SECRET').click());
        await act(async () => button('Update solution').click());

        // Assert
        await vi.waitFor(() =>
            expect(submissions).toEqual([
                {
                    path: `/api/v1/solutions/${solutionId}/update`,
                    body: {
                        envs: { NEW_SECRET: 'new-fixture-value', OPTIONAL_SECRET: null },
                        expected_revision_id: revisionId,
                    },
                },
            ])
        );
    });

    it('submits the retained secret draft after removal is toggled off', async () => {
        // Arrange
        const submissions = await openReview(secretCandidate);
        const user = userEvent.setup();
        await act(async () => button('Next').click());
        await act(async () => user.type(input('NEW_SECRET'), 'new-fixture-value'));
        await act(async () => user.type(input('OPTIONAL_SECRET'), 'replacement-fixture-value'));

        // Act
        await act(async () => input('Remove OPTIONAL_SECRET').click());
        await act(async () => input('Remove OPTIONAL_SECRET').click());
        await act(async () => button('Update solution').click());

        // Assert
        await vi.waitFor(() =>
            expect(submissions).toEqual([
                {
                    path: `/api/v1/solutions/${solutionId}/update`,
                    body: {
                        envs: { NEW_SECRET: 'new-fixture-value', OPTIONAL_SECRET: 'replacement-fixture-value' },
                        expected_revision_id: revisionId,
                    },
                },
            ])
        );
    });

    /** Mounts the dialog with shared UI providers and an isolated HTTP boundary. */
    async function openReview(inspection: typeof secretCandidate) {
        const submissions: { path: string; body: unknown }[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const path = new URL(request.url).pathname;

            if (path !== `/api/v1/solutions/${solutionId}/update`)
                throw new Error(`Unexpected request ${request.method} ${path}`);

            if (request.method === 'POST') {
                submissions.push({ path, body: await request.json() });

                return new Response(null, { status: 204 });
            }

            return Response.json(inspection);
        });
        container = document.createElement('section');
        document.body.append(container);
        const mountedRoot = createRoot(container);
        root = mountedRoot;
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        await act(async () =>
            mountedRoot.render(
                <MemoryRouter initialEntries={['/orgs/acme']}>
                    <Routes>
                        <Route element={<PlatformRoot />}>
                            <Route
                                path="/orgs/:organization"
                                element={
                                    <DeploymentReview
                                        update={{ key: 'review', item: { id: solutionId, name: 'Sample' } }}
                                        onSuccess={() => {}}
                                        onClose={() => {}}
                                    />
                                }
                            />
                        </Route>
                    </Routes>
                </MemoryRouter>
            )
        );

        await act(async () => vi.waitFor(() => button('Next')));

        return submissions;
    }

    /** Finds a secret or removal control through its visible label. */
    function input(label: string): HTMLInputElement {
        const found = [...document.querySelectorAll('label')].find((item) => item.textContent?.startsWith(label));
        const control = found?.htmlFor ? document.getElementById(found.htmlFor) : found?.querySelector('input');

        if (!(control instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);

        return control;
    }

    /** Find the named native action without replacing UI components. */
    function button(label: string) {
        const found = [...document.querySelectorAll('button')].find((item) => item.textContent === label);

        if (!found) throw new Error(`Button not found: ${label}`);

        return found;
    }
});
