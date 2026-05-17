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
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML HeroTitle component. */
export interface HeroTitleProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML HeroDescription component. */
export interface HeroDescriptionProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Props accepted by the XML HeroContent component. */
export interface HeroContentProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Renders the hero shell. */
export function Hero({ icon, children }: HeroProps) {
    const { ctx } = useXmlContext();
    const nodes = Array.isArray(children) ? children : children ? [children] : [];
    const content = nodes.filter((node) => node.name === 'HeroContent');
    const body = nodes.filter((node) => node.name !== 'HeroContent');

    return (
        <HeroShell icon={icon} className="items-center">
            <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">{renderNode(body, ctx)}</div>
                {content.length ? <div className="shrink-0">{renderNode(content, ctx)}</div> : null}
            </div>
        </HeroShell>
    );
}

/** Renders the hero title slot. */
export function HeroTitle({ children }: HeroTitleProps) {
    const { ctx } = useXmlContext();

    return <HeroShellTitle>{renderNode(children ?? null, ctx)}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ children }: HeroDescriptionProps) {
    const { ctx } = useXmlContext();

    return <HeroShellDescription>{renderNode(children ?? null, ctx)}</HeroShellDescription>;
}

/** Renders the hero content slot. */
export function HeroContent({ children }: HeroContentProps) {
    const { ctx } = useXmlContext();

    return <HeroShellContent className="mt-0 w-auto">{renderNode(children ?? null, ctx)}</HeroShellContent>;
}
