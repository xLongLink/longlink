import {
    Hero as HeroShell,
    HeroDescription as HeroShellDescription,
    HeroTitle as HeroShellTitle,
} from '@/components/ui/hero';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';
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
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <HeroShellTitle>{text}</HeroShellTitle>;
}

/** Renders the hero description slot. */
export function HeroDescription({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const text = props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <HeroShellDescription>{text}</HeroShellDescription>;
}

/** Renders the hero action slot. */
export function HeroAction({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <div data-slot="hero-action" className="flex shrink-0 items-center gap-3">
            {renderNode(nodes, ctx)}
        </div>
    );
}
