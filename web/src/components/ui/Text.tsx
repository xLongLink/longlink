import type { ReactNode } from 'react';
import { Text as AstryxText } from '@astryxdesign/core/Text';

/** Displays View text with a small set of semantic styles. */
export function Text(props: {
    children?: ReactNode;
    color?: 'primary' | 'secondary';
    type?: 'body' | 'large' | 'label' | 'supporting' | 'code';
}) {
    return <AstryxText {...props} children={props.children} />;
}
