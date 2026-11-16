// @vitest-environment happy-dom
import { withMounted } from '../../render';
import { act, useRef, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Scrollspy } from '@/components/reui/scrollspy';

/** Exercises the documented scroll-area viewport boundary without document scrolling. */
function Panel() {
    const targetRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <Scrollspy targetRef={targetRef} history={false} offset={20}>
                <a href="#panel-first" data-scrollspy-anchor="panel-first">
                    First
                </a>
                <a href="#panel-last" data-scrollspy-anchor="panel-last">
                    Last
                </a>
            </Scrollspy>
            <div ref={targetRef}>
                <div data-slot="scroll-area-viewport">
                    <h2 id="panel-first">First</h2>
                    <h2 id="panel-last" style={{ scrollMarginTop: 10 }}>
                        Last
                    </h2>
                </div>
            </div>
        </>
    );
}

afterEach(() => vi.restoreAllMocks());

/** Replaces navigation nodes while retaining the same selected section. */
function UpdatingNavigation() {
    const [revision, setRevision] = useState(0);

    return (
        <>
            <button type="button" onClick={() => setRevision(revision + 1)}>
                Refresh navigation
            </button>
            <Scrollspy history={false}>
                <a key={`first-${revision}`} href="#refresh-first" data-scrollspy-anchor="refresh-first">
                    First
                </a>
                <a key={`last-${revision}`} href="#refresh-last" data-scrollspy-anchor="refresh-last">
                    Last
                </a>
            </Scrollspy>
            <h2 id="refresh-first">First</h2>
            <h2 id="refresh-last">Last</h2>
        </>
    );
}

it('keeps the active section highlighted after navigation nodes are replaced', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    await withMounted(<UpdatingNavigation />, async (output) => {
        const first = output.querySelector<HTMLElement>('#refresh-first');
        const last = output.querySelector<HTMLElement>('#refresh-last');
        const link = output.querySelector<HTMLAnchorElement>('a[href="#refresh-first"]');

        if (!first || !last || !link) throw new Error('Missing refresh content');
        vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, -100, 0, 0));
        vi.spyOn(last, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 500, 0, 0));

        await act(async () => link.click());
        await act(async () => output.querySelector<HTMLButtonElement>('button')?.click());

        const replacement = output.querySelector('a[href="#refresh-first"]');

        expect(replacement).not.toBe(link);
        expect(replacement?.getAttribute('aria-current')).toBe('location');
        expect(replacement?.getAttribute('data-active')).toBe('true');

        await act(async () => {
            window.dispatchEvent(new Event('scroll'));
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        });

        expect(output.querySelectorAll('[aria-current="location"]')).toHaveLength(1);
        expect(replacement?.getAttribute('aria-current')).toBe('location');
    });
});

it('focuses a noneditable heading nested inside editable content', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    await withMounted(
        <>
            <Scrollspy history={false}>
                <a href="#noneditable-heading" data-scrollspy-anchor="noneditable-heading">
                    <span>Heading</span>
                </a>
            </Scrollspy>
            <div contentEditable suppressContentEditableWarning>
                <h2 id="noneditable-heading" contentEditable={false}>
                    Heading
                </h2>
            </div>
        </>,
        async (output) => {
            await act(async () => output.querySelector<HTMLSpanElement>('a span')?.click());

            expect(document.activeElement).toBe(output.querySelector('#noneditable-heading'));
            expect(output.querySelector('#noneditable-heading')?.getAttribute('tabindex')).toBe('-1');
        }
    );
});

it('scrolls and tracks the nested viewport without rewriting document history', async () => {
    const documentScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    const historyLength = window.history.length;

    await withMounted(<Panel />, async (output) => {
        const viewport = output.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
        const first = output.querySelector<HTMLElement>('#panel-first');
        const last = output.querySelector<HTMLElement>('#panel-last');

        if (!viewport || !first || !last) throw new Error('Missing panel content');
        const scroll = vi.spyOn(viewport, 'scrollTo').mockImplementation(() => {});
        vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 300, 200));
        vi.spyOn(viewport, 'clientHeight', 'get').mockReturnValue(200);
        vi.spyOn(viewport, 'scrollHeight', 'get').mockReturnValue(1000);
        vi.spyOn(first, 'getBoundingClientRect').mockImplementation(
            () => new DOMRect(0, 110 - viewport.scrollTop, 0, 0)
        );
        vi.spyOn(last, 'getBoundingClientRect').mockImplementation(
            () => new DOMRect(0, 500 - viewport.scrollTop, 0, 0)
        );

        const current = () => output.querySelector('[aria-current="location"]')?.getAttribute('href');

        await act(async () => output.querySelector<HTMLAnchorElement>('a[href="#panel-last"]')?.click());

        expect(scroll).toHaveBeenCalledWith({ top: 370, behavior: 'smooth' });
        expect(documentScroll).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(last);
        expect(current()).toBe('#panel-last');

        await act(async () => {
            viewport.dispatchEvent(new Event('scroll'));
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        });
        expect(current()).toBe('#panel-first');

        viewport.scrollTop = 370;
        await act(async () => {
            viewport.dispatchEvent(new Event('scroll'));
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        });
        expect(current()).toBe('#panel-last');
        expect(window.location.href).toBe(originalUrl);
        expect(window.history.state).toEqual(originalState);
        expect(window.history.length).toBe(historyLength);
    });
});
