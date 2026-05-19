import {
    Hero as HeroShell,
    HeroContent as HeroShellContent,
    HeroDescription as HeroShellDescription,
    HeroTitle as HeroShellTitle,
} from '@ui/hero';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Renders the hero shell. */
export function Hero({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
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
export function HeroTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <HeroShellTitle>{renderNode(children ?? [], ctx)}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <HeroShellDescription>{renderNode(children ?? [], ctx)}</HeroShellDescription>;
}

/** Renders the hero content slot. */
export function HeroContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <HeroShellContent>{renderNode(children ?? [], ctx)}</HeroShellContent>;
}
