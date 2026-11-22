// @vitest-environment happy-dom
import { act, StrictMode } from 'react';
import { withMounted } from '../../render';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Link, MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { ArticleBody, PublicArticle } from '@/components/layouts/article';

const article = {
    title: 'Reading',
    description: 'An authored article',
    lastUpdated: '2026-10-16',
    editUrl: '',
    toc: [
        { id: 'first', label: 'First section', level: 2 },
        { id: 'middle', label: 'Middle section', level: 3 },
        { id: 'last', label: 'Last section', level: 2 }
    ]
};

/** Keeps real article landmarks, heading targets, and fragment links together. */
function ReadingArticle() {
    return (
        <PublicArticle article={article}>
            <h2 id="first">First section</h2>
            <h3 id="middle">Middle section</h3>
            <h2 id="last">Last section</h2>
        </PublicArticle>
    );
}

afterEach(() => vi.restoreAllMocks());

it('keeps the outline mounted for router fragments and resets it for another article', async () => {
    // Arrange
    await withMounted(
        <>
            <Link to="/blog/reading/#middle">Read middle</Link>
            <Link to="/blog/another/#last">Read another article</Link>
            <ReadingArticle />
        </>,
        async (output) => {
            const outline = output.querySelector('[data-slot="scrollspy"]');
            const fragmentLink = output.querySelector<HTMLAnchorElement>('a[href="/blog/reading/#middle"]');
            const articleLink = output.querySelector<HTMLAnchorElement>('a[href="/blog/another/#last"]');

            if (!outline || !fragmentLink || !articleLink) throw new Error('Missing article navigation');

            // Act
            await act(async () => fragmentLink.click());

            // Assert
            expect(output.querySelector('[data-slot="scrollspy"]')).toBe(outline);
            expect(outline.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe('#middle');

            // Act
            await act(async () => articleLink.click());

            // Assert
            expect(output.querySelector('[data-slot="scrollspy"]')).not.toBe(outline);
            expect(
                output.querySelector('nav[aria-label="On this page"] [aria-current="location"]')?.getAttribute('href')
            ).toBe('#last');
        },
        '/blog/reading/#first'
    );
});

type HistorySnapshot = { url: string; state: unknown };

/** Drains Happy DOM's queued History hash events before the next article mounts. */
async function restoreHistory({ url, state }: HistorySnapshot) {
    const changed =
        window.location.hash === new URL(url).hash
            ? undefined
            : new Promise<void>((resolve) => window.addEventListener('hashchange', () => resolve(), { once: true }));

    window.history.replaceState(state, '', url);
    await changed;
}

it.each(['caf%C3%A9%20section', 'café section'])(
    'activates browser fragment %s after hydrating fragment-free prerendered HTML',
    async (fragment) => {
        const items = [...article.toc, { id: 'café section', label: 'Encoded section', level: 2 }];

        const content = (
            <ArticleBody article={{ ...article, toc: items }} className="">
                {items.map((item) => (
                    <h2 key={item.id} id={item.id}>
                        {item.label}
                    </h2>
                ))}
            </ArticleBody>
        );

        const markup = renderToString(<MemoryRouter initialEntries={['/blog/reading/']}>{content}</MemoryRouter>);

        await withMounted(null, async (output) => {
            const container = document.createElement('section');
            container.innerHTML = markup;
            output.append(container);

            const root = hydrateRoot(
                container,
                <MemoryRouter initialEntries={[`/blog/reading/#${fragment}`]}>{content}</MemoryRouter>
            );

            try {
                await act(async () => {
                    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
                });
                await vi.waitFor(() =>
                    expect(container.querySelector('[aria-current="location"]')?.getAttribute('href')).toBe(
                        '#caf%C3%A9%20section'
                    )
                );
            } finally {
                await act(async () => root.unmount());
            }
        });
    }
);

it.each([false, true])('follows fragments and moves focus with reduced motion %s', async (reduced) => {
    // Replace only the DOM's unimplemented scrolling and media-query measurements.
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.spyOn(preference, 'matches', 'get').mockReturnValue(reduced);
    vi.spyOn(window, 'matchMedia').mockReturnValue(preference);
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    const routerState = { key: 'reading', idx: 2, usr: { source: 'articles' } };

    try {
        window.history.replaceState(routerState, '', originalUrl);

        await withMounted(
            <StrictMode>
                <ReadingArticle />
            </StrictMode>,
            async (output) => {
                const middle = output.querySelector<HTMLElement>('#middle');

                if (!middle) throw new Error('Missing middle heading');
                middle.style.scrollMarginTop = '20px';
                vi.spyOn(middle, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 500, 0, 0));

                const link = output.querySelector<HTMLAnchorElement>(
                    'nav[aria-label="On this page"] a[href="#middle"]'
                );

                expect(link).not.toBeNull();
                const historyLength = window.history.length;

                await act(async () => link?.click());

                expect(window.location.hash).toBe('#middle');
                expect(window.history.state).toEqual(routerState);
                expect(window.history.length).toBe(historyLength + 1);
                expect(link?.getAttribute('aria-current')).toBe('location');
                expect(document.activeElement).toBe(output.querySelector('#middle'));
                expect(output.querySelector('#middle')?.getAttribute('tabindex')).toBe('-1');
                expect(scroll).toHaveBeenCalledTimes(1);
                expect(scroll).toHaveBeenLastCalledWith({ behavior: reduced ? 'instant' : 'smooth', top: 480 });

                // Space remains native; an ordinary click still preserves authored focusability.
                const first = output.querySelector<HTMLAnchorElement>(
                    'nav[aria-label="On this page"] a[href="#first"]'
                );

                const heading = output.querySelector<HTMLElement>('#first');

                heading?.setAttribute('tabindex', '0');

                const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

                await act(async () => first?.dispatchEvent(space));

                expect(space.defaultPrevented).toBe(false);
                expect(window.location.hash).toBe('#middle');
                expect(document.activeElement).toBe(middle);

                await act(async () => first?.click());

                expect(window.location.hash).toBe('#first');
                expect(document.activeElement).toBe(output.querySelector('#first'));
                expect(heading?.getAttribute('tabindex')).toBe('0');
            },
            '/blog/reading/#middle'
        );
    } finally {
        await restoreHistory({ url: originalUrl, state: originalState });
    }
});

