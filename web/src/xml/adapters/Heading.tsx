import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { Heading as AstryxHeading } from '@astryxdesign/core/Heading';

const headingPropsSchema = z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
});

type HeadingProps = z.infer<typeof headingPropsSchema>;

export function Heading({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { level }: HeadingProps = resolveXmlProps(props, ctx, { level: 'scalar' }, headingPropsSchema);

    return <AstryxHeading level={level}>{renderNode(nodes, ctx)}</AstryxHeading>;
}
