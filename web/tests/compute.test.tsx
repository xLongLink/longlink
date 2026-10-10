// @vitest-environment happy-dom
import { act } from 'react';
import { Root } from '@/components/Root';
import { createRoot } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import Compute from '@/platform/routes/admin/Compute';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

const kubeconfig = 'apiVersion: v1\nusers:\n  - name: admin\n    user:\n      token: private-token\n';

describe('Compute registration', () => {
    let root: ReturnType<typeof createRoot> | undefined;
    let container: HTMLElement | undefined;
    let submissions: { path: string; body: unknown }[];
    let listRequests: number;
    let registrationResponse: () => Response;

    afterEach(async () => {
        // Release real UI listeners and query ownership before restoring request globals.
        const mountedRoot = root;

        if (mountedRoot) await act(async () => mountedRoot.unmount());

        root = undefined;
        container?.remove();
        container = undefined;
        vi.unstubAllGlobals();
    });

    it.each(['yaml', 'yml'])('submits the exact text selected from a .%s file', async (extension) => {
        const user = await renderCompute();
        await fillEndpoints(user);
        const file = new File([kubeconfig], `compute.${extension}`, { type: 'application/yaml' });

        // Drive the actual file control and inspect the existing JSON request boundary.
        await act(async () => user.upload(fileInput(), file));
        await vi.waitFor(() => expect(textarea().value).toBe(kubeconfig));
        await act(async () => user.click(button('Register')));
        await vi.waitFor(() => expect(document.querySelector('textarea')).toBeNull());
        expect(submissions).toEqual([
            {
                path: '/api/v1/computes',
                body: {
                    name: 'Production',
                    gateway_url: 'https://gateway.example',
                    storage_endpoint: 'https://storage.example',
                    kubeconfig,
                },
            },
        ]);
        expect(listRequests).toBe(2);
    });

    it('retains paste-only registration', async () => {
        const user = await renderCompute();
        await fillEndpoints(user);
        await act(async () => {
            await user.click(textarea());
            await user.paste(kubeconfig);
        });
        await act(async () => user.click(button('Register')));
        await vi.waitFor(() => expect(submissions).toHaveLength(1));
        expect(submissions[0]?.body).toMatchObject({ kubeconfig });
    });

    it('rejects unsupported files and discards previous YAML', async () => {
        const user = await renderCompute();
        await act(async () => user.upload(fileInput(), new File([kubeconfig], 'compute.yaml')));
        await vi.waitFor(() => expect(textarea().value).toBe(kubeconfig));

        // Bypass the native chooser filter to exercise component validation at the input boundary.
        const unfilteredUser = userEvent.setup({ applyAccept: false });
        await act(async () => unfilteredUser.upload(fileInput(), new File([kubeconfig], 'compute.txt')));
        expect(document.body.textContent).toContain('compute.txt');
        expect(document.querySelector('[aria-invalid="true"]')).not.toBeNull();
        expect(textarea().value).toBe('');
        expect(button('Register').disabled).toBe(true);
        expect(submissions).toEqual([]);
    });

    it.each(['', ' \n\t'])('reports empty file content without submitting', async (content) => {
        const user = await renderCompute();
        await act(async () => user.upload(fileInput(), new File([content], 'empty.yaml')));
        await vi.waitFor(() => expect(document.body.textContent).toContain('The kubeconfig file is empty.'));
        expect(textarea().value).toBe('');
        expect(button('Register').disabled).toBe(true);
        expect(submissions).toEqual([]);
    });

    it('reports read failures without exposing the thrown error', async () => {
        const user = await renderCompute();

        // Model a failed local file read without changing global File behavior.
        class UnreadableFile extends File {
            /** Simulates a local read failure containing sensitive diagnostic text. */
            override async text(): Promise<string> {
                throw new Error('private-token');
            }
        }

        await act(async () => user.upload(fileInput(), new UnreadableFile([], 'compute.yaml')));
        await vi.waitFor(() => expect(document.body.textContent).toContain('Unable to read the kubeconfig file.'));
        expect(document.body.textContent).not.toContain('private-token');
        expect(button('Register').disabled).toBe(true);
        expect(submissions).toEqual([]);
    });

    it.each(['replace', 'clear', 'dismiss'])('ignores a pending read after %s', async (action) => {
        const user = await renderCompute();
        let finishRead: ((text: string) => void) | undefined;

        const pending = new Promise<string>((resolve) => {
            finishRead = resolve;
        });

        // Hold only this file's read so user interactions can race with its completion.
        class PendingFile extends File {
            /** Resolves when the test releases the selected file read. */
            override text(): Promise<string> {
                return pending;
            }
        }

        await act(async () => user.upload(fileInput(), new PendingFile([], 'pending.yaml')));
        expect(button('Register').disabled).toBe(true);

        if (action === 'replace') {
            await act(async () => user.upload(fileInput(), new File(['new YAML'], 'new.yml')));
            await vi.waitFor(() => expect(textarea().value).toBe('new YAML'));
        } else if (action === 'clear') {
            const clear = document.querySelector<HTMLButtonElement>('button[aria-label="Clear Kubeconfig file"]');

            if (!clear) throw new Error('Missing file clear button');

            await act(async () => user.click(clear));
        } else {
            await act(async () => user.click(button('Cancel')));
            await act(async () => user.click(button('Register Compute')));
        }

        await act(async () => finishRead?.(kubeconfig));
        expect(textarea().value).toBe(action === 'replace' ? 'new YAML' : '');
        expect(submissions).toEqual([]);
    });

    it('preserves the draft and reports API validation errors without submitted credentials', async () => {
        const user = await renderCompute();
        await fillEndpoints(user);
        registrationResponse = () =>
            Response.json(
                {
                    detail: [
                        {
                            loc: ['body', 'kubeconfig'],
                            msg: 'Kubernetes kubeconfig must be valid YAML',
                            input: kubeconfig,
                        },
                    ],
                },
                { status: 422 }
            );

        await act(async () => user.upload(fileInput(), new File([kubeconfig], 'compute.yaml')));
        await vi.waitFor(() => expect(textarea().value).toBe(kubeconfig));
        await act(async () => user.click(button('Register')));
        await vi.waitFor(() => expect(document.body.textContent).toContain('Kubernetes kubeconfig must be valid YAML'));
        expect(textarea().value).toBe(kubeconfig);
        expect(document.querySelector('[data-toast-id]')?.textContent).not.toContain('private-token');
        expect(listRequests).toBe(1);
        expect(button('Register').disabled).toBe(false);
    });

    it('discards completed drafts when the dialog is reopened', async () => {
        const user = await renderCompute();
        await fillEndpoints(user);
        await act(async () => user.upload(fileInput(), new File([kubeconfig], 'compute.yaml')));
        await vi.waitFor(() => expect(textarea().value).toBe(kubeconfig));
        await act(async () => user.click(button('Cancel')));
        await act(async () => user.click(button('Register Compute')));
        expect(textarea().value).toBe('');
        expect(document.querySelector('dialog')?.textContent).not.toContain('compute.yaml');
        expect(
            [...document.querySelectorAll<HTMLInputElement>('input:not([type="file"])')].every((input) => !input.value)
        ).toBe(true);
    });

    /** Mounts the actual page and providers with requests intercepted at the HTTP boundary. */
    async function renderCompute() {
        submissions = [];
        listRequests = 0;
        registrationResponse = () => new Response(null, { status: 204 });
        vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : new Request(input, init);
            const path = new URL(request.url).pathname;

            if (path !== '/api/v1/computes') throw new Error(`Unexpected request ${path}`);

            if (request.method === 'POST') {
                submissions.push({ path, body: await request.json() });

                return registrationResponse();
            }

            listRequests += 1;

            return Response.json({ items: [], total: 0, page: 1, page_size: 25, pages: 0 });
        });
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('section');
        document.body.append(container);
        const mountedRoot = createRoot(container);
        root = mountedRoot;
        await act(async () =>
            mountedRoot.render(
                <MemoryRouter>
                    <Routes>
                        <Route element={<Root />}>
                            <Route path="/" element={<Compute />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            )
        );
        await vi.waitFor(() => button('Register Compute'));
        const user = userEvent.setup();
        await act(async () => user.click(button('Register Compute')));

        return user;
    }

    /** Completes the existing endpoint fields using their accessible labels. */
    async function fillEndpoints(user: ReturnType<typeof userEvent.setup>) {
        for (const [label, value] of [
            ['Name', 'Production'],
            ['Gateway URL', 'https://gateway.example'],
            ['Storage endpoint', 'https://storage.example'],
        ]) {
            const fieldLabel = [...document.querySelectorAll('label')].find((item) =>
                item.textContent?.startsWith(label)
            );

            const input = fieldLabel ? document.getElementById(fieldLabel.htmlFor) : null;

            if (!input) throw new Error(`Missing field ${label}`);

            await act(async () => user.type(input, value));
        }
    }

    /** Returns the real file chooser. */
    function fileInput() {
        const input = document.querySelector<HTMLInputElement>('input[type="file"]');

        if (!input) throw new Error('Missing file input');

        return input;
    }

    /** Returns the YAML paste field. */
    function textarea() {
        const input = document.querySelector('textarea');

        if (!input) throw new Error('Missing kubeconfig textarea');

        return input;
    }

    /** Finds a native action without replacing UI components. */
    function button(label: string) {
        const found = [...document.querySelectorAll('button')].find((item) => item.textContent === label);

        if (!found) throw new Error(`Missing button ${label}`);

        return found;
    }
});
