import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';

/**
 * Renders a flex container with optional space distribution.
 */
export function Flex({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const space = resolveXmlString(props, 'space', ctx);

    // Map the XML space values to the matching justify-content utility.
    const justifyClass =
        space === 'center'
            ? 'justify-center'
            : space === 'around'
              ? 'justify-around'
              : space === 'evenly'
                ? 'justify-evenly'
                : space === 'between'
                  ? 'justify-between'
                  : '';

    return (
        <div data-slot="flex" className={`flex items-center gap-4 ${justifyClass}`.trim()}>
            {renderNode(nodes, ctx)}
        </div>
    );
}
