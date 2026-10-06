import type { ReactNode } from 'react';
import { Text as AstryxText } from '@astryxdesign/core/Text';

/** Displays View text with a small set of semantic styles. */
export function Text({
    children,
    ...props
}: {
    children?: ReactNode;
    color?: 'primary' | 'secondary';
    type?: 'body' | 'large' | 'label' | 'supporting' | 'code';
}) {
    // Preserve semantic supporting-text color while defaulting to body copy.
    return (
        <AstryxText
            {...props}
            type={props.type ?? 'body'}
            color={props.color ?? (props.type === 'supporting' ? 'secondary' : 'primary')}
        >
            {children}
        </AstryxText>
    );
}
