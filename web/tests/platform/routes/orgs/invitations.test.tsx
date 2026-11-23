// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import InvitationsSection from '@/platform/routes/orgs/invitations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('guards revocation through deletion and refresh, reports failure, and permits retry', async () => {
    // Arrange
    const base = '/api/v1/organizations/00000000-0000-4000-8000-000000000002';
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
    const reportError = vi.fn();
    const invitations = schemas.zOrganizationInvitationResponse.array().parse([
        {
            id: '00000000-0000-4000-8000-000000000003',
            email: 'first@example.com',
            role: 'read',
            created_at: '2026-01-01T00:00:00Z'
        },
        {
            id: '00000000-0000-4000-8000-000000000004',
            email: 'second@example.com',
            role: 'read',
            created_at: '2026-01-01T00:00:00Z'
        }
    ]);
    let failDelete: (response: Response) => void = () => {};
    const failure = new Promise<Response>((resolve) => {
        failDelete = resolve;
    });
    let finishDelete: (response: Response) => void = () => {};
    const deletion = new Promise<Response>((resolve) => {
        finishDelete = resolve;
    });
    let finishRefresh: (response: Response) => void = () => {};
    const refresh = new Promise<Response>((resolve) => {
        finishRefresh = resolve;
    });
    const requests: string[] = [];
    let deletes = 0;
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'DELETE' && path === `${base}/invitations/${invitations[0].id}`) {
            deletes++;
            return deletes === 1 ? failure : deletion;
        }
        if (request.method === 'GET' && path === `${base}/invitations`) return refresh;

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });
    client.setQueryData(['api', `${base}/invitations`], invitations);

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={reportError}>
                    <InvitationsSection base={base} role="owner" />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                const buttons = Array.from(output.querySelectorAll('button')).filter(
                    (button) => button.textContent === 'Revoke'
                );
                expect(buttons).toHaveLength(2);
                const [first, second] = buttons;

                // Act
                await act(async () => {
                    first.click();
                    second.click();
                });

                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                expect(buttons.every((button) => button.disabled)).toBe(true);
                expect(first.getAttribute('aria-busy')).toBe('true');
                expect(output.querySelector('[role="status"]')?.textContent).toBe('Loading');

                // Act
                await act(async () => failDelete(Response.json({ detail: 'Cannot revoke' }, { status: 503 })));

                // Assert
                await vi.waitFor(() => expect(first.disabled).toBe(false));
                expect(reportError).toHaveBeenCalledOnce();
                expect(reportError.mock.calls[0][0]).toMatchObject({ message: 'Cannot revoke', status: 503 });
                expect(requests).toHaveLength(1);

                // Act
                await act(async () => first.click());

                // Assert
                await vi.waitFor(() => expect(requests).toHaveLength(2));
                expect(buttons.every((button) => button.disabled)).toBe(true);

                // Act
                await act(async () => finishDelete(new Response(null, { status: 204 })));

                // Assert
                await vi.waitFor(() => expect(requests[2]).toBe(`GET ${base}/invitations`));
                expect(buttons.every((button) => button.disabled)).toBe(true);
                expect(first.getAttribute('aria-busy')).toBe('true');
                expect(output.textContent).toContain('first@example.com');

                // Act
                await act(async () => second.click());

                // Assert
                expect(requests).toHaveLength(3);

                // Act
                await act(async () => finishRefresh(Response.json([invitations[1]])));

                // Assert
                await vi.waitFor(() => expect(second.disabled).toBe(false));
                expect(output.textContent).not.toContain('first@example.com');
                expect(output.textContent).toContain('second@example.com');
                expect(second.hasAttribute('aria-busy')).toBe(false);
                expect(output.querySelector('[role="status"]')?.textContent).toBe('');
                expect(reportError).toHaveBeenCalledOnce();
            }
        );
    } finally {
        failDelete(Response.json({ detail: 'Cannot revoke' }, { status: 503 }));
        finishDelete(new Response(null, { status: 204 }));
        finishRefresh(Response.json([]));
        transport.mockRestore();
        client.clear();
    }
});
