// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import DocsIndex from '@/platform/routes/docs/Index';
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

            const modifiedClick = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                ctrlKey: true,
            });

            await act(async () => card.dispatchEvent(modifiedClick));
            expect(modifiedClick.defaultPrevented).toBe(false);
            expect(output.querySelector('h1')?.textContent).toBe('Documentation');
            expect(output.querySelector('output')).toBeNull();

            await act(async () => description.click());
            expect(output.querySelector('output')?.textContent).toBe('/docs/sdk/');
        },
        '/docs/'
    );
});

it('opens a focused documentation card with Enter', async () => {
    const user = userEvent.setup();

    await withMounted(
        <Routes>
            <Route path="/docs/" element={<DocsIndex />} />
            <Route path="/docs/api/" element={<Destination />} />
        </Routes>,
        async (output) => {
            const card = output.querySelector<HTMLAnchorElement>('a[aria-label="Explore the Platform"]');

            if (!card) throw new Error('Missing Platform documentation card');

            await act(async () => card.focus());
            expect(document.activeElement).toBe(card);

            await act(async () => user.keyboard('{Enter}'));
            expect(output.querySelector('output')?.textContent).toBe('/docs/api/');
        },
        '/docs/'
    );
});
