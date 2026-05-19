import { Badge as UIBadge } from '@ui/badge';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Renders a shadcn-backed badge for short status labels and tags. */
export function Badge({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UIBadge variant={variant as never}>{renderNode(children ?? [], ctx)}</UIBadge>;
}
