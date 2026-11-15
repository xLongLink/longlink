// @vitest-environment happy-dom
import { act, useRef } from 'react';
import { withMounted } from '../../render';
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
