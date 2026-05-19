import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@ui/card';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Card component. */
export interface CardProps extends Props {}

/** Props accepted by the XML CardHeader component. */
export interface CardHeaderProps extends Props {}

/** Props accepted by the XML CardTitle component. */
export interface CardTitleProps extends Props {}

/** Props accepted by the XML CardDescription component. */
export interface CardDescriptionProps extends Props {}

/** Props accepted by the XML CardAction component. */
export interface CardActionProps extends Props {}

/** Props accepted by the XML CardContent component. */
export interface CardContentProps extends Props {}

/** Props accepted by the XML CardFooter component. */
export interface CardFooterProps extends Props {}

/** Renders the shadcn card shell. */
export function Card({ props, nodes }: CardProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const size = resolveXmlString(props, 'size', ctx, 'default');

    return <UICard size={size as 'default' | 'sm'}>{renderNode(children ?? [], ctx)}</UICard>;
}

/** Renders the card header slot. */
export function CardHeader({ props, nodes }: CardHeaderProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UICardHeader>{renderNode(children ?? [], ctx)}</UICardHeader>;
}

/** Renders the card title slot. */
export function CardTitle({ props, nodes }: CardTitleProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UICardTitle>{renderNode(children ?? [], ctx)}</UICardTitle>;
}

/** Renders the card description slot. */
export function CardDescription({ props, nodes }: CardDescriptionProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UICardDescription>{renderNode(children ?? [], ctx)}</UICardDescription>;
}

/** Renders the card action slot. */
export function CardAction({ props, nodes }: CardActionProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UICardAction>{renderNode(children ?? [], ctx)}</UICardAction>;
}

/** Renders the card content slot. */
export function CardContent({ props, nodes }: CardContentProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UICardContent>{renderNode(children ?? [], ctx)}</UICardContent>;
}

/** Renders the card footer slot. */
export function CardFooter({ props, nodes }: CardFooterProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <UICardFooter>{renderNode(children ?? [], ctx)}</UICardFooter>;
}
