// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { user } from '../../render';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import Appearance from '@/platform/routes/user/appearance';
import { AccountAppearanceProvider } from '@/components/appearance';

it('saves appearance by keyboard without submitting a form or allowing duplicate writes', async () => {
    // Keep the profile write pending while the real account observer previews the new accent.
    const requests: Request[] = [];
    const errors: unknown[] = [];
    let release: (response: Response) => void = () => undefined;

    const response = new Promise<Response>((resolve) => {
        release = resolve;
    });

    const submitted = vi.fn();
    const savedUser = { ...user, accent: 'green' };

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (new URL(request.url).pathname !== '/api/v1/me') throw new Error(`Unexpected request: ${request.url}`);

        if (request.method === 'GET') return Response.json({ ...user, accent: 'neutral' });

        if (request.method !== 'PATCH') throw new Error(`Unexpected method: ${request.method}`);
        requests.push(request);

        return (await response).clone();
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <AccountAppearanceProvider>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitted();
                        }}
                    >
                        <Appearance />
                    </form>
                </AccountAppearanceProvider>
            </ApiErrorContext>,
            async (output) => {
                // Activate the migrated control through its real keyboard behavior.
                const keyboard = userEvent.setup();

                const blue = Array.from(output.querySelectorAll<HTMLButtonElement>('button')).find(
                    (button) => button.textContent === 'Blue'
                );

                if (!blue) throw new Error('Expected the blue accent control');
                await act(async () => {
                    blue.focus();
                    await keyboard.keyboard('{Enter}');
                });
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                await vi.waitFor(() => expect(blue.disabled).toBe(true));

                // Pending controls cannot enqueue another write or accidentally submit their surrounding form.
                expect(await requests[0]?.clone().json()).toEqual({ accent: 'blue' });
                expect(blue.getAttribute('aria-pressed')).toBe('true');
                expect(document.documentElement.dataset.accent).toBe('blue');

                const dark = output.querySelector<HTMLInputElement>('input[aria-label="Dark"]');

                if (!dark) throw new Error('Expected the dark theme selection');
                await act(async () => {
                    dark.focus();
                    await keyboard.keyboard('{Enter} ');
                    dark.click();
                });
                expect(dark.getAttribute('aria-disabled')).toBe('true');
                await act(async () => blue.click());
                expect(requests).toHaveLength(1);
                expect(submitted).not.toHaveBeenCalled();

                // The server's canonical preference replaces the preview and re-enables controls.
                await act(async () => release(Response.json(savedUser)));
                await vi.waitFor(() => expect(blue.disabled).toBe(false));

                const green = Array.from(output.querySelectorAll<HTMLButtonElement>('button')).find(
                    (button) => button.textContent === 'Green'
                );

                expect(green?.getAttribute('aria-pressed')).toBe('true');
                expect(blue.getAttribute('aria-pressed')).toBe('false');
                expect(document.documentElement.dataset.accent).toBe('green');

                // The theme card submits its preference, then accepts the server's canonical selection.
                await act(async () => {
                    dark.focus();
                    await keyboard.keyboard('{Enter}');
                });
                await vi.waitFor(() => expect(requests).toHaveLength(2));
                expect(await requests[1]?.clone().json()).toEqual({ theme: 'dark' });
                await vi.waitFor(() => expect(dark.getAttribute('aria-disabled')).toBeNull());
                expect(dark.checked).toBe(false);
                expect(output.querySelector<HTMLInputElement>('input[aria-label="System"]')?.checked).toBe(true);
                expect(submitted).not.toHaveBeenCalled();
                expect(errors).toEqual([]);
            },
            '/user/settings'
        );
    } finally {
        release(Response.json(savedUser));
        transport.mockRestore();
        localStorage.removeItem('longlink:appearance');
    }
});
