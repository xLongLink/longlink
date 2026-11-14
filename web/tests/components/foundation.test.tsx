// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { afterEach, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Foundation } from '@/components/foundation';

const intersections: VisibilityObserver[] = [];

const resizes: TrackObserver[] = [];

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

/** Supplies track-size notifications without replacing the duration calculation. */
class TrackObserver extends ResizeObserver {
    readonly callback: ResizeObserverCallback;
    target: Element | undefined;
    disconnected = false;

    constructor(callback: ResizeObserverCallback) {
        super(callback);
        this.callback = callback;
        resizes.push(this);
    }

    override observe(target: Element) {
        this.target = target;
    }

    override disconnect() {
        this.disconnected = true;
    }

    emit() {
        if (!this.disconnected) this.callback([], this);
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
    resizes.length = 0;
});

it('exposes each row once and lets keyboard users focus the described pause region', async () => {
    vi.stubGlobal('IntersectionObserver', VisibilityObserver);
    vi.stubGlobal('ResizeObserver', TrackObserver);
    const user = userEvent.setup();

    await withMounted(<Foundation />, async (output) => {
        const section = output.querySelector('section.foundation');

        if (!section) throw new Error('Expected Foundation section');
        await act(async () => user.tab());
        expect(document.activeElement).toBe(section);
        expect(output.querySelector(`#${section.getAttribute('aria-labelledby')}`)?.tagName).toBe('H2');
        expect(output.querySelector(`#${section.getAttribute('aria-describedby')}`)?.textContent).toContain(
            'pauses while this section has keyboard focus'
        );

        // Only the first copy is named and exposed; hidden copies still fill the moving track.
        for (const label of ['Industries', 'Use cases']) {
            const list = output.querySelector(`ul[aria-label="${label}"]`);

            if (!list?.parentElement) throw new Error(`Expected ${label} row`);
            expect(list.hasAttribute('aria-hidden')).toBe(false);
            const duplicates = [...list.parentElement.querySelectorAll('ul[aria-hidden="true"]')];
            expect(duplicates).toHaveLength(2);

            for (const duplicate of duplicates) {
                expect(duplicate.hasAttribute('aria-label')).toBe(false);
                expect(duplicate.textContent).toBe(list.textContent);
            }
        }
    });
});

it('measures both native tracks at 18px per second and recalculates after resize', async () => {
    vi.stubGlobal('IntersectionObserver', VisibilityObserver);
    vi.stubGlobal('ResizeObserver', TrackObserver);
    let width = 5400;
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => width);
    let tracks: TrackObserver[] = [];

    await withMounted(<Foundation />, async () => {
        tracks = resizes.filter((observer) => observer.target?.classList.contains('foundation-track'));
        expect(tracks).toHaveLength(2);

        for (const observer of tracks) {
            expect(observer.target).toBeInstanceOf(HTMLDivElement);
            expect(observer.target?.getAttribute('style')).toContain('--foundation-drift-duration: 100s');
        }

        // A changed viewport/font measurement must change speed on both live DOM nodes.
        width = 8100;

        for (const observer of tracks) observer.emit();

        for (const observer of tracks) {
            expect(observer.target?.getAttribute('style')).toContain('--foundation-drift-duration: 150s');
        }
    });

    expect(tracks.every((observer) => observer.disconnected)).toBe(true);
});

it('updates scroll offset only while visible, follows motion preference and viewport changes, and cleans up', async () => {
    vi.stubGlobal('IntersectionObserver', VisibilityObserver);
    vi.stubGlobal('ResizeObserver', TrackObserver);
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
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('210px');
        measure.mockReturnValue(new DOMRect(0, -400, 1200, 400));
        window.dispatchEvent(new Event('scroll'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('-210px');

        // Preference changes affect an already-visible section without another scroll.
        reduced = true;
        preference.dispatchEvent(new Event('change'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('0px');
        reduced = false;
        preference.dispatchEvent(new Event('change'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('-210px');

        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(600);
        window.dispatchEvent(new Event('resize'));
        await nextFrame();
        expect(section.style.getPropertyValue('--foundation-scroll')).toBe('-105px');
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
    expect(resizes.every((observer) => observer.disconnected)).toBe(true);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    preference.dispatchEvent(new Event('change'));
    await nextFrame();
    expect(measure).not.toHaveBeenCalled();
});
