import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@/ui/card';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentProps, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

export function Card({ children, ...props }: BaseProps & { className?: string; size?: 'default' | 'sm' }) {
    const { registry, ctx } = useRuntime();

    return <UICard {...props}>{renderNode(children as any, registry, ctx)}</UICard>;
}

export function CardHeader({ children, ...props }: BaseProps & ComponentProps<typeof UICardHeader>) {
    const { registry, ctx } = useRuntime();

    return <UICardHeader {...props}>{renderNode(children as any, registry, ctx)}</UICardHeader>;
}

export function CardTitle({ children, ...props }: BaseProps & ComponentProps<typeof UICardTitle>) {
    const { registry, ctx } = useRuntime();

    return <UICardTitle {...props}>{renderNode(children as any, registry, ctx)}</UICardTitle>;
}

export function CardDescription({ children, ...props }: BaseProps & ComponentProps<typeof UICardDescription>) {
    const { registry, ctx } = useRuntime();

    return <UICardDescription {...props}>{renderNode(children as any, registry, ctx)}</UICardDescription>;
}

export function CardAction({ children, ...props }: BaseProps & ComponentProps<typeof UICardAction>) {
    const { registry, ctx } = useRuntime();
    return <UICardAction {...props}>{renderNode(children as any, registry, ctx)}</UICardAction>;
}

export function CardContent({ children, ...props }: BaseProps & ComponentProps<typeof UICardContent>) {
    const { registry, ctx } = useRuntime();
    return <UICardContent {...props}>{renderNode(children as any, registry, ctx)}</UICardContent>;
}

export function CardFooter({ children, ...props }: BaseProps & ComponentProps<typeof UICardFooter>) {
    const { registry, ctx } = useRuntime();
    return <UICardFooter {...props}>{renderNode(children as any, registry, ctx)}</UICardFooter>;
}

export default Card;
