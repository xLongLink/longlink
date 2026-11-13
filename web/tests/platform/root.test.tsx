// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import PlatformRoot from '@/platform/root';
import { Wordmark } from '@/components/Wordmark';
import { Route, Routes, useLocation } from 'react-router';
import { NativeLink as Link } from '@/components/ui/NativeLink';

it('uses native links for client-side navigation under the Platform root', async () => {
    // Arrange
    function Navigation() {
        const location = useLocation();

        return (
            <>
                <Link href="/?section=orders">Orders</Link>
                <output>{location.search}</output>
                <Wordmark />
            </>
        );
    }

    // Act
    await withMounted(
        <Routes>
            <Route element={<PlatformRoot />}>
                <Route index element={<Navigation />} />
            </Route>
        </Routes>,
        async (output) => {
            const link = output.querySelector('a');

            expect(link?.getAttribute('href')).toBe('/?section=orders');

            await act(async () => link?.click());

            // Assert
            expect(output.querySelector('output')?.textContent).toBe('?section=orders');
            expect(output.querySelector('img')?.getAttribute('src')).toBe('/images/longlink-wordmark-dark.png');
        }
    );
});

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
                expect(document.documentElement.style.colorScheme).toBe('dark');

                await act(async () =>
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key: 'longlink:appearance',
                            newValue: JSON.stringify({ theme: 'light', accent: 'rose' }),
                        })
                    )
                );
                expect(document.documentElement.dataset.theme).toBe('dark');
                expect(document.documentElement.style.colorScheme).toBe('dark');
                expect(transport).not.toHaveBeenCalled();
            }
        );
    } finally {
        transport.mockRestore();
    }
});
