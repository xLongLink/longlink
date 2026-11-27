// @vitest-environment happy-dom
import { act } from 'react';
import { user } from './render';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import PlatformRoot from '@/platform/root';
import { Link, Route, Routes } from 'react-router';

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

it('restores account appearance when navigating between the homepage and account routes', async () => {
    // Arrange
    const cached = localStorage.getItem('longlink:appearance');
    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => Response.json({ ...user, theme: 'light' }));

    try {
        await withMounted(
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route index element={<Link to="/account">Account</Link>} />
                    <Route path="/account" element={<Link to="/">Home</Link>} />
                </Route>
            </Routes>,
            async (output) => {
                // Act
                await act(async () => output.querySelector<HTMLAnchorElement>('a')?.click());

                // Assert
                await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
                expect(output.textContent).toBe('Home');

                // Act
                await act(async () => output.querySelector<HTMLAnchorElement>('a')?.click());

                // Assert
                expect(document.documentElement.dataset.theme).toBe('dark');
                expect(output.textContent).toBe('Account');

                // Act
                await act(async () => output.querySelector<HTMLAnchorElement>('a')?.click());

                // Assert
                await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
                expect(output.textContent).toBe('Home');
            }
        );
    } finally {
        transport.mockRestore();
        if (cached === null) localStorage.removeItem('longlink:appearance');
        else localStorage.setItem('longlink:appearance', cached);
    }
});
