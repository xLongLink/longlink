import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useApiError } from '@/lib/errors';
import { useXmlRuntime } from '../core/context';
import { useToast } from '@astryxdesign/core/Toast';
import { executeEffects, validateEffects } from './effects';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';
import { resolveAnchorUrl, resolveControlUrl, resolveNavigationUrl } from '@/lib/url';

const linkPropsSchema = z.object({
    href: z.string().optional(),
    label: xmlNonblankStringSchema.optional(),
    to: z.string().optional(),
});

export function Link({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const toast = useToast();
    const reportError = useApiError();

    const { href, label, to } = resolveXmlProps(props, ctx, linkPropsSchema, ['label']);
    if (label === undefined && nodes.length === 0) {
        throw new Error('Link requires a label or child content');
    }
    if (label !== undefined) {
        validateEffects(nodes, 'Link');
    } else if (nodes.some((node) => node.name === 'Request' || node.name === 'Patch' || node.name === 'Validate')) {
        throw new Error('Link effects require a label');
    }
    const hasEffects = nodes.length > 0 && label !== undefined;

    // Solution navigation stays inside the SPA router, while resource links need full browser navigation.
    const navigationUrl = resolveNavigationUrl(services.navigationBaseUrl, to ?? '');
    const anchorUrl = navigationUrl ? '' : resolveAnchorUrl(services.requestBaseUrl, href ?? '');
    const controlUrl = navigationUrl || anchorUrl;

    /** Runs effects before navigating for Links with declared effects. */
    function handleClick(): void {
        void executeEffects(
            nodes,
            ctx,
            services,
            () => {
                const destination = resolveXmlProps(props, ctx, linkPropsSchema);
                return resolveControlUrl(
                    services.navigationBaseUrl,
                    services.requestBaseUrl,
                    destination.to ?? '',
                    destination.href ?? ''
                );
            },
            toast
        ).catch(reportError);
    }

    return (
        <AstryxLink
            as={anchorUrl && !hasEffects ? 'a' : undefined}
            href={hasEffects ? undefined : controlUrl || undefined}
            onClick={hasEffects ? handleClick : undefined}
        >
            {label ?? renderNode(nodes, ctx)}
        </AstryxLink>
    );
}
