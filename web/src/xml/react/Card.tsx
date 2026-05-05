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
import { renderNode, useContext } from '@/xml';

type BaseProps = {
    children?: RenderableASTNode;
};

type CardProps = BaseProps & { size?: 'default' | 'sm' };
type ChildrenProps = BaseProps;

export function Card({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICard size={(props.size as 'default' | 'sm') ?? 'default'}>{renderNode(children, context.ctx)}</UICard>;
}

export function CardHeader({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICardHeader>{renderNode(children, context.ctx)}</UICardHeader>;
}

export function CardTitle({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICardTitle>{renderNode(children, context.ctx)}</UICardTitle>;
}

export function CardDescription({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICardDescription>{renderNode(children, context.ctx)}</UICardDescription>;
}

export function CardAction({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICardAction>{renderNode(children, context.ctx)}</UICardAction>;
}

export function CardContent({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICardContent>{renderNode(children, context.ctx)}</UICardContent>;
}

export function CardFooter({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UICardFooter>{renderNode(children, context.ctx)}</UICardFooter>;
}
