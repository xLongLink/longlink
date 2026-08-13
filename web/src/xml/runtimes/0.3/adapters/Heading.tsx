import type { HeadingLevel } from '@astryxdesign/core-0-3/Heading';
import { Heading as AstryxHeading } from '@astryxdesign/core-0-3/Heading';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';

const HEADING_LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6];

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/Heading?tab=properties
 * - children: ReactNode
 * - id: string
 * - level: int
 */
export function Heading({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXml(props, 'id', ctx);
    const level = resolveXml(props, 'level', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (!isXmlEnum(level, HEADING_LEVELS)) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    return (
        <AstryxHeading id={typeof id === 'string' ? id : undefined} level={level}>
            {renderNode(nodes, ctx)}
        </AstryxHeading>
    );
}
