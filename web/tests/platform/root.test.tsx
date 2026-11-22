// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import PlatformRoot from '@/platform/root';
import { Route, Routes } from 'react-router';

it('keeps the homepage dark without fetching account data or following personal appearance updates', async () => {
    const transport = vi.spyOn(globalThis, 'fetch');

    try {
        await withMounted(
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route index element={<p>Home</p>} />
                </Route>
            </Routes>,
            async (output) => {
                expect(output.textContent).toContain('Home');
                expect(document.documentElement.dataset.theme).toBe('dark');

                await act(async () =>
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key: 'longlink:appearance',
                            newValue: JSON.stringify({ theme: 'light' })
                        })
                    )
                );
                expect(document.documentElement.dataset.theme).toBe('dark');
                expect(transport).not.toHaveBeenCalled();
            }
        );
    } finally {
        transport.mockRestore();
    }
});
