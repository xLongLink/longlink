// @vitest-environment happy-dom
import { act, useState } from 'react';
import type { Window } from 'happy-dom';
import { BookOpen } from 'lucide-react';
import { withMounted } from '../../render';
import Legal from '@/platform/layouts/legal';
import { it, expect, afterEach } from 'vitest';
import Terms from '@/platform/routes/legal/terms';
import userEvent from '@testing-library/user-event';
import Privacy from '@/platform/routes/legal/privacy';
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
    const { pathname } = useLocation();

    return (
        <Routes>
            <Route
                element={
                    <Publication
                        sideNav={
                            <PublicationNavigation
                                label="Article navigation"
                                currentPath={pathname.replace(/\/+$/, '')}
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

it('dismisses mobile sidebar navigation after keyboard activation and marks the routed page on reopen', async () => {
    viewport.setViewport({ width: 1024 });

    await withMounted(
        <Routes>
            <Route element={<Legal />}>
                <Route path="/privacy/" element={<Privacy />} />
                <Route path="/terms/" element={<Terms />} />
            </Route>
        </Routes>,
        async (output) => {
            const user = userEvent.setup();

            expect(output.querySelector('nav[aria-label="On this page"] a[href="#your-rights"]')).not.toBeNull();
            expect(output.querySelector('h2#your-rights')).not.toBeNull();
            await act(async () => viewport.setViewport({ width: 390 }));
            const trigger = output.querySelector<HTMLButtonElement>('[aria-label="Open section navigation"]');

            if (!trigger) throw new Error('Missing navigation trigger');

            await act(async () => trigger.click());
            const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Section navigation"]');

            if (!dialog) throw new Error('Missing mobile navigation');
            expect(dialog.hidden).toBe(false);

            const navigation = dialog.querySelector('nav[aria-label="Legal and branding navigation"]');
            const privacy = navigation?.querySelector('a[href="/privacy/"]');
            const link = navigation?.querySelector<HTMLAnchorElement>('a[href="/terms/"]');

            if (!privacy || !link) throw new Error('Missing legal navigation');
            expect(privacy.getAttribute('aria-current')).toBe('page');
            const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
            await act(async () => link.dispatchEvent(modified));
            expect(modified.defaultPrevented).toBe(false);
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            expect(output.querySelector('h2#your-rights')).not.toBeNull();

            await act(async () => {
                link.focus();
                await user.keyboard('{Enter}');
            });
            expect(output.querySelector('h1')?.textContent).toContain('Terms');
            expect(output.querySelector('h2#your-rights')).toBeNull();
            expect(trigger.getAttribute('aria-expanded')).toBe('false');

            await act(async () => trigger.click());
            expect(trigger.getAttribute('aria-expanded')).toBe('true');
            const reopened = document.querySelector('[role="dialog"][aria-label="Section navigation"]');
            expect(reopened?.querySelector('a[href="/terms/"]')?.getAttribute('aria-current')).toBe('page');
            expect(reopened?.querySelector('a[href="/privacy/"]')?.hasAttribute('aria-current')).toBe(false);
            await act(async () => viewport.setViewport({ width: 1024 }));
            expect(output.querySelector('[aria-label="Open section navigation"]')).toBeNull();
            expect(output.querySelector('aside [aria-label="Legal and branding navigation"]')).not.toBeNull();
            expect(document.querySelector('[role="dialog"][aria-label="Section navigation"]')).toBeNull();
            await act(async () => viewport.setViewport({ width: 390 }));
            expect(output.querySelector('[aria-label="Open section navigation"]')?.getAttribute('aria-expanded')).toBe(
                'false'
            );
        },
        '/privacy/'
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

            if (!main || !skip) throw new Error('Missing skip link destination');

            const activation = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => skip.dispatchEvent(activation));
            expect(document.activeElement).toBe(main);
            expect(activation.defaultPrevented).toBe(false);
        },
        '/docs/first'
    );
});