it('leaves modified fragment gestures to the browser without taking over scrolling', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;

    try {
        await withMounted(
            <ReadingArticle />,
            async (output) => {
                const link = output.querySelector<HTMLAnchorElement>('nav[aria-label="On this page"] a[href="#last"]');
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
                await act(async () => {
                    link?.dispatchEvent(event);
                    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
                });

                expect(event.defaultPrevented).toBe(false);
                expect(scroll).not.toHaveBeenCalled();
            },
            '/blog/reading/#first'
        );
    } finally {
        await restoreHistory({ url: originalUrl, state: originalState });
    }
});

it('tracks passed headings at their scroll margin and selects the final short section at the page bottom', async () => {
    // Supply geometry only; real scroll events drive the article's own tracking.
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
    let scrollY = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);

    await withMounted(<ReadingArticle />, async (output) => {
        for (const [id, top] of [
            ['first', 100],
            ['middle', 500],
            ['last', 1900]
        ] as const) {
            const heading = output.querySelector<HTMLElement>(`#${id}`);

            if (!heading) throw new Error(`Missing heading ${id}`);
            heading.style.scrollMarginTop = '20px';
            vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, top - scrollY, 0, 0));
        }

        const current = () =>
            output.querySelector('nav[aria-label="On this page"] [aria-current="location"]')?.getAttribute('href');

        const scrollTo = async (position: number, expected: string) => {
            scrollY = position;
            await act(async () => window.dispatchEvent(new Event('scroll')));
            await vi.waitFor(() => expect(current()).toBe(expected));
        };

        await scrollTo(478, '#first');
        await scrollTo(479, '#middle');
        await scrollTo(1400, '#last');
        await scrollTo(0, '#first');
    });
});

it.each(['hashchange', 'popstate'])(
    'tracks intermediate sections without changing history and follows %s',
    async (release) => {
        // Keep browser geometry and scrolling outside the article's real navigation behavior.
        vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
        vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        let scrollY = 0;
        vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
        const originalUrl = window.location.href;

        try {
            await withMounted(<ReadingArticle />, async (output) => {
                for (const [id, top] of [
                    ['first', 100],
                    ['middle', 500],
                    ['last', 900]
                ] as const) {
                    const heading = output.querySelector<HTMLElement>(`#${id}`);

                    if (!heading) throw new Error(`Missing heading ${id}`);
                    vi.spyOn(heading, 'getBoundingClientRect').mockImplementation(
                        () => new DOMRect(0, top - scrollY, 0, 0)
                    );
                }

                const current = () =>
                    output
                        .querySelector('nav[aria-label="On this page"] [aria-current="location"]')
                        ?.getAttribute('href');

                const scrollTo = async (position: number) => {
                    scrollY = position;
                    await act(async () => {
                        window.dispatchEvent(new Event('scroll'));
                        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
                    });
                };

                await act(async () => {
                    const changed = new Promise<void>((resolve) =>
                        window.addEventListener('hashchange', () => resolve(), { once: true })
                    );

                    output.querySelector<HTMLAnchorElement>('nav[aria-label="On this page"] a[href="#last"]')?.click();
                    await changed;
                });
                expect(current()).toBe('#last');
                const historyLength = window.history.length;

                await scrollTo(500);
                expect(current()).toBe('#middle');
                expect(window.location.hash).toBe('#last');
                expect(window.history.length).toBe(historyLength);

                if (release === 'hashchange') {
                    await act(async () => {
                        const changed = new Promise<void>((resolve) =>
                            window.addEventListener('hashchange', () => resolve(), { once: true })
                        );

                        window.location.hash = '#first';
                        await changed;
                    });
                    expect(current()).toBe('#first');
                } else {
                    await act(async () => {
                        const traversed = new Promise<void>((resolve) =>
                            window.addEventListener('popstate', () => resolve(), { once: true })
                        );

                        const changed = new Promise<void>((resolve) =>
                            window.addEventListener('hashchange', () => resolve(), { once: true })
                        );

                        window.history.back();
                        await Promise.all([traversed, changed]);
                    });
                    await vi.waitFor(() => expect(current()).toBe('#middle'));
                }

                await scrollTo(500);
                await vi.waitFor(() => expect(current()).toBe('#middle'));
                await scrollTo(0);
                await vi.waitFor(() => expect(current()).toBe('#first'));
            });
        } finally {
            await restoreHistory({ url: originalUrl, state: window.history.state });
        }
    }
);
