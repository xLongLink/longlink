import { act } from 'react';
// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Layout from '@/platform/layouts/Legal';
import { renderStatic, withMounted } from '../../render';
import { Route, Routes, useLocation } from 'react-router';

it('keeps legal and brand references in their public navigation', () => {
    // Act
    const output = renderStatic(<Layout />, '/privacy');

    // Assert
    const navigation = output.querySelector('[aria-label="Legal and branding navigation"]');
    expect(navigation?.querySelector('a[href="/privacy/"]')).not.toBeNull();
    expect(navigation?.querySelector('a[href="/branding/assets"]')).not.toBeNull();
});

/** Exposes article changes from the actual routed outlet. */
function Article() {
    const { pathname } = useLocation();

    return <output>{pathname}</output>;
}

it('retains native modified link gestures and updates the selected legal page after SPA navigation', async () => {
    await withMounted(
        <Routes>
            <Route element={<Layout />}>
                <Route path="*" element={<Article />} />
            </Route>
        </Routes>,
        async (output) => {
            const privacy = output.querySelector<HTMLAnchorElement>('a[href="/privacy/"]');
            const terms = output.querySelector<HTMLAnchorElement>('a[href="/terms/"]');

            if (!privacy || !terms) throw new Error('Missing legal navigation');
            expect(privacy.getAttribute('aria-current')).toBe('page');

            const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

            await act(async () => terms.dispatchEvent(modifiedClick));
            expect(modifiedClick.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/privacy/');
            await act(async () => terms.click());
            expect(output.querySelector('output')?.textContent).toBe('/terms/');
            expect(terms.getAttribute('aria-current')).toBe('page');
            expect(privacy.hasAttribute('aria-current')).toBe(false);
        },
        '/privacy/'
    );
});
