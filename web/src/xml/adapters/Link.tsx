import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import { useXmlRuntime } from '../core/context';
import { ActionHandlerContext } from './Action';
import { useContext, type MouseEvent } from 'react';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { resolveAnchorUrl, resolveNavigationUrl } from '../core/url';

export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Link requires child content');
    }

    const href = resolveXml(props, 'href', ctx);
    const to = resolveXml(props, 'to', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const actionHandler = useContext(ActionHandlerContext);

    /** Starts an Action only for ordinary primary clicks. */
    function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
        if (
            !actionHandler ||
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
        actionHandler();
    }

    return (
        <AstryxLink
            href={
                resolveNavigationUrl(services.navigationBaseUrl, typeof to === 'string' ? to : '') ||
                resolveAnchorUrl(services.requestBaseUrl, typeof href === 'string' ? href : '') ||
                undefined
            }
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            onClick={actionHandler ? handleClick : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxLink>
    );
}
