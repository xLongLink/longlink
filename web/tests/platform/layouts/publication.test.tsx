// @vitest-environment happy-dom
import { act, useState } from 'react';
import type { Window } from 'happy-dom';
import { BookOpen } from 'lucide-react';
import { withMounted } from '../../render';
import { it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Publication from '@/platform/layouts/publication';
import { Route, Routes, useLocation } from 'react-router';
import { PublicationNavigation } from '@/platform/layouts/publication-navigation';

// SAFETY: happy-dom supplies its viewport controller on the test window.
const viewport = (window as typeof window & Pick<Window, 'happyDOM'>).happyDOM;

const initialViewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(() => viewport.setViewport(initialViewport));

/** Keeps an unsaved article draft in the actual routed outlet. */
function ArticleDraft() {
    const [draft, setDraft] = useState('Original');
    const { pathname } = useLocation();

    return (
        <>
            <output aria-label="Current article">{pathname}</output>
            <input aria-label="Article draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
        </>
    );
}

/** Supplies the same native navigation as documentation callers. */
function PublicationRoutes() {
    return (
        <Routes>
            <Route
                element={
                    <Publication
                        sideNav={
                            <PublicationNavigation
                                label="Article navigation"
                                currentPath="/docs/first"
                                sections={[
                                    {
                                        title: 'More guides',
                                        pages: [{ path: '/docs/second', label: 'Second guide', icon: BookOpen }]
                                    }
                                ]}
                            />
                        }
                    />
                }
            >
                <Route path="/docs/:article" element={<ArticleDraft />} />
            </Route>
        </Routes>
    );
}

it('preserves the routed draft and its focus across the exact desktop breakpoint', async () => {
    viewport.setViewport({ width: 1024 });

    await withMounted(
        <PublicationRoutes />,
        async (output) => {
            const draft = output.querySelector<HTMLInputElement>('[aria-label="Article draft"]');

            if (!draft) throw new Error('Missing routed draft');
            const user = userEvent.setup();

            await act(async () => {
                await user.clear(draft);
                await user.type(draft, 'Unsaved article');
            });
            await act(async () => viewport.setViewport({ width: 1023 }));
            expect(output.querySelector('[aria-label="Open section navigation"]')).not.toBeNull();
            expect(document.activeElement).toBe(draft);
            expect(output.querySelector('[aria-label="Article draft"]')).toBe(draft);

            await act(async () => viewport.setViewport({ width: 1024 }));
            expect(output.querySelector('[aria-label="Open section navigation"]')).toBeNull();
            expect(output.querySelector('aside [aria-label="Article navigation"]')).not.toBeNull();
            expect(output.querySelector('[aria-label="Article draft"]')).toBe(draft);
            expect(document.activeElement).toBe(draft);
            expect(draft.value).toBe('Unsaved article');
        },
        '/docs/first'
    );
});

it('keeps supplied sidebar sections interactive and dismisses the mobile dialog after real routing', async () => {
    viewport.setViewport({ width: 1024 });

    await withMounted(
        <PublicationRoutes />,
        async (output) => {
            await act(async () => viewport.setViewport({ width: 390 }));
            const trigger = output.querySelector<HTMLButtonElement>('[aria-label="Open section navigation"]');

            if (!trigger) throw new Error('Missing navigation trigger');

            await act(async () => trigger.click());
            const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Section navigation"]');

            if (!dialog) throw new Error('Missing mobile navigation');
            expect(dialog.hidden).toBe(false);

            const section = Array.from(dialog.querySelectorAll('section')).find(
                (section) => section.querySelector('h2')?.textContent === 'More guides'
            );

            const link = section?.querySelector<HTMLAnchorElement>('a[href="/docs/second/"]');

            if (!link) throw new Error('Missing supplied section link');

            await act(async () => link.click());
            expect(output.querySelector('[aria-label="Current article"]')?.textContent).toBe('/docs/second/');
            expect(trigger.getAttribute('aria-expanded')).toBe('false');

            await act(async () => trigger.click());
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            await act(async () => viewport.setViewport({ width: 1024 }));
            expect(output.querySelector('[aria-label="Open section navigation"]')).toBeNull();
            expect(output.querySelector('aside [aria-label="Article navigation"]')).not.toBeNull();
            expect(document.querySelector('[role="dialog"][aria-label="Section navigation"]')).toBeNull();
            await act(async () => viewport.setViewport({ width: 390 }));
            expect(output.querySelector('[aria-label="Open section navigation"]')?.getAttribute('aria-expanded')).toBe(
                'false'
            );
        },
        '/docs/first'
    );
});

it('returns focus after Escape and explicitly focuses the routed content from the skip link', async () => {
    viewport.setViewport({ width: 390 });

    await withMounted(
        <PublicationRoutes />,
        async (output) => {
            const user = userEvent.setup();
            const trigger = output.querySelector<HTMLButtonElement>('[aria-label="Open section navigation"]');

            if (!trigger) throw new Error('Missing navigation trigger');

            await act(async () => user.click(trigger));
            await act(async () => user.keyboard('{Escape}'));
            expect(trigger.getAttribute('aria-expanded')).toBe('false');
            expect(document.activeElement).toBe(trigger);

            const main = output.querySelector('main');
            const skip = output.querySelector<HTMLAnchorElement>(`a[href="#${main?.id}"]`);
            await act(async () => skip?.click());
            expect(document.activeElement).toBe(main);
        },
        '/docs/first'
    );
});
