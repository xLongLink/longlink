import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';

/** Renders the shadcn card shell. */
export function Card({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <UICard>
            <UICardContent>{renderNode(nodes, ctx)}</UICardContent>
        </UICard>
    );
}
