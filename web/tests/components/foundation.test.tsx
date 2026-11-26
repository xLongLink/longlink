// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { afterEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Foundation } from '@/components/ui/foundation';

const intersections: VisibilityObserver[] = [];

/** Supplies viewport visibility at the DOM observer boundary. */
class VisibilityObserver extends IntersectionObserver {
    readonly callback: IntersectionObserverCallback;
    target: Element | undefined;
    disconnected = false;

    constructor(callback: IntersectionObserverCallback) {
        super(callback);
        this.callback = callback;
        intersections.push(this);
    }

    override observe(target: Element) {
        this.target = target;
    }

    override disconnect() {
        this.disconnected = true;
    }

    emit(visible: boolean) {
        const target = this.target;

        if (!target || this.disconnected) return;
        const bounds = target.getBoundingClientRect();
        this.callback(
            [
                {
                    target,
                    isIntersecting: visible,
                    intersectionRatio: visible ? 1 : 0,
                    boundingClientRect: bounds,
                    intersectionRect: bounds,
                    rootBounds: null,
                    time: performance.now()
                }
            ],
            this
        );
    }
}

/** Advances through the real animation-frame queue. */
async function nextFrame() {
    await act(async () => {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    intersections.length = 0;
});

it('exposes each row once and lets keyboard users focus the described pause region', async () => {
    const user = userEvent.setup();

    await withMounted(<Foundation />, async (output) => {
        const section = output.querySelector('section.foundation');

        if (!section) throw new Error('Expected Foundation section');
        await act(async () => user.tab());
        expect(document.activeElement).toBe(section);
        expect(output.querySelector(`#${section.getAttribute('aria-labelledby')}`)?.tagName).toBe('H2');
        expect(output.querySelector(`#${section.getAttribute('aria-describedby')}`)?.textContent?.trim()).toBeTruthy();

        for (const label of ['Industries', 'Use cases']) {
            const namedLists = output.querySelectorAll(`ul[aria-label="${label}"]`);
            expect(namedLists).toHaveLength(1);
            const list = namedLists[0];

            if (!list?.parentElement) throw new Error(`Expected ${label} row`);
            const rowLists = [...list.parentElement.querySelectorAll('ul')];
            expect(rowLists.filter((rowList) => rowList.getAttribute('aria-hidden') !== 'true')).toEqual([list]);

            for (const duplicate of rowLists.filter((rowList) => rowList !== list)) {
                expect(duplicate.getAttribute('aria-hidden')).toBe('true');
                expect(duplicate.hasAttribute('aria-label')).toBe(false);
                expect(duplicate.hasAttribute('aria-labelledby')).toBe(false);
            }
        }
    });
});

it('limits motion to visible content, follows reduced-motion changes, and cleans up', async () => {
    vi.stubGlobal('IntersectionObserver', VisibilityObserver);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = false;
    vi.spyOn(preference, 'matches', 'get').mockImplementation(() => reduced);
    vi.spyOn(window, 'matchMedia').mockReturnValue(preference);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const measure = vi.fn(() => new DOMRect(0, 800, 1200, 400));

    await withMounted(<Foundation />, async (output) => {
        const section = output.querySelector<HTMLElement>('section.foundation');

        if (!section) throw new Error('Expected Foundation section');
        vi.spyOn(section, 'getBoundingClientRect').mockImplementation(measure);
        const observer = intersections[0];

        expect(observer.target).toBe(section);
        expect(section.dataset.paused).toBe('true');
        window.dispatchEvent(new Event('scroll'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('');

        // Entering at the bottom starts with a positive offset, then scrolling reverses it.
        observer.emit(true);
        await nextFrame();
        expect(section.dataset.paused).toBe('false');
        expect(Number.parseFloat(section.style.getPropertyValue('--foundation-scroll'))).toBeGreaterThan(0);
        measure.mockReturnValue(new DOMRect(0, -400, 1200, 400));
        window.dispatchEvent(new Event('scroll'));
        await nextFrame();
        const offset = section.style.getPropertyValue('--foundation-scroll');
        expect(Number.parseFloat(offset)).toBeLessThan(0);

        // Preference changes affect an already-visible section without another scroll.
        reduced = true;
        preference.dispatchEvent(new Event('change'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('0px');
        reduced = false;
        preference.dispatchEvent(new Event('change'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe(offset);
        observer.emit(false);
        measure.mockClear();
        window.dispatchEvent(new Event('scroll'));
        await nextFrame();
        expect(section.dataset.paused).toBe('true');
        expect(measure).not.toHaveBeenCalled();

        // Leave one real frame pending so unmount must cancel it.
        observer.emit(true);
        measure.mockClear();
    });

    expect(intersections[0].disconnected).toBe(true);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    preference.dispatchEvent(new Event('change'));
    await nextFrame();
    expect(measure).not.toHaveBeenCalled();
});
