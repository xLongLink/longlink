import type { ReactNode } from 'react';
import { Heading as AstryxHeading } from '@astryxdesign/core/Heading';

/** Displays a semantic View heading without a separate visual-level override. */
export function Heading({
    level = 2,
    children,
    hidden,
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    children?: ReactNode;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}) {
    // Preserve the semantic heading while hiding its entire element when requested.
    return (
        <AstryxHeading level={level} hidden={hidden} className={hidden ? 'hidden!' : undefined}>
            {children}
        </AstryxHeading>
    );
}
