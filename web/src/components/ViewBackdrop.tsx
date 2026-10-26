import { createPortal } from 'react-dom';
import { useLayoutEffect, useState, type RefObject } from 'react';

/** Extends native iframe backdrops over the host without painting over the frame a second time. */
export function ViewBackdrop({ frame, depth }: { frame: RefObject<HTMLIFrameElement | null>; depth: number }) {
    const [bounds, setBounds] = useState<DOMRect>();

    // Geometry is measured by the host, never supplied by Solution code.
    useLayoutEffect(() => {
        const element = frame.current;

        if (!element) return;

        const measure = () => setBounds(element.getBoundingClientRect());
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        observer.observe(document.body);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        window.visualViewport?.addEventListener('resize', measure);
        window.visualViewport?.addEventListener('scroll', measure);
        measure();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
            window.visualViewport?.removeEventListener('resize', measure);
            window.visualViewport?.removeEventListener('scroll', measure);
        };
    }, [frame]);

    if (!bounds) return null;

    // Cut out the iframe viewport: native backdrops already dim and blur everything inside it.
    const left = Math.max(0, Math.min(window.innerWidth, bounds.left));
    const right = Math.max(0, Math.min(window.innerWidth, bounds.right));
    const top = Math.max(0, Math.min(window.innerHeight, bounds.top));
    const bottom = Math.max(0, Math.min(window.innerHeight, bounds.bottom));
    const clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px, 0 0)`;
    const layers = [];

    // Match Astryx's native tint, blur, and nesting while leaving host navigation and native modal input intact.
    for (let level = 1; level <= depth; level += 1) {
        layers.push(
            <div
                key={level}
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-40"
                style={{ clipPath, backgroundColor: 'var(--color-overlay)', backdropFilter: 'blur(2px)' }}
            />
        );
    }

    return createPortal(layers, document.body);
}
