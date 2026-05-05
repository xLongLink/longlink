import {
    Card as UICard,
    CardAction as UICardAction,
    CardContent as UICardContent,
    CardDescription as UICardDescription,
    CardFooter as UICardFooter,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
} from '@/ui/card';
import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';

export function Card({ props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICard size={(props.size as 'default' | 'sm') ?? 'default'}>{renderNode(children, context.ctx)}</UICard>;
}

export function CardHeader({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICardHeader>{renderNode(children, context.ctx)}</UICardHeader>;
}

export function CardTitle({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICardTitle>{renderNode(children, context.ctx)}</UICardTitle>;
}

export function CardDescription({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICardDescription>{renderNode(children, context.ctx)}</UICardDescription>;
}

export function CardAction({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICardAction>{renderNode(children, context.ctx)}</UICardAction>;
}

export function CardContent({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICardContent>{renderNode(children, context.ctx)}</UICardContent>;
}

export function CardFooter({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UICardFooter>{renderNode(children, context.ctx)}</UICardFooter>;
}
