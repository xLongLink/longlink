import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@ui/card';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';

/** Renders the shadcn card shell. */
export function Card({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return <UICard size={size as 'default' | 'sm'}>{renderNode(nodes, ctx)}</UICard>;
}

/** Renders the card header slot. */
export function CardHeader({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UICardHeader>{renderNode(nodes, ctx)}</UICardHeader>;
}

/** Renders the card title slot. */
export function CardTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UICardTitle>{renderNode(nodes, ctx)}</UICardTitle>;
}

/** Renders the card description slot. */
export function CardDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UICardDescription>{renderNode(nodes, ctx)}</UICardDescription>;
}

/** Renders the card action slot. */
export function CardAction({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UICardAction>{renderNode(nodes, ctx)}</UICardAction>;
}

/** Renders the card content slot. */
export function CardContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UICardContent>{renderNode(nodes, ctx)}</UICardContent>;
}

/** Renders the card footer slot. */
export function CardFooter({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UICardFooter>{renderNode(nodes, ctx)}</UICardFooter>;
}
