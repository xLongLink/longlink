import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import * as AstryxText from '@astryxdesign/core/Text';
import { Children, type ReactNode } from 'react';
import { TEXT_COLORS, TEXT_TYPES } from '../constants';

const textPropsSchema = z.object({
    color: z.enum(TEXT_COLORS).optional(),
    type: z.enum(TEXT_TYPES).optional(),
    value: z.string().optional(),
});

/** Separates mixed text children with single spaces. */
function joinTextNodes(content: ReactNode): ReactNode {
    const items = Children.toArray(content).filter((child) => child !== '');

    return items.flatMap((child, index) => (index === 0 ? [child] : [' ', child]));
}

export function Text({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { color, type, value } = resolveXmlProps(props, ctx, textPropsSchema);

    // Whitespace between inline elements is lost at parse time, so mixed
    // children (e.g. `<b>Label</b> $value`) are spaced here instead.
    const content = value ?? joinTextNodes(renderNode(nodes, ctx));

    return (
        <AstryxText.Text color={color} type={type}>
            {content}
        </AstryxText.Text>
    );
}

export function Bold({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <b>{renderNode(nodes, ctx)}</b>;
}

export function Italic({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <i>{renderNode(nodes, ctx)}</i>;
}
