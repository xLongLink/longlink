import type { ReactNode } from 'react';
import { Divider as AstryxDivider } from '@astryxdesign/core/Divider';

/** Separates View content with an optional label and configurable line presentation. */
export function Divider(props: {
    label?: ReactNode;
    variant?: 'subtle' | 'strong';
    orientation?: 'horizontal' | 'vertical';
    isFullBleed?: boolean;
}) {
    // Use a subtle horizontal separator contained within its parent by default.
    return (
        <AstryxDivider
            {...props}
            variant={props.variant ?? 'subtle'}
            orientation={props.orientation ?? 'horizontal'}
            isFullBleed={props.isFullBleed ?? false}
        />
    );
}
