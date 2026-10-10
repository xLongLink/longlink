import type { ReactNode } from 'react';
import { Text as AstryxText } from '@astryxdesign/core/Text';

/** Displays View text with a small set of semantic styles. */
export function Text({
    children,
    ...props
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    children?: ReactNode;
    color?: 'primary' | 'secondary';
    type?: 'body' | 'large' | 'label' | 'supporting' | 'code';
}) {
    // Preserve semantic supporting-text color while defaulting to body copy.
    return (
        <AstryxText
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            type={props.type ?? 'body'}
            color={props.color ?? (props.type === 'supporting' ? 'secondary' : 'primary')}
        >
            {children}
        </AstryxText>
    );
}
