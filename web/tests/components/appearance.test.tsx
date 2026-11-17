import * as vm from 'node:vm';
// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { withMounted } from '../render';
import { act, StrictMode } from 'react';
import { expect, it, vi } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { appearanceBootstrap } from '@/lib/appearance';
import { AppearanceProvider, CachedAppearanceProvider } from '@/components/appearance';

it('hydrates cached appearance, follows cross-tab mode changes, and restores host styles after StrictMode cleanup', async () => {
    const html = document.documentElement;
    const attributes = [...html.attributes].map(({ name, value }) => [name, value] as const);
    const cached = localStorage.getItem('longlink:appearance');
    const actEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, writable: true, value: true });

    // Startup preferences must reach the document before hydration without changing server markup.
    html.dataset.theme = 'light';
    html.classList.add('host-document');
    html.style.setProperty('color-scheme', 'light', 'important');
    html.style.setProperty('scrollbar-gutter', 'stable');
    localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'dark' }));

    const content = (
        <StrictMode>
            <CachedAppearanceProvider>
                <p>Account</p>
            </CachedAppearanceProvider>
        </StrictMode>
    );

    const output = document.createElement('section');
    output.innerHTML = renderToString(content);
    document.body.append(output);
    expect(html.dataset.theme).toBe('light');
    vm.runInNewContext(appearanceBootstrap, { document, location, localStorage });
    expect(html.dataset.theme).toBe('dark');

    const recover = vi.fn();
    const root = hydrateRoot(output, content, { onRecoverableError: recover });

    try {
        await act(async () => {});
        expect(html.dataset.theme).toBe('dark');
        expect(recover).not.toHaveBeenCalled();

        // A system preference releases the explicit mode so browser color-scheme follows OS changes.
        await act(async () => {
            localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'system' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'longlink:appearance' }));
        });
        expect(html.hasAttribute('data-theme')).toBe(false);

        // Authoritative preferences win over startup data and subsequent cross-tab notifications.
        await act(async () =>
            root.render(
                <StrictMode>
                    <AppearanceProvider preference={{ theme: 'light' }}>
                        <p>Account</p>
                    </AppearanceProvider>
                </StrictMode>
            )
        );
        await act(async () => {
            localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'dark' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'longlink:appearance' }));
        });
        expect(html.dataset.theme).toBe('light');
        expect(html.style.colorScheme).toBe('light');
    } finally {
        await act(async () => root.unmount());
        output.remove();

        // Unmount must not leak theme mutations or erase unrelated host layout styles.
        expect(html.dataset.theme).toBe('dark');
        expect(html.style.getPropertyValue('color-scheme')).toBe('light');
        expect(html.style.getPropertyPriority('color-scheme')).toBe('important');
        expect(html.style.getPropertyValue('scrollbar-gutter')).toBe('stable');
        expect(html.classList.contains('host-document')).toBe(true);

        for (const attribute of html.getAttributeNames()) html.removeAttribute(attribute);

        for (const [name, value] of attributes) html.setAttribute(name, value);

        if (cached === null) localStorage.removeItem('longlink:appearance');
        else localStorage.setItem('longlink:appearance', cached);

        if (actEnvironment) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironment);
        else Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    }
});

it('does not replace startup styling with cache updates while account preferences are unresolved', async () => {
    const cached = localStorage.getItem('longlink:appearance');

    // A newer cache entry must not replace startup styling while account identity is unresolved.
    localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'light' }));

    try {
        await withMounted(
            <AppearanceProvider>
                <p>Loading account</p>
            </AppearanceProvider>,
            async () => {
                expect(document.documentElement.dataset.theme).toBe('dark');

                await act(async () => {
                    localStorage.setItem('longlink:appearance', JSON.stringify({ theme: 'system' }));
                    window.dispatchEvent(new StorageEvent('storage', { key: 'longlink:appearance' }));
                });
                expect(document.documentElement.dataset.theme).toBe('dark');
            }
        );
    } finally {
        if (cached === null) localStorage.removeItem('longlink:appearance');
        else localStorage.setItem('longlink:appearance', cached);
    }
});
