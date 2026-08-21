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
    href: z.string().optional().catch(undefined),
    isDisabled: z.boolean().optional().catch(undefined),
    to: z.string().optional().catch(undefined),
});

type LinkProps = z.infer<typeof linkPropsSchema>;

export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Link requires child content');
    }

    const { href, isDisabled, to }: LinkProps = resolveXmlProps(
        props,
        ctx,
        { href: 'scalar', isDisabled: 'scalar', to: 'scalar' },
        linkPropsSchema
    );
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
                resolveNavigationUrl(services.navigationBaseUrl, to ?? '') ||
                resolveAnchorUrl(services.requestBaseUrl, href ?? '') ||
                undefined
            }
            isDisabled={isDisabled}
            onClick={actionHandler ? handleClick : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxLink>
    );
}
