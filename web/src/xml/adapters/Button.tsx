import { useContext } from 'react';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { BUTTON_VARIANTS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { ActionHandlerContext } from './Action';
import { resolveNavigationUrl } from '../core/url';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { isXmlEnum, resolveXml } from '../core/props';

export function Button({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    if (nodes.length === 0) {
        throw new Error('Button requires child content');
    }

    const label = nodes
        .filter((node) => node.name === '$text')
        .map((node) => resolveXml(node.params, 'value', ctx))
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    const variant = resolveXml(props, 'variant', ctx);
    const to = resolveXml(props, 'to', ctx);
    const actionHandler = useContext(ActionHandlerContext);
    const navigationUrl = resolveNavigationUrl(services.navigationBaseUrl, typeof to === 'string' ? to : '');

    if (!isXmlEnum(variant, [undefined, ...BUTTON_VARIANTS])) {
        throw new Error(`Unsupported Button variant '${String(variant)}'`);
    }

    return (
        <AstryxButton
            label={label}
            variant={variant}
            clickAction={actionHandler ?? (navigationUrl ? () => services.navigate(navigationUrl) : undefined)}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
