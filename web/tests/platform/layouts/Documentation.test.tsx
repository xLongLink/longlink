// @vitest-environment happy-dom
import { act } from 'react';
import type { Window } from 'happy-dom';
import { it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Layout from '@/platform/layouts/Documentation';
import { renderStatic, withMounted } from '../../render';
import { Link, Route, Routes, useLocation } from 'react-router';

it('selects Platform navigation for API documentation', () => {
    // Act
    const output = renderStatic(<Layout />, '/docs/api');

    // Assert
    expect(output.querySelector('[aria-label="Documentation sections"] [aria-current="page"]')?.textContent).toContain(
        'Platform'
    );
    expect(output.querySelector('[aria-label="Documentation navigation"] a[href="/docs/sdk/storage/"]')).toBeNull();
});

it('selects Alternatives without listing alternatives or other sections’ pages', () => {
    // Act
    const output = renderStatic(<Layout />, '/docs/alternatives/');

    // Assert
    const activeTab = output.querySelector('[aria-label="Documentation sections"] [aria-current="page"]');
    expect(activeTab?.textContent).toContain('Alternatives');
    expect(activeTab?.getAttribute('href')).toBe('/docs/alternatives/');
    expect(
        Array.from(output.querySelectorAll('[aria-label="Documentation navigation"] a'), (link) =>
            link.getAttribute('href')
        )
    ).toEqual(['/docs/']);
});

// SAFETY: the happy-dom test environment provides its viewport controller on window.
const viewport = (window as typeof window & Pick<Window, 'happyDOM'>).happyDOM;

const initialViewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(() => viewport.setViewport(initialViewport));

/** Exercises hash-only transitions from the routed article without replacing the layout. */
function Article() {
    const { pathname, hash } = useLocation();

    return (
        <>
            <output>
                {pathname}
                {hash}
            </output>
            <Link to="/docs/sdk/views/#layouts">Layout category</Link>
        </>
    );
}

it('preserves open categories across real routes, hash selection, and section keyboard navigation', async () => {
    viewport.setViewport({ width: 1280 });
    await withMounted(
        <Routes>
            <Route element={<Layout />}>
                <Route path="*" element={<Article />} />
            </Route>
        </Routes>,
        async (output) => {
            const user = userEvent.setup();

            const category = Array.from(output.querySelectorAll<HTMLButtonElement>('.publication-navigation-row')).find(
                (button) => button.textContent === 'Layout'
            );

            if (!category) throw new Error('Missing layout category');
            expect(category.getAttribute('aria-expanded')).toBe('false');
            await act(async () => user.click(category));
            const card = output.querySelector<HTMLAnchorElement>('a[href="/docs/sdk/views/card/"]');

            if (!card) throw new Error('Missing card documentation');
            await act(async () => user.click(card));
            expect(output.querySelector('output')?.textContent).toBe('/docs/sdk/views/card/');
            expect(card.getAttribute('aria-current')).toBe('page');
            expect(category.getAttribute('aria-expanded')).toBe('true');
            const categoryLink = output.querySelector<HTMLAnchorElement>('main a');

            if (!categoryLink) throw new Error('Missing article category link');
            await act(async () => user.click(categoryLink));
            expect(output.querySelector('output')?.textContent).toBe('/docs/sdk/views/#layouts');
            expect(category.getAttribute('aria-current')).toBe('location');
            expect(card.hasAttribute('aria-current')).toBe(false);

            const sections = output.querySelector('[aria-label="Documentation sections"]');
            const solutions = sections?.querySelector<HTMLAnchorElement>('a');
            const platform = sections?.querySelector<HTMLAnchorElement>('a[href="/docs/api/"]');

            if (!solutions || !platform) throw new Error('Missing documentation sections');
            solutions.focus();
            await act(async () => user.keyboard('{ArrowRight}'));
            expect(document.activeElement).toBe(platform);
            expect(output.querySelector('output')?.textContent).toBe('/docs/sdk/views/#layouts');
            await act(async () => user.keyboard('{Enter}'));
            expect(platform.getAttribute('aria-current')).toBe('page');
            expect(output.querySelector('output')?.textContent).toBe('/docs/api/');
            expect(output.querySelector('a[href="/docs/sdk/storage/"]')).toBeNull();
        },
        '/docs/sdk/views/'
    );
});

it('uses the actual documentation disclosures inside the mobile dialog and closes after navigation', async () => {
    viewport.setViewport({ width: 390 });
    await withMounted(
        <Routes>
            <Route element={<Layout />}>
                <Route path="*" element={<Article />} />
            </Route>
        </Routes>,
        async (output) => {
            const user = userEvent.setup();
            const trigger = output.querySelector<HTMLButtonElement>('[aria-label="Open section navigation"]');

            if (!trigger) throw new Error('Missing mobile navigation trigger');
            await act(async () => user.click(trigger));
            const dialog = document.querySelector('[role="dialog"][aria-label="Section navigation"]');

            const category = Array.from(
                dialog?.querySelectorAll<HTMLButtonElement>('.publication-navigation-row') ?? []
            ).find((button) => button.textContent === 'Layout');

            if (!category) throw new Error('Missing mobile layout category');
            category.focus();
            await act(async () => user.keyboard('{Enter}'));
            expect(category.getAttribute('aria-expanded')).toBe('true');
            const card = dialog?.querySelector<HTMLAnchorElement>('a[href="/docs/sdk/views/card/"]');

            if (!card) throw new Error('Missing mobile card link');
            await act(async () => user.click(card));
            expect(output.querySelector('output')?.textContent).toBe('/docs/sdk/views/card/');
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            await act(async () => user.click(trigger));
            expect(category.getAttribute('aria-expanded')).toBe('true');
            expect(card.getAttribute('aria-current')).toBe('page');
        },
        '/docs/sdk/views/'
    );
});
