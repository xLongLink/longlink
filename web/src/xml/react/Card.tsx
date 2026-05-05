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
    const { ctx } = useRuntime();

    return <UICard size={size}>{renderNode(children, ctx)}</UICard>;
}

export function CardHeader({ children }: ChildrenProps) {
    const { ctx } = useRuntime();

    return <UICardHeader>{renderNode(children, ctx)}</UICardHeader>;
}

export function CardTitle({ children }: ChildrenProps) {
    const { ctx } = useRuntime();

    return <UICardTitle>{renderNode(children, ctx)}</UICardTitle>;
}

export function CardDescription({ children }: ChildrenProps) {
    const { ctx } = useRuntime();

    return <UICardDescription>{renderNode(children, ctx)}</UICardDescription>;
}

export function CardAction({ children }: ChildrenProps) {
    const { ctx } = useRuntime();
    return <UICardAction>{renderNode(children, ctx)}</UICardAction>;
}

export function CardContent({ children }: ChildrenProps) {
    const { ctx } = useRuntime();
    return <UICardContent>{renderNode(children, ctx)}</UICardContent>;
}

export function CardFooter({ children }: ChildrenProps) {
    const { ctx } = useRuntime();
    return <UICardFooter>{renderNode(children, ctx)}</UICardFooter>;
}
