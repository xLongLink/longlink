import { act } from 'react';
// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import Layout from '@/platform/layouts/legal';
import { Route, Routes, useLocation } from 'react-router';

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
