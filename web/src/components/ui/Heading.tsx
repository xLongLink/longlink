import type { ReactNode } from 'react';

const headings = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;

/** Displays a semantic View heading without a separate visual-level override. */
export function Heading({ level = 2, children }: { children?: ReactNode; level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
    // Preserve the semantic heading level.
    const Element = headings[level];

    return (
        <Element className="view-heading" data-level={level}>
            {children}
        </Element>
    );
}
