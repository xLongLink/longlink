import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';
import { Heading as AstryxHeading } from '@astryxdesign/core/Heading';

export function Heading({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const level = resolveXml(props, 'level', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (!isXmlEnum(level, [1, 2, 3, 4, 5, 6] as const)) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    return (
        <AstryxHeading level={level}>
            {renderNode(nodes, ctx)}
        </AstryxHeading>
    );
}
