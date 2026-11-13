import { createPortal } from 'react-dom';

/** Extends native iframe backdrops over the host without painting over the frame a second time. */
export function ViewBackdrop({ bounds, depth }: { bounds: DOMRectReadOnly; depth: number }) {
    // Cut out the iframe viewport: native backdrops already dim and blur everything inside it.
    const left = Math.max(0, Math.min(window.innerWidth, bounds.left));
    const right = Math.max(0, Math.min(window.innerWidth, bounds.right));
    const top = Math.max(0, Math.min(window.innerHeight, bounds.top));
    const bottom = Math.max(0, Math.min(window.innerHeight, bounds.bottom));
    const clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px, 0 0)`;
    const layers = [];

    // Preserve the modal tint, blur, and nesting without blocking host navigation or native modal input.
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
