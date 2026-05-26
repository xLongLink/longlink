import {
    Card as UICard,
    CardContent as UICardContent,
} from '@ui/card';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';

/** Renders the shadcn card shell. */
export function Card({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return (
        <UICard size={size as 'default' | 'sm'}>
            <UICardContent>{renderNode(nodes, ctx)}</UICardContent>
        </UICard>
    );
}
