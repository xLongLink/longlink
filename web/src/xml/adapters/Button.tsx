import { z } from 'zod';
import { useContext } from 'react';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { BUTTON_VARIANTS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { ActionHandlerContext } from './Action';
import { resolveNavigationUrl } from '../core/url';
import { Button as AstryxButton } from '@astryxdesign/core/Button';

const buttonPropsSchema = z.object({
    to: z.string().optional().catch(undefined),
    variant: z.enum(BUTTON_VARIANTS).optional(),
});

type ButtonProps = z.infer<typeof buttonPropsSchema>;

export function Button({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Button requires child content');
    }

    const { to, variant }: ButtonProps = resolveXmlProps(
        props,
        ctx,
        { to: 'scalar', variant: 'scalar' },
        buttonPropsSchema
    );
    const actionHandler = useContext(ActionHandlerContext);
    const navigationUrl = resolveNavigationUrl(services.navigationBaseUrl, to ?? '');

    return (
        <AstryxButton
            label=""
            variant={variant}
            clickAction={actionHandler ?? (navigationUrl ? () => services.navigate(navigationUrl) : undefined)}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
