import { Badge as UIBadge } from '@ui/badge';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';

/** Renders a shadcn-backed badge for short status labels and tags. */
export function Badge({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UIBadge variant={variant as never}>{renderNode(nodes, ctx)}</UIBadge>;
}
