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

it('saves the theme by keyboard without submitting a form or allowing duplicate writes', async () => {
    // Arrange
    const requests: Request[] = [];
    const errors: unknown[] = [];
    let release: (response: Response) => void = () => undefined;

    const response = new Promise<Response>((resolve) => {
        release = resolve;
    });

    const submitted = vi.fn();
    const savedUser = { ...user, theme: 'light' };

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (new URL(request.url).pathname !== '/api/v1/me') throw new Error(`Unexpected request: ${request.url}`);

        if (request.method === 'GET') return Response.json({ ...user, theme: 'system' });

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
                // Act
                const keyboard = userEvent.setup();
                const dark = output.querySelector<HTMLInputElement>('input[aria-label="Dark"]');
                const light = output.querySelector<HTMLInputElement>('input[aria-label="Light"]');

                if (!dark || !light) throw new Error('Expected the theme selections');
                await act(async () => {
                    dark.focus();
                    await keyboard.keyboard('{Enter}');
                });
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                await vi.waitFor(() => expect(dark.getAttribute('aria-disabled')).toBe('true'));

                // Assert
                expect(await requests[0]?.clone().json()).toEqual({ theme: 'dark' });
                expect(dark.checked).toBe(true);
                expect(document.documentElement.dataset.theme).toBe('dark');
                await act(async () => {
                    dark.focus();
                    await keyboard.keyboard('{Enter} ');
                    dark.click();
                    light.click();
                });
                expect(requests).toHaveLength(1);
                expect(submitted).not.toHaveBeenCalled();

                await act(async () => release(Response.json(savedUser)));
                await vi.waitFor(() => expect(dark.getAttribute('aria-disabled')).toBeNull());
                expect(dark.checked).toBe(false);
                expect(light.checked).toBe(true);
                expect(document.documentElement.dataset.theme).toBe('light');
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
