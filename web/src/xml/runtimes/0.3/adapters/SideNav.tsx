import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection,
} from '@astryxdesign/core-0-3/SideNav';
import { renderIcon } from '@/lib/icons';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';

/**
 * checked: false
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
            icon: resolveXml(node.params, 'icon', ctx),
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
                    {items.map((item) => {
                        const icon =
                            typeof item.icon === 'string'
                                ? renderIcon(item.icon, { 'aria-hidden': true, size: 16 })
                                : undefined;

                        return (
                            <AstryxSideNavItem
                                icon={icon}
                                isSelected={item.value === binding.value}
                                key={item.value}
                                label={item.label}
                                onClick={() => binding.setValue(item.value)}
                            />
                        );
                    })}
                </SideNavSection>
            </AstryxSideNav>
            <div className="min-w-0">{activeItem && renderNode(activeItem.nodes, ctx)}</div>
        </div>
    );
}

/**
 * checked: false
 * https://astryx.atmeta.com/components/SideNavItem?tab=properties
 * - label: string
 * - value: string
 * - icon: string
 * - children: ReactNode
 */
export function SideNavItem(): never {
    throw new Error('SideNavItem must be used inside SideNav');
}
