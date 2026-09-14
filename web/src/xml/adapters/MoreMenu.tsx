import type { Props } from '../types';
import { createElement } from 'react';
import { resolveOptions } from './options';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { stoneIconComponents } from '@/components/ui/Icon';
import { MoreMenu as AstryxMoreMenu } from '@astryxdesign/core/MoreMenu';

/** Renders a three-dot overflow menu from XML options. */
export function MoreMenu({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => value);

    return (
        <AstryxMoreMenu
            alignment="end"
            items={resolveOptions(nodes, ctx, true).map(({ icon, label, value }, index) => ({
                icon: icon ? createElement(stoneIconComponents[icon], { 'aria-hidden': true, size: '1em' }) : undefined,
                id: String(index),
                label,
                onClick: () => binding.setValue(value),
            }))}
        />
    );
}
