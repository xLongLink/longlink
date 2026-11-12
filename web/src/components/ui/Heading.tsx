import type { ReactNode } from 'react';
import { Heading as AstryxHeading } from '@/components/astryx/Heading';

/** Displays a semantic View heading without a separate visual-level override. */
export function Heading({ level = 2, children }: { children?: ReactNode; level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
    // Preserve the semantic heading level.
    return <AstryxHeading level={level}>{children}</AstryxHeading>;
}
