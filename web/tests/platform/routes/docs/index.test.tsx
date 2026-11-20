// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../render';
import DocsIndex from '@/platform/routes/docs/index';
import { Route, Routes, useLocation } from 'react-router';

/** Reports the destination reached through the real router. */
function Destination() {
    const { pathname } = useLocation();

    return <output>{pathname}</output>;
}

it('keeps modified card clicks native and navigates from the card content', async () => {
    await withMounted(
        <Routes>
            <Route path="/docs/" element={<DocsIndex />} />
            <Route path="/docs/sdk/" element={<Destination />} />
        </Routes>,
        async (output) => {
            const card = output.querySelector<HTMLAnchorElement>('a[aria-label="Build a Solution"]');
            const description = card?.querySelector('p');

            if (!card || !description) throw new Error('Missing Solution documentation card');

            const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

            await act(async () => card.dispatchEvent(modifiedClick));
            expect(modifiedClick.defaultPrevented).toBe(false);
            expect(output.querySelector('output')).toBeNull();

            await act(async () => description.click());
            expect(output.querySelector('output')?.textContent).toBe('/docs/sdk/');
        },
        '/docs/'
    );
});
