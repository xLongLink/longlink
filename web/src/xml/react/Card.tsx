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
import { evaluate, renderXml, useContext } from '@/xml';

export function Card({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const size = String(evaluate(rawProps.size ?? '', ctx) ?? 'default') as 'default' | 'sm';
    return <UICard size={size}>{renderXml(children)}</UICard>;
}

export function CardHeader({ props: _props, children }: XmlComponentProps) {
    return <UICardHeader>{renderXml(children)}</UICardHeader>;
}

export function CardTitle({ props: _props, children }: XmlComponentProps) {
    return <UICardTitle>{renderXml(children)}</UICardTitle>;
}

export function CardDescription({ props: _props, children }: XmlComponentProps) {
    return <UICardDescription>{renderXml(children)}</UICardDescription>;
}

export function CardAction({ props: _props, children }: XmlComponentProps) {
    return <UICardAction>{renderXml(children)}</UICardAction>;
}

export function CardContent({ props: _props, children }: XmlComponentProps) {
    return <UICardContent>{renderXml(children)}</UICardContent>;
}

export function CardFooter({ props: _props, children }: XmlComponentProps) {
    return <UICardFooter>{renderXml(children)}</UICardFooter>;
}
