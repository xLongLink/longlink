// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import * as icons from '@/lib/icons';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import { ApiBoundary } from '@/components/ApiBoundary';
import Registries from '@/platform/routes/orgs/Registries';
import { IconRequestContext } from '@/components/custom/contexts';
import { zRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('shows connection identity without maintenance actions for readers', () => {
    // Arrange
    const connection = zRegistryResponse.parse({
        id: '00000000-0000-4000-8000-000000000003',
        provider: 'ghcr',
        host: 'ghcr.io',
        username: 'acme'
    });

    // Act
    const output = renderPlatform(<Registries base="/api/v1/organizations/acme" canMaintain={false} />, '/', [
        ['/api/v1/organizations/acme/registries', [connection]]
    ]);

    // Assert
    expect(output.textContent).toContain('ghcr.io');
    expect(output.textContent).toContain('acme');
    expect(output.textContent).not.toContain('Add registry');
    expect(output.textContent).not.toContain('Delete');
});

it('preserves a replacement credential draft when an earlier registry save completes', async () => {
    // Arrange
    const path = '/api/v1/organizations/acme/registries';

    const connection = zRegistryResponse.parse({
        id: '00000000-0000-4000-8000-000000000003',
        provider: 'ghcr',
        host: 'ghcr.io',
        username: 'acme'
    });

    const errors: unknown[] = [];
    const requests: string[] = [];
    const credentials: unknown[] = [];
    let finishSave: (response: Response) => void = () => undefined;

    const pendingSave = new Promise<Response>((resolve) => {
        finishSave = resolve;
    });

    const client = new QueryClient({
        queryCache: new QueryCache({ onError: (error) => errors.push(error) }),
        defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnMount: false } }
    });

    client.setQueryData(['api', path], []);

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const pathname = new URL(request.url).pathname;
        requests.push(`${request.method} ${pathname}`);

        if (request.method === 'POST' && pathname === path) {
            credentials.push(await request.json());

            return pendingSave;
        }

        if (request.method === 'GET' && pathname === path) return Response.json([connection]);

        throw new Error(`Unexpected request: ${request.method} ${pathname}`);
    });

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={(error) => errors.push(error)}>
                    <IconRequestContext value={icons.load}>
                        <ApiBoundary>
                            <Registries base="/api/v1/organizations/acme" canMaintain />
                        </ApiBoundary>
                    </IconRequestContext>
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                const events = userEvent.setup();

                const open = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Add registry'
                );

                if (!open) throw new Error('Expected the registry action');

                try {
                    // Act
                    await act(async () => open.click());

                    const credential = document.querySelector<HTMLInputElement>(
                        '[role="dialog"] input[name="credential"]'
                    );

                    const submit = document.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]');

                    if (!credential || !submit) throw new Error('Expected the registry form');

                    await act(async () => {
                        await events.type(credential, 'ghp_credential_A');
                        await events.click(submit);
                    });
                    await vi.waitFor(() =>
                        expect(credentials).toEqual([{ provider: 'ghcr', credential: 'ghp_credential_A' }])
                    );
                    expect(document.querySelector('[role="dialog"] form')?.getAttribute('aria-busy')).toBe('true');

                    const close = document.querySelector<HTMLButtonElement>(
                        '[role="dialog"] button[aria-label="Close dialog"]'
                    );

                    if (!close) throw new Error('Expected the pending form to remain dismissible');

                    await act(async () => close.click());
                    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
                    await act(async () => open.click());

                    const replacementCredential = document.querySelector<HTMLInputElement>(
                        '[role="dialog"] input[name="credential"]'
                    );

                    if (!replacementCredential) throw new Error('Expected the replacement credential form');

                    expect(replacementCredential.value).toBe('');
                    await act(async () => events.type(replacementCredential, 'ghp_credential_B'));
                    await act(async () => finishSave(new Response(null, { status: 204 })));

                    // Assert
                    await vi.waitFor(() => expect(output.querySelector('tbody')?.textContent).toContain('ghcr.io'));
                    expect(output.querySelector('tbody')?.textContent).toContain('acme');

                    const replacement = document.querySelector('[role="dialog"]');
                    expect(replacement).not.toBeNull();
                    expect(replacement?.textContent).toContain('Connect a registry');
                    expect(replacement?.querySelector<HTMLInputElement>('input[name="credential"]')?.value).toBe(
                        'ghp_credential_B'
                    );
                    expect(replacement?.querySelector('fieldset')?.disabled).toBe(false);
                    expect(credentials).toEqual([{ provider: 'ghcr', credential: 'ghp_credential_A' }]);
                    expect(requests).toEqual([`POST ${path}`, `GET ${path}`]);
                    expect(errors).toEqual([]);
                } finally {
                    await act(async () => finishSave(new Response(null, { status: 204 })));
                }
            }
        );
        expect(errors).toEqual([]);
    } finally {
        finishSave(new Response(null, { status: 204 }));
        client.clear();
        transport.mockRestore();
    }
});
