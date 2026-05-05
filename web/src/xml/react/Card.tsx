import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@/ui/card';
import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';

type BaseProps = {
    children?: RenderableASTNode;
};

type CardProps = BaseProps & { size?: 'default' | 'sm' };
type ChildrenProps = BaseProps;

export function Card({ children, size = 'default' }: CardProps) {
    const { registry, ctx } = useRuntime();

    return <UICard size={size}>{renderNode(children, registry, ctx)}</UICard>;
}


export function CardHeader({ children }: ChildrenProps) {
    const { registry, ctx } = useRuntime();

    return <UICardHeader>{renderNode(children, registry, ctx)}</UICardHeader>;
}


export function CardTitle({ children }: ChildrenProps) {
    const { registry, ctx } = useRuntime();

    return <UICardTitle>{renderNode(children, registry, ctx)}</UICardTitle>;
}


export function CardDescription({ children }: ChildrenProps) {
    const { registry, ctx } = useRuntime();

    return <UICardDescription>{renderNode(children, registry, ctx)}</UICardDescription>;
}


export function CardAction({ children }: ChildrenProps) {
    const { registry, ctx } = useRuntime();
    return <UICardAction>{renderNode(children, registry, ctx)}</UICardAction>;
}


export function CardContent({ children }: ChildrenProps) {
    const { registry, ctx } = useRuntime();
    return <UICardContent>{renderNode(children, registry, ctx)}</UICardContent>;
}


export function CardFooter({ children }: ChildrenProps) {
    const { registry, ctx } = useRuntime();
    return <UICardFooter>{renderNode(children, registry, ctx)}</UICardFooter>;
}
