// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { LinkProvider } from '@astryxdesign/core/Link';
import { renderStatic, withMounted } from '../../render';
import { ArticleFooter } from '@/components/layouts/Article';
import { Link as RouterLink, useLocation } from 'react-router';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';

/** Keeps the footer mounted across real collection and unrelated route transitions. */
function ArticleNavigation({ children }: { children?: ReactNode }) {
    const { pathname } = useLocation();

    return (
        <LinkProvider component={RouterLink}>
            <output aria-label="Current article">{pathname}</output>
            <ArticleFooter lastUpdated="2026-10-16" paths={['/docs/first', '/docs/middle', '/docs/last']} />
            {children}
            <RouterLink to="/outside/">Leave collection</RouterLink>
        </LinkProvider>
    );
}

/** Dispatches cancelable keyboard input through the mounted document listener. */
async function pressArrow(target: EventTarget, key: string, modifiers: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
    await act(async () => target.dispatchEvent(event));

    return event;
}

beforeEach(() => {
    // Scrolling is an external layout effect; keep routing and animation frames real.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

it('does not offer unrelated collection navigation for an unlisted article', () => {
    // Act
    const output = renderStatic(
        <ArticleFooter lastUpdated="2026-10-16" paths={['/docs/first', '/docs/last']} />,
        '/outside'
    );

    // Assert
    expect(output.querySelector('[aria-label="Article page navigation"]')).toBeNull();
    expect(output.querySelector('a[href="/docs/first/"]')).toBeNull();
    expect(output.querySelector('a[href="/docs/last/"]')).toBeNull();
    expect(output.textContent).toContain('16 Oct 2026');
});

it.each([
    ['/docs/first///', 'ArrowLeft', 'ArrowRight', 'Next'],
    ['/docs/last', 'ArrowRight', 'ArrowLeft', 'Previous'],
])('preserves collection boundaries and normalizes %s', async (path, boundaryKey, availableKey, availableLabel) => {
    // Act
    await withMounted(
        <ArticleNavigation />,
        async (output) => {
            // Assert
            const disabled = output.querySelector('button');
            expect(disabled?.disabled).toBe(true);
            expect(disabled?.getAttribute('aria-keyshortcuts')).toBe(boundaryKey);
            expect(output.querySelector('a[href="/docs/middle/"]')?.textContent).toBe(availableLabel);

            // Act
            const boundaryEvent = await pressArrow(document, boundaryKey);

            // Assert
            expect(boundaryEvent.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe(path);
            expect(window.scrollTo).not.toHaveBeenCalled();

            // Act
            const availableEvent = await pressArrow(document, availableKey);

            // Assert
            expect(availableEvent.defaultPrevented).toBe(true);
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/middle/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 }));
        },
        path
    );
});

it('uses the same routed destinations and scroll reset for buttons and keyboard shortcuts', async () => {
    // Act
    await withMounted(
        <ArticleNavigation />,
        async (output) => {
            const next = output.querySelector<HTMLAnchorElement>('a[aria-keyshortcuts="ArrowRight"]');
            expect(next?.getAttribute('href')).toBe('/docs/last/');
            await act(async () => next?.click());

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(1));
            expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 });

            // Act
            await pressArrow(document, 'ArrowLeft');

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/middle/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(2));

            // Act
            await pressArrow(document, 'ArrowRight');

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(3));

            // Act
            const previous = output.querySelector<HTMLAnchorElement>('a[aria-keyshortcuts="ArrowLeft"]');
            expect(previous?.getAttribute('href')).toBe('/docs/middle/');
            await act(async () => previous?.click());

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/middle/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledTimes(4));
            expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0 });
        },
        '/docs/middle/'
    );
});

