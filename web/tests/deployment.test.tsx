// @vitest-environment happy-dom
import { act } from 'react';
import { ApiProvider } from '@/providers';
import { createRoot } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import SolutionUpdate from '@/components/SolutionUpdate';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const revisionId = '00000000-0000-4000-8000-000000000001';
const solution = {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Sample',
    slug: 'sample',
    status: 'running' as const,
    desired_revision_id: revisionId,
    deployment_pending: false,
};
const candidate = {
    source: 'ghcr.io/owner/sample:dev',
    image: `ghcr.io/owner/sample@sha256:${'b'.repeat(64)}`,
    current_image: `ghcr.io/owner/sample@sha256:${'a'.repeat(64)}`,
    revision_id: revisionId,
    available: true,
    min_scale: 1,
    configured_envs: ['KEEP', 'DROP', 'UNDECLARED'],
    metadata: {
        image: `ghcr.io/owner/sample@sha256:${'b'.repeat(64)}`,
        environments: [
            { name: 'KEEP', required: true },
            { name: 'DROP', required: false },
            { name: 'NEW', required: true },
        ],
    },
};

describe('Solution source update dialog', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let container: HTMLElement | undefined;

    afterEach(async () => {
        await act(async () => root?.unmount());
        container?.remove();
        vi.unstubAllGlobals();
    });

    /** Mount the real update button and dialog with their query and layer providers. */
    async function render() {
        container = document.createElement('section');
        document.body.append(container);
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        await act(async () =>
            root?.render(
                <LayerProvider>
                    <ApiProvider>
                        <SolutionUpdate solution={solution} organizationId="org" />
                    </ApiProvider>
                </LayerProvider>
            )
        );
    }

    /** Find the actual named action without replacing UI components. */
    function button(label: string) {
        const found = [...document.querySelectorAll('button')].find((item) => item.textContent === label);
        if (!found) throw new Error(`Button not found: ${label}`);
        return found;
    }

    it('preserves configured secrets, removes explicitly, supplies new required values, and shows final validation errors', async () => {
        const submissions: unknown[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            if (request.method === 'GET') return Response.json(candidate);
            submissions.push(await request.json());
            return Response.json({ detail: 'Final image requires ANOTHER variable' }, { status: 422 });
        });
        await render();
        await act(async () => button('Check for updates').click());
        await act(async () => vi.waitFor(() => expect(button('Update').disabled).toBe(false)));
        await act(async () => button('Update').click());
        expect(button('Update solution').disabled).toBe(true);
        const keep = document.querySelector<HTMLInputElement>('input[name="envs.KEEP"]');
        const required = document.querySelector<HTMLInputElement>('input[name="envs.NEW"]');
        expect(keep?.value).toBe('');
        expect(keep?.getAttribute('aria-required')).not.toBe('true');
        expect(required?.getAttribute('aria-required')).toBe('true');
        expect(keep?.placeholder).toContain('preserve existing value');
        expect(document.querySelector('input[name="envs.UNDECLARED"]')).toBeNull();
        expect(document.body.textContent).not.toContain('Add variable');
        expect(document.body.textContent).not.toContain('Candidate digest:');
        expect(document.body.textContent).toContain('Current sha256:aaaaaaaaaaaa');
        expect(document.body.textContent).toContain('New sha256:bbbbbbbbbbbb');
        expect(document.body.textContent).not.toContain('Remove KEEP');
        if (!required) throw new Error('Required field missing');
        const user = userEvent.setup();
        await act(async () => user.type(required, 'new-secret'));
        await act(async () => button('Remove DROP').click());
        await act(async () => button('Update solution').click());
        await act(async () =>
            vi.waitFor(() => expect(document.body.textContent).toContain('Final image requires ANOTHER'))
        );
        expect(submissions).toEqual([
            { envs: { NEW: 'new-secret', DROP: null }, min_scale: 1, expected_revision_id: revisionId },
        ]);
        await act(async () => button('Undo DROP change').click());
        const drop = document.querySelector<HTMLInputElement>('input[name="envs.DROP"]');
        if (!drop || !keep) throw new Error('Configured field missing');
        await act(async () => user.type(keep, 'replacement'));
        await act(async () => user.clear(keep));
        expect(button('Update solution').disabled).toBe(true);
        await act(async () => button('Undo KEEP change').click());
        await act(async () => user.type(drop, 'replacement'));
        await act(async () => user.clear(drop));
        await act(async () => button('Update solution').click());
        await act(async () => vi.waitFor(() => expect(submissions).toHaveLength(2)));
        expect(submissions[1]).toEqual({
            envs: { NEW: 'new-secret', DROP: '' },
            min_scale: 1,
            expected_revision_id: revisionId,
        });
    });

    it('opens configuration when no source update is available', async () => {
        let checks = 0;
        vi.stubGlobal('fetch', async () => {
            checks += 1;
            return Response.json({ ...candidate, available: false });
        });
        await render();
        expect(checks).toBe(0);
        await act(async () => button('Check for updates').click());
        await act(async () => vi.waitFor(() => expect(document.body.textContent).toContain('Configure')));
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(button('Configure').disabled).toBe(false);
        await act(async () => button('Configure').click());
        expect(document.querySelector('input[name="envs.NEW"]')).not.toBeNull();
        expect(checks).toBe(1);
    });

    it('retries a failed source check before updating', async () => {
        let checks = 0;
        vi.stubGlobal('fetch', async () => {
            checks += 1;
            return checks === 1
                ? Response.json({ detail: 'Registry denied anonymous image access' }, { status: 403 })
                : Response.json(candidate);
        });
        await render();
        expect(checks).toBe(0);
        await act(async () => button('Check for updates').click());
        await act(async () =>
            vi.waitFor(() => expect(document.body.textContent).toContain('Registry denied anonymous image access'))
        );
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(button('Check for updates').disabled).toBe(false);
        await act(async () => button('Check for updates').click());
        await act(async () => vi.waitFor(() => expect(button('Update').disabled).toBe(false)));
        await act(async () => button('Update').click());
        expect(document.querySelector('input[name="envs.NEW"]')).not.toBeNull();
        expect(checks).toBe(2);
    });

    it('submits the reviewed revision for a source update and shows stale review errors', async () => {
        // Arrange
        const reviewedRevisionId = '00000000-0000-4000-8000-000000000099';
        const requests: string[] = [];
        const submissions: unknown[] = [];
        vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            requests.push(`${request.method} ${new URL(request.url).pathname}`);
            if (request.method === 'GET')
                return Response.json({
                    ...candidate,
                    revision_id: reviewedRevisionId,
                    metadata: { ...candidate.metadata, environments: [] },
                });
            submissions.push(await request.json());
            return Response.json({ detail: 'Desired revision changed since review' }, { status: 409 });
        });

        // Act
        await render();
        await act(async () => button('Check for updates').click());
        await act(async () => vi.waitFor(() => expect(button('Update').disabled).toBe(false)));
        await act(async () => button('Update').click());
        expect(button('Update solution').disabled).toBe(false);
        const alwaysOn = document.querySelector<HTMLInputElement>('input[name="alwaysOn"]');
        if (!alwaysOn) throw new Error('Always-on field missing');
        expect(alwaysOn.checked).toBe(true);
        await act(async () => alwaysOn.click());
        await act(async () => button('Update solution').click());
        await act(async () =>
            vi.waitFor(() => expect(document.body.textContent).toContain('Desired revision changed since review'))
        );

        // Assert
        expect(submissions).toEqual([{ envs: {}, min_scale: 0, expected_revision_id: reviewedRevisionId }]);
        expect(button('Check for updates').disabled).toBe(false);
        expect(requests).toEqual([
            `GET /api/v1/solutions/${solution.id}/update`,
            `POST /api/v1/solutions/${solution.id}/update`,
        ]);
    });
});
