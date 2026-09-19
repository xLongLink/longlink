import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { ActionHandlerContext } from './Action';
import { useContext, type MouseEvent } from 'react';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { resolveAnchorUrl, resolveNavigationUrl } from '../core/url';

const linkPropsSchema = z.object({
    href: z.string().optional(),
    to: z.string().optional(),
});

export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Link requires child content');
    }

    const { href, to } = resolveXmlProps(props, ctx, linkPropsSchema);
    const actionHandler = useContext(ActionHandlerContext);

    // Solution navigation stays inside the SPA router, while resource links need full browser navigation.
    const navigationUrl = resolveNavigationUrl(services.navigationBaseUrl, to ?? '');
    const anchorUrl = navigationUrl ? '' : resolveAnchorUrl(services.requestBaseUrl, href ?? '');
    const controlUrl = navigationUrl || anchorUrl;

    /** Starts an Action only for ordinary primary clicks. */
    function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
        ) {
            return;
        }

        event.preventDefault();
        actionHandler?.();
    }

    return (
        <AstryxLink
            as={anchorUrl ? 'a' : undefined}
            href={controlUrl || undefined}
            onClick={actionHandler ? handleClick : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxLink>
    );
}