it.each([
    ['Alt', { altKey: true }],
    ['Control', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
])('leaves %s-modified arrows available without navigating', async (_modifier, modifiers) => {
    // Act
    await withMounted(
        <ArticleNavigation />,
        async (output) => {
            const event = await pressArrow(document, 'ArrowRight', modifiers);

            // Assert
            expect(event.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/docs/middle/');
            expect(window.scrollTo).not.toHaveBeenCalled();

            // Act
            await pressArrow(document, 'ArrowRight');

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 }));
        },
        '/docs/middle/'
    );
});

it('respects an arrow event already handled by a child control', async () => {
    // Act
    await withMounted(
        <ArticleNavigation>
            <button onKeyDown={(event) => event.preventDefault()}>Widget action</button>
        </ArticleNavigation>,
        async (output) => {
            const control = output.querySelector('button');
            expect(control).not.toBeNull();
            const event = await pressArrow(control ?? document, 'ArrowRight');

            // Assert
            expect(event.defaultPrevented).toBe(true);
            expect(output.querySelector('output')?.textContent).toBe('/docs/middle/');
            expect(window.scrollTo).not.toHaveBeenCalled();

            // Act
            await pressArrow(document, 'ArrowRight');

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 }));
        },
        '/docs/middle/'
    );
});

it.each([
    ['input', <input key="input" aria-label="Editing control" />],
    ['textarea', <textarea key="textarea" aria-label="Editing control" />],
    [
        'select',
        <select key="select" aria-label="Editing control">
            <option>First</option>
            <option>Second</option>
        </select>,
    ],
    [
        'contenteditable descendant',
        <section key="editor" contentEditable suppressContentEditableWarning>
            <p aria-label="Editing control" tabIndex={0}>
                Draft article
            </p>
        </section>,
    ],
    [
        'slider descendant',
        <section
            key="slider"
            role="slider"
            aria-label="Reading zoom"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={50}
        >
            <button aria-label="Editing control">Slider thumb</button>
        </section>,
    ],
])('does not steal arrow input from a %s', async (_name, control) => {
    // Act
    await withMounted(
        <ArticleNavigation>{control}</ArticleNavigation>,
        async (output) => {
            const target = output.querySelector<HTMLElement>('[aria-label="Editing control"]');
            expect(target).not.toBeNull();
            target?.focus();
            const event = await pressArrow(target ?? document, 'ArrowRight');

            // Assert
            expect(event.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/docs/middle/');
            expect(window.scrollTo).not.toHaveBeenCalled();

            // Act
            await pressArrow(document, 'ArrowRight');

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 }));
        },
        '/docs/middle/'
    );
});

it('stops handling collection shortcuts after navigation to an unlisted article', async () => {
    // Act
    await withMounted(
        <ArticleNavigation />,
        async (output) => {
            await pressArrow(document, 'ArrowRight');
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 }));
            vi.mocked(window.scrollTo).mockClear();
            await act(async () => output.querySelector<HTMLAnchorElement>('a[href="/outside/"]')?.click());

            // Assert
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/outside/'));
            expect(output.querySelector('[aria-label="Article page navigation"]')).toBeNull();

            // Act
            const left = await pressArrow(document, 'ArrowLeft');
            const right = await pressArrow(document, 'ArrowRight');

            // Assert
            expect(left.defaultPrevented).toBe(false);
            expect(right.defaultPrevented).toBe(false);
            expect(output.querySelector('output')?.textContent).toBe('/outside/');
            expect(window.scrollTo).not.toHaveBeenCalled();
        },
        '/docs/middle/'
    );
});

it('releases the document shortcut listener when the footer unmounts', async () => {
    // Arrange
    await withMounted(
        <ArticleNavigation />,
        async (output) => {
            await pressArrow(document, 'ArrowRight');
            await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('/docs/last/'));
            await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 }));
        },
        '/docs/middle/'
    );
    vi.mocked(window.scrollTo).mockClear();

    // Act
    const event = await pressArrow(document, 'ArrowLeft');

    // Assert
    expect(event.defaultPrevented).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
});
