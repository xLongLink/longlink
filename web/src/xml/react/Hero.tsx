import {
    Hero as HeroShell,
    HeroContent as HeroShellContent,
    HeroDescription as HeroShellDescription,
    HeroTitle as HeroShellTitle,
} from '@ui/hero';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Hero component. */
export interface HeroProps {
    icon?: string;
    children?: ASTNode[];
}

/** Props accepted by the XML HeroTitle component. */
export interface HeroTitleProps {
    children?: ASTNode[];
}

/** Props accepted by the XML HeroDescription component. */
export interface HeroDescriptionProps {
    children?: ASTNode[];
}

/** Props accepted by the XML HeroContent component. */
export interface HeroContentProps {
    children?: ASTNode[];
}

/** Renders the hero shell. */
export function Hero({ icon, children }: HeroProps) {
    const { ctx } = useXmlContext();
    const nodes = Array.isArray(children) ? children : children ? [children] : [];
    const content = nodes.filter((node) => node.name === 'HeroContent');
    const body = nodes.filter((node) => node.name !== 'HeroContent');

    return (
        <HeroShell icon={icon}>
            <div>
                <div>{renderNode(body, ctx)}</div>
                {content.length ? <div>{renderNode(content, ctx)}</div> : null}
            </div>
        </HeroShell>
    );
}

/** Renders the hero title slot. */
export function HeroTitle({ children }: HeroTitleProps) {
    const { ctx } = useXmlContext();

    return <HeroShellTitle>{renderNode(children ?? [], ctx)}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ children }: HeroDescriptionProps) {
    const { ctx } = useXmlContext();

    return <HeroShellDescription>{renderNode(children ?? [], ctx)}</HeroShellDescription>;
}

/** Renders the hero content slot. */
export function HeroContent({ children }: HeroContentProps) {
    const { ctx } = useXmlContext();

    return <HeroShellContent>{renderNode(children ?? [], ctx)}</HeroShellContent>;
}
