import {
    Hero as HeroShell,
    HeroContent as HeroShellContent,
    HeroDescription as HeroShellDescription,
    HeroTitle as HeroShellTitle,
} from '@ui/hero';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Hero component. */
export interface HeroProps extends Props {}

/** Props accepted by the XML HeroTitle component. */
export interface HeroTitleProps extends Props {}

/** Props accepted by the XML HeroDescription component. */
export interface HeroDescriptionProps extends Props {}

/** Props accepted by the XML HeroContent component. */
export interface HeroContentProps extends Props {}

/** Renders the hero shell. */
export function Hero({ props, nodes }: HeroProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const icon = resolveXmlString(props, 'icon', ctx);
    const children = nodes;
    const heroNodes = Array.isArray(children) ? children : children ? [children] : [];
    const content = heroNodes.filter((node) => node.name === 'HeroContent');
    const body = heroNodes.filter((node) => node.name !== 'HeroContent');

    return (
        <HeroShell icon={icon}>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                <div className="min-w-0 flex-1">{renderNode(body, ctx)}</div>
                {content.length ? <div>{renderNode(content, ctx)}</div> : null}
            </div>
        </HeroShell>
    );
}

/** Renders the hero title slot. */
export function HeroTitle({ props, nodes }: HeroTitleProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <HeroShellTitle>{renderNode(children ?? [], ctx)}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ props, nodes }: HeroDescriptionProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <HeroShellDescription>{renderNode(children ?? [], ctx)}</HeroShellDescription>;
}

/** Renders the hero content slot. */
export function HeroContent({ props, nodes }: HeroContentProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <HeroShellContent>{renderNode(children ?? [], ctx)}</HeroShellContent>;
}
