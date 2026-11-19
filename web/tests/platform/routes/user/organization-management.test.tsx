// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { ApiError } from '@/lib/api';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import { renderPlatform, membership } from '../../render';
import Management from '@/platform/routes/user/organization-management';

const invitation = {
    id: '00000000-0000-4000-8000-000000000003',
    organization: { id: '00000000-0000-4000-8000-000000000004', name: 'Invited team', status: 'running' },
    role: 'read'
};

it('uses settings presentation instead of onboarding for an empty membership list', () => {
    // Act
    const output = renderPlatform(<Management presentation="settings" />, '/user/settings', [
        ['/api/v1/me/organizations', []],
        ['/api/v1/me/invitations', []]
    ]);

    // Assert
    expect(output.querySelector('h2')?.textContent).toBe('Organizations');
    expect(output.querySelector('h1')).toBeNull();
});

it('starts invitations before memberships resolve and waits for both responses', async () => {
    // Arrange
    const requests: string[] = [];
    let resolveMemberships: (response: Response) => void = () => undefined;
    let resolveInvitations: (response: Response) => void = () => undefined;

    const membershipsResponse = new Promise<Response>((resolve) => {
        resolveMemberships = resolve;
    });

    const invitationsResponse = new Promise<Response>((resolve) => {
        resolveInvitations = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (path === '/api/v1/me/organizations') return membershipsResponse;

        if (path === '/api/v1/me/invitations') return invitationsResponse;

        throw new Error(`Unexpected request: ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={() => undefined}>
                <ApiBoundary>
                    <Management presentation="settings" />
                </ApiBoundary>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                await vi.waitFor(() =>
                    expect(requests).toEqual(
                        expect.arrayContaining(['GET /api/v1/me/organizations', 'GET /api/v1/me/invitations'])
                    )
                );

                expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading page');

                // Act
                await act(async () => resolveMemberships(Response.json([membership])));

                // Assert
                expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading page');
                expect(output.querySelector('table')).toBeNull();

                // Act
                await act(async () => resolveInvitations(Response.json([invitation])));

                // Assert
                await vi.waitFor(() => expect(output.querySelector('table')?.textContent).toContain('Invited team'));
                expect(output.querySelector('table')?.textContent).toContain('Acme');
                expect(output.querySelector('[data-slot="spinner"]')).toBeNull();
            }
        );
    } finally {
        resolveMemberships(Response.json([]));
        resolveInvitations(Response.json([]));
        transport.mockRestore();
    }
});

it.each([
    {
        action: 'Accept',
        method: 'POST',
        suffix: '/accept',
        membershipReads: 2,
        membershipsAfter: [membership, { organization: invitation.organization, role: 'read' }],
        membershipNames: ['Acme', 'Invited team']
    },
    {
        action: 'Decline',
        method: 'DELETE',
        suffix: '',
        membershipReads: 1,
        membershipsAfter: [membership],
        membershipNames: ['Acme']
    }
])(
    'refreshes the correct resources after $action',
    async ({ action, method, suffix, membershipReads, membershipsAfter, membershipNames }) => {
        // Arrange
        const requests: string[] = [];
        const errors: unknown[] = [];
        let resolved = false;

        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);
            const path = new URL(request.url).pathname;
            requests.push(`${request.method} ${path}`);

            if (request.method === method && path === `/api/v1/me/invitations/${invitation.id}${suffix}`) {
                resolved = true;

                return new Response(null, { status: 204 });
            }

            if (path === '/api/v1/me/organizations') return Response.json(resolved ? membershipsAfter : [membership]);

            if (path === '/api/v1/me/invitations') return Response.json(resolved ? [] : [invitation]);

            throw new Error(`Unexpected request: ${request.method} ${path}`);
        });

        try {
            await withMounted(
                <ApiErrorContext value={(error) => errors.push(error)}>
                    <ApiBoundary>
                        <Management presentation="settings" />
                    </ApiBoundary>
                </ApiErrorContext>,
                async (output) => {
                    // Act
                    await vi.waitFor(() =>
                        expect(output.querySelector('table')?.textContent).toContain('Invited team')
                    );

                    const actionButton = Array.from(output.querySelectorAll('button')).find(
                        (button) => button.textContent === action
                    );

                    await act(async () => actionButton?.click());

                    const confirm = Array.from(
                        document.querySelectorAll<HTMLButtonElement>(
                            '[role="dialog"] button, [role="alertdialog"] button'
                        )
                    ).find((button) => button.textContent === action);

                    await act(async () => confirm?.click());

                    // Assert
                    await vi.waitFor(() =>
                        expect(output.querySelector('table')?.textContent).not.toContain('Invitation ·')
                    );
                    expect(Array.from(output.querySelectorAll('table a'), (link) => link.textContent)).toEqual(
                        membershipNames
                    );
                    expect(requests).toContain(`${method} /api/v1/me/invitations/${invitation.id}${suffix}`);
                    expect(requests.filter((request) => request === 'GET /api/v1/me/organizations')).toHaveLength(
                        membershipReads
                    );
                    expect(requests.filter((request) => request === 'GET /api/v1/me/invitations')).toHaveLength(2);
                    expect(errors).toEqual([]);
                }
            );
        } finally {
            transport.mockRestore();
        }
    }
);

it.each([
    { action: 'Accept', method: 'POST', suffix: '/accept', membershipReads: 2 },
    { action: 'Decline', method: 'DELETE', suffix: '', membershipReads: 1 }
])(
    'reports a failed $action once after refreshing and closes the confirmation',
    async ({ action, method, suffix, membershipReads }) => {
        // Arrange
        const requests: string[] = [];
        const errors: unknown[] = [];
        let attempted = false;
        let finishRefresh: (response: Response) => void = () => undefined;
        const refresh = new Promise<Response>((resolve) => {
            finishRefresh = resolve;
        });
        const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
            const request = input instanceof Request ? input : new Request(input, options);
            const path = new URL(request.url).pathname;
            requests.push(`${request.method} ${path}`);

            if (request.method === method && path === `/api/v1/me/invitations/${invitation.id}${suffix}`) {
                attempted = true;
                return Response.json({ detail: 'Invitation expired' }, { status: 410 });
            }

            if (path === '/api/v1/me/organizations') return Response.json([membership]);
            if (path === '/api/v1/me/invitations') return attempted ? refresh : Response.json([invitation]);

            throw new Error(`Unexpected request: ${request.method} ${path}`);
        });

        try {
            await withMounted(
                <ApiErrorContext value={(error) => errors.push(error)}>
                    <ApiBoundary>
                        <Management presentation="settings" />
                    </ApiBoundary>
                </ApiErrorContext>,
                async (output) => {
                    // Act
                    await vi.waitFor(() =>
                        expect(output.querySelector('table')?.textContent).toContain('Invited team')
                    );
                    const actionButton = Array.from(output.querySelectorAll('button')).find(
                        (button) => button.textContent === action
                    );
                    if (!actionButton) throw new Error('Expected the invitation action');
                    await act(async () => actionButton.click());

                    const confirm = Array.from(
                        document.querySelectorAll<HTMLButtonElement>(
                            '[role="dialog"] button, [role="alertdialog"] button'
                        )
                    ).find((button) => button.textContent === action);
                    if (!confirm) throw new Error('Expected the confirmation action');
                    await act(async () => confirm.click());

                    // Assert
                    await vi.waitFor(() =>
                        expect(requests.filter((request) => request === 'GET /api/v1/me/invitations')).toHaveLength(2)
                    );
                    expect(errors).toEqual([]);
                    expect(confirm.disabled).toBe(true);

                    // Act
                    await act(async () => finishRefresh(Response.json([])));

                    // Assert
                    await vi.waitFor(() => {
                        expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull();
                        expect(errors).toHaveLength(1);
                    });
                    expect(errors[0]).toBeInstanceOf(ApiError);
                    expect(errors[0]).toMatchObject({ status: 410, message: 'Invitation expired' });
                    expect(output.querySelector('table')?.textContent).not.toContain('Invited team');
                    expect(output.querySelector('table')?.textContent).toContain('Acme');
                    expect(
                        requests.filter(
                            (request) => request === `${method} /api/v1/me/invitations/${invitation.id}${suffix}`
                        )
                    ).toHaveLength(1);
                    expect(requests.filter((request) => request === 'GET /api/v1/me/organizations')).toHaveLength(
                        membershipReads
                    );
                }
            );
        } finally {
            finishRefresh(Response.json([]));
            transport.mockRestore();
        }
    }
);
