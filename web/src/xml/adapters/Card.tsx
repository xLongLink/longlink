import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@ui/card';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Renders the shadcn card shell. */
export function Card({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return <UICard size={size as 'default' | 'sm'}>{renderNode(children ?? [], ctx)}</UICard>;
}

/** Renders the card header slot. */
export function CardHeader({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UICardHeader>{renderNode(children ?? [], ctx)}</UICardHeader>;
}

/** Renders the card title slot. */
export function CardTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UICardTitle>{renderNode(children ?? [], ctx)}</UICardTitle>;
}

/** Renders the card description slot. */
export function CardDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UICardDescription>{renderNode(children ?? [], ctx)}</UICardDescription>;
}

/** Renders the card action slot. */
export function CardAction({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UICardAction>{renderNode(children ?? [], ctx)}</UICardAction>;
}

/** Renders the card content slot. */
export function CardContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UICardContent>{renderNode(children ?? [], ctx)}</UICardContent>;
}

/** Renders the card footer slot. */
export function CardFooter({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <UICardFooter>{renderNode(children ?? [], ctx)}</UICardFooter>;
}
