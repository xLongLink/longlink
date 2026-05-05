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
import { renderXml, useProps } from '@/xml';

export function Card({ props: rawProps, children }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    return <UICard size={(props.size as 'default' | 'sm') ?? 'default'}>{renderXml(children)}</UICard>;
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
