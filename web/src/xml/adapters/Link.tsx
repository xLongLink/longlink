import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { resolveControlUrl } from '../core/url';
import { ActionHandlerContext } from './Action';
import { useContext, type MouseEvent } from 'react';
import { Link as AstryxLink } from '@astryxdesign/core/Link';

const linkPropsSchema = z.object({
    href: z.string().optional(),
    isDisabled: z.boolean().optional(),
    to: z.string().optional(),
});

export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Link requires child content');
    }

    const { href, isDisabled, to } = resolveXmlProps(
        props,
        ctx,
        { href: 'scalar', isDisabled: 'scalar', to: 'scalar' },
        linkPropsSchema
    );
    const actionHandler = useContext(ActionHandlerContext);
    const controlUrl = resolveControlUrl(services.navigationBaseUrl, services.requestBaseUrl, to ?? '', href ?? '');

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
            href={controlUrl || undefined}
            isDisabled={isDisabled}
            onClick={actionHandler ? handleClick : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxLink>
    );
}
