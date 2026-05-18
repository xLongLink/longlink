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
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    size?: string;
}

/** Props accepted by the XML CardHeader component. */
export interface CardHeaderProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML CardTitle component. */
export interface CardTitleProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML CardDescription component. */
export interface CardDescriptionProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML CardAction component. */
export interface CardActionProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML CardContent component. */
export interface CardContentProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Props accepted by the XML CardFooter component. */
export interface CardFooterProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders the shadcn card shell. */
export function Card({ children, className, size = 'default' }: CardProps) {
    const { ctx } = useXmlContext();

    return (
        <UICard className={className} size={size as 'default' | 'sm'}>
            {renderNode(children ?? null, ctx)}
        </UICard>
    );
}

/** Renders the card header slot. */
export function CardHeader({ children, className }: CardHeaderProps) {
    const { ctx } = useXmlContext();

    return <UICardHeader className={className}>{renderNode(children ?? null, ctx)}</UICardHeader>;
}

/** Renders the card title slot. */
export function CardTitle({ children, className }: CardTitleProps) {
    const { ctx } = useXmlContext();

    return <UICardTitle className={className}>{renderNode(children ?? null, ctx)}</UICardTitle>;
}

/** Renders the card description slot. */
export function CardDescription({ children, className }: CardDescriptionProps) {
    const { ctx } = useXmlContext();

    return <UICardDescription className={className}>{renderNode(children ?? null, ctx)}</UICardDescription>;
}

/** Renders the card action slot. */
export function CardAction({ children, className }: CardActionProps) {
    const { ctx } = useXmlContext();

    return <UICardAction className={className}>{renderNode(children ?? null, ctx)}</UICardAction>;
}

/** Renders the card content slot. */
export function CardContent({ children, className }: CardContentProps) {
    const { ctx } = useXmlContext();

    return <UICardContent className={className}>{renderNode(children ?? null, ctx)}</UICardContent>;
}

/** Renders the card footer slot. */
export function CardFooter({ children, className }: CardFooterProps) {
    const { ctx } = useXmlContext();

    return <UICardFooter className={className}>{renderNode(children ?? null, ctx)}</UICardFooter>;
}
