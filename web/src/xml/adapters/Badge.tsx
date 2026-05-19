import { Badge as UIBadge } from '@ui/badge';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Badge component. */
export interface BadgeProps extends Props {}

/** Renders a shadcn-backed badge for short status labels and tags. */
export function Badge({ props, nodes }: BadgeProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UIBadge variant={variant as never}>{renderNode(children ?? [], ctx)}</UIBadge>;
}
