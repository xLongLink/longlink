import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useApiError } from '@/lib/errors';
import { BUTTON_VARIANTS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { resolveNavigationUrl } from '@/lib/url';
import { useToast } from '@astryxdesign/core/Toast';
import { executeEffects, validateEffects } from './effects';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { resolveXmlProps, xmlNonblankStringSchema } from '../core/props';

const buttonPropsSchema = z.object({
    disabled: z.boolean().default(false),
    label: xmlNonblankStringSchema.optional(),
    to: z.string().optional(),
    variant: z.enum(BUTTON_VARIANTS).optional(),
});

export function Button({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const toast = useToast();
    const reportError = useApiError();

    const { disabled, label, to, variant } = resolveXmlProps(props, ctx, buttonPropsSchema, ['label']);
    if (label === undefined && nodes.length === 0) {
        throw new Error('Button requires a label or child content');
    }
    if (label !== undefined) {
        validateEffects(nodes, 'Button');
    } else if (nodes.some((node) => node.name === 'Request' || node.name === 'Patch' || node.name === 'Validate')) {
        throw new Error('Button effects require a label');
    }

    const navigationUrl = resolveNavigationUrl(services.navigationBaseUrl, to ?? '');

    /** Runs effects before navigation, reporting failures without navigating. */
    function handleClick(): void {
        void executeEffects(
            nodes,
            ctx,
            services,
            () => {
                const { to: destination } = resolveXmlProps(props, ctx, z.object({ to: z.string().optional() }));
                return resolveNavigationUrl(services.navigationBaseUrl, destination ?? '');
            },
            toast
        ).catch(reportError);
    }

    return (
        <AstryxButton
            label={label ?? ''}
            variant={variant}
            isDisabled={disabled}
            clickAction={
                label !== undefined ? handleClick : navigationUrl ? () => services.navigate(navigationUrl) : undefined
            }
        >
            {label === undefined ? renderNode(nodes, ctx) : null}
        </AstryxButton>
    );
}
