import {
    Hero as HeroShell,
    HeroContent as HeroShellContent,
    HeroDescription as HeroShellDescription,
    HeroTitle as HeroShellTitle,
} from '@ui/hero';
import type { ASTNode } from '@xml';
import { renderNode, useContext } from '@xml';

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
    const { ctx } = useContext();

    return <HeroShell icon={icon}>{renderNode(children ?? null, ctx)}</HeroShell>;
}

/** Renders the hero title slot. */
export function HeroTitle({ children }: HeroTitleProps) {
    const { ctx } = useContext();

    return <HeroShellTitle>{renderNode(children ?? null, ctx)}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ children }: HeroDescriptionProps) {
    const { ctx } = useContext();

    return <HeroShellDescription>{renderNode(children ?? null, ctx)}</HeroShellDescription>;
}

/** Renders the hero content slot. */
export function HeroContent({ children }: HeroContentProps) {
    const { ctx } = useContext();

    return <HeroShellContent>{renderNode(children ?? null, ctx)}</HeroShellContent>;
}
