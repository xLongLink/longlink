import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection,
} from '@astryxdesign/core-0-3/SideNav';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/SideNav?tab=properties
 * - label: string
 * - value: string
 * - children: SideNavItem
 */
export function SideNav({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const items = nodes
        .filter((node) => node.name === 'SideNavItem' && isVisibleXmlNode(node, ctx))
        .map((node) => ({
            label: requireXmlString(node.params, 'label', ctx, 'SideNavItem'),
            nodes: node.children,
            value: requireXmlString(node.params, 'value', ctx, 'SideNavItem'),
        }));

    // Side navigation without destinations is not meaningful or accessible.
    if (items.length === 0) {
        throw new Error('SideNav requires at least one SideNavItem');
    }

    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? items[0].value));
    const labelValue = resolveXml(props, 'label', ctx);
    const label = typeof labelValue === 'string' ? labelValue : 'Navigation';
    const activeItem = items.find((item) => item.value === binding.value);

    return (
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <AstryxSideNav className="h-auto w-full">
                <SideNavSection title={label} isHeaderHidden>
                    {items.map((item) => (
                        <AstryxSideNavItem
                            isSelected={item.value === binding.value}
                            key={item.value}
                            label={item.label}
                            onClick={() => binding.setValue(item.value)}
                        />
                    ))}
                </SideNavSection>
            </AstryxSideNav>
            <div className="min-w-0">{activeItem && renderNode(activeItem.nodes, ctx)}</div>
        </div>
    );
}

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/SideNavItem?tab=properties
 * - label: string
 * - value: string
 * - children: ReactNode
 */
export function SideNavItem(): never {
    throw new Error('SideNavItem must be used inside SideNav');
}
