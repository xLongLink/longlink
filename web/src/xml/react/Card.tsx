import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@ui/card';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Card component. */
export interface CardProps {
    children?: ASTNode[];
    className?: string;
    size?: string;
}

/** Props accepted by the XML CardHeader component. */
export interface CardHeaderProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML CardTitle component. */
export interface CardTitleProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML CardDescription component. */
export interface CardDescriptionProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML CardAction component. */
export interface CardActionProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML CardContent component. */
export interface CardContentProps {
    children?: ASTNode[];
    className?: string;
}

/** Props accepted by the XML CardFooter component. */
export interface CardFooterProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders the shadcn card shell. */
export function Card({ children, className: _className, size = 'default' }: CardProps) {
    const { ctx } = useXmlContext();

    return <UICard size={size as 'default' | 'sm'}>{renderNode(children ?? [], ctx)}</UICard>;
}

/** Renders the card header slot. */
export function CardHeader({ children, className: _className }: CardHeaderProps) {
    const { ctx } = useXmlContext();

    return <UICardHeader>{renderNode(children ?? [], ctx)}</UICardHeader>;
}

/** Renders the card title slot. */
export function CardTitle({ children, className: _className }: CardTitleProps) {
    const { ctx } = useXmlContext();

    return <UICardTitle>{renderNode(children ?? [], ctx)}</UICardTitle>;
}

/** Renders the card description slot. */
export function CardDescription({ children, className: _className }: CardDescriptionProps) {
    const { ctx } = useXmlContext();

    return <UICardDescription>{renderNode(children ?? [], ctx)}</UICardDescription>;
}

/** Renders the card action slot. */
export function CardAction({ children, className: _className }: CardActionProps) {
    const { ctx } = useXmlContext();

    return <UICardAction>{renderNode(children ?? [], ctx)}</UICardAction>;
}

/** Renders the card content slot. */
export function CardContent({ children, className: _className }: CardContentProps) {
    const { ctx } = useXmlContext();

    return <UICardContent>{renderNode(children ?? [], ctx)}</UICardContent>;
}

/** Renders the card footer slot. */
export function CardFooter({ children, className: _className }: CardFooterProps) {
    const { ctx } = useXmlContext();

    return <UICardFooter>{renderNode(children ?? [], ctx)}</UICardFooter>;
}
