import {
    Hero as HeroShell,
    HeroDescription as HeroShellDescription,
    HeroTitle as HeroShellTitle,
} from '@ui/hero';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';

/** Renders the hero shell. */
export function Hero({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const icon = resolveXmlString(props, 'icon', ctx);
    const heroNodes = nodes;
    const action = heroNodes.filter((node) => node.name === 'HeroAction');
    const body = heroNodes.filter((node) => node.name !== 'HeroAction');

    return (
        <HeroShell icon={icon}>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <div className="min-w-0 flex-1">{renderNode(body, ctx)}</div>
                {action.length ? renderNode(action, ctx) : null}
            </div>
        </HeroShell>
    );
}

/** Renders the hero title slot. */
export function HeroTitle({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <HeroShellTitle>{renderNode(nodes, ctx)}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <HeroShellDescription>{renderNode(nodes, ctx)}</HeroShellDescription>;
}

/** Renders the hero action slot. */
export function HeroAction({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <div data-slot="hero-action" className="flex shrink-0 items-center gap-3">{renderNode(nodes, ctx)}</div>;
}
