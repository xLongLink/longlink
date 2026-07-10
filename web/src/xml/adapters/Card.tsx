import { Card as UICard, CardContent as UICardContent } from '@/components/ui/card';
import { useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';

/** Renders the shadcn card shell. */
export function Card({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <UICard>
            <UICardContent>{renderNode(nodes, ctx)}</UICardContent>
        </UICard>
    );
}
