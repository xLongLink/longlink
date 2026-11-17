// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform } from '../../render';
import Page from '@/platform/routes/admin/compute';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

it('offers registration for an empty Compute registry without exposing credentials', () => {
    // Act
    const output = renderPlatform(<Page />, '/admin/compute', [
        ['/api/v1/computes?page=1&page_size=25&search=', { items: [], total: 0 }]
    ]);

    // Assert
    expect(output.querySelector('h1')?.textContent).toBe('Compute');
    expect(output.textContent).toContain('Register Compute');
    expect(output.querySelector('textarea')).toBeNull();
});

it('submits exact secret YAML and metadata after file-read recovery without accepting obsolete credentials', async () => {
    // A pending file must not submit stale pasted credentials or let a manual edit race its result.
    const user = userEvent.setup({ applyAccept: false });
    let resolveRead: (value: string) => void = () => undefined;

    const read = new Promise<string>((resolve) => {
        resolveRead = resolve;
    });

    const yaml = 'apiVersion: v1\nusers:\n  - name: fixture\n    user:\n      token: test-only-token\n\n';

    class KubeconfigFile extends File {
        override async text() {
            return await read;
        }
    }

    const file = new KubeconfigFile([], 'config.yaml', { type: 'application/yaml' });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnMount: false } } });

    client.setQueryData(['api', '/api/v1/computes?page=1&page_size=25&search='], { items: [], total: 0 });
    const writes: unknown[] = [];
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (new URL(request.url).pathname === '/api/v1/computes') {
            if (request.method === 'POST') {
                writes.push(await request.json());
                return new Response(null, { status: 204 });
            }

            if (request.method === 'GET') return Response.json({ items: [], total: 0 });
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <Page />
            </QueryClientProvider>,
            async (output) => {
                const register = [...output.querySelectorAll('button')].find(
                    (button) => button.textContent === 'Register Compute'
                );

                if (!register) throw new Error('Expected the registration action');
                await act(async () => user.click(register));

                // Populate otherwise-valid metadata before exercising file-read recovery.
                for (const [name, value] of [
                    ['name', 'Fixture Compute'],
                    ['gateway_url', 'https://gateway.example.com'],
                    ['storage_endpoint', 'https://storage.example.com']
                ]) {
                    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);

                    if (!input) throw new Error(`Expected the ${name} field`);
                    await act(async () => user.type(input, value));
                }

                const textarea = document.querySelector('textarea');
                const upload = document.querySelector<HTMLInputElement>('input[type="file"]');
                const submit = document.querySelector<HTMLButtonElement>('button[type="submit"]');

                if (!textarea || !upload || !submit) throw new Error('Expected the kubeconfig controls');
                expect(textarea.getAttribute('rows')).toBe('8');
                expect(textarea.getAttribute('spellcheck')).toBe('false');
                expect(textarea.required).toBe(true);
                expect(textarea.name).toBe('kubeconfig');
                await act(async () => user.type(textarea, 'previous draft'));
                await act(async () => user.upload(upload, file));
                expect(textarea.value).toBe('');
                expect(textarea.disabled).toBe(true);
                expect(textarea.getAttribute('aria-busy')).toBe('true');
                expect(
                    [...document.querySelectorAll('[role="status"]')].some((status) => status.textContent === 'Loading')
                ).toBe(true);
                expect(submit.disabled).toBe(true);
                await act(async () => user.type(textarea, 'must not race the file'));
                expect(textarea.value).toBe('');

                // The read result retains indentation and trailing newlines, with spellcheck still suppressed.
                await act(async () => resolveRead(yaml));
                expect(textarea.value).toBe(yaml);
                expect(textarea.disabled).toBe(false);
                expect(textarea.hasAttribute('aria-busy')).toBe(false);
                expect(textarea.getAttribute('spellcheck')).toBe('false');
                expect(
                    [...document.querySelectorAll('[role="status"]')].some((status) => status.textContent === 'Loading')
                ).toBe(false);
                expect(submit.disabled).toBe(false);

                // Rejected formats clear loaded YAML without ever reading the invalid file.
                let invalidReads = 0;

                class InvalidFile extends File {
                    override async text() {
                        invalidReads++;

                        return 'must not be read';
                    }
                }

                await act(async () => user.upload(upload, new InvalidFile([], 'config.txt')));
                expect(invalidReads).toBe(0);
                expect(textarea.value).toBe('');
                expect(submit.disabled).toBe(true);
                expect(document.querySelector('#compute-file-error')?.textContent).toContain('config.txt');

                // A failed read exposes only the safe error; a later selection can recover.
                class UnreadableFile extends File {
                    override async text(): Promise<string> {
                        throw new Error('private file contents');
                    }
                }

                await act(async () => user.upload(upload, new UnreadableFile([], 'broken.yaml')));
                expect(textarea.value).toBe('');
                expect(document.querySelector('#compute-file-error')?.textContent).toBe(
                    'Unable to read the kubeconfig file. Choose another file.'
                );
                expect(document.body.textContent).not.toContain('private file contents');
                await act(async () => user.upload(upload, file));
                expect(textarea.value).toBe(yaml);
                expect(document.querySelector('[aria-invalid="true"]')).toBeNull();

                // Replacing an in-flight selection invalidates its eventual completion.
                let finishObsolete: (value: string) => void = () => undefined;

                const obsolete = new Promise<string>((resolve) => {
                    finishObsolete = resolve;
                });

                class PendingFile extends File {
                    override async text() {
                        return await obsolete;
                    }
                }

                await act(async () => user.upload(upload, new PendingFile([], 'pending.yml')));
                expect(textarea.value).toBe('');
                await act(async () => user.upload(upload, file));
                await act(async () => finishObsolete('obsolete credentials'));
                expect(textarea.value).toBe(yaml);
                expect(textarea.disabled).toBe(false);
                expect(submit.disabled).toBe(false);

                // Submit through the footer after recovery, preserving every YAML byte.
                expect(writes).toEqual([]);
                await act(async () => user.click(submit));
                await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
                expect(writes).toEqual([
                    {
                        name: 'Fixture Compute',
                        gateway_url: 'https://gateway.example.com',
                        storage_endpoint: 'https://storage.example.com',
                        kubeconfig: yaml
                    }
                ]);
            },
            '/admin/compute'
        );
    } finally {
        transport.mockRestore();
        client.clear();
    }
});
