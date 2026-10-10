import type { ReactNode } from 'react';
import { Divider as AstryxDivider } from '@astryxdesign/core/Divider';

/** Separates View content with an optional label and configurable line presentation. */
export function Divider(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    label?: ReactNode;
    variant?: 'subtle' | 'strong';
    orientation?: 'horizontal' | 'vertical';
    isFullBleed?: boolean;
}) {
    // Use a subtle horizontal separator contained within its parent by default.
    return (
        <AstryxDivider
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            variant={props.variant ?? 'subtle'}
            orientation={props.orientation ?? 'horizontal'}
            isFullBleed={props.isFullBleed ?? false}
        />
    );
}
