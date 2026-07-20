import { useState } from 'react';
import { SideNav as AstryxSideNav, SideNavItem as AstryxSideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import type { ASTNode, ExecutionContext, Props } from '@/xml/types';
import { evaluate } from '@/xml/expressions';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { useBindableValue } from './binding';
import { requireXmlString, resolveXmlLabel, resolveXmlString } from './props';

type ResolvedSideNavItem = {
    icon?: string;
    label: string;
    nodes: ASTNode[];
    value: string;
};

/** Renders Astryx side navigation and the selected XML panel. */
export function SideNav({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const items = nodes
        .filter((node) => node.name === 'SideNavItem' && isVisibleNode(node, ctx))
        .map((node) => resolveSideNavItem(node, ctx));

    // Side navigation without destinations is not meaningful or accessible.
    if (items.length === 0) {
        throw new Error('SideNav requires at least one SideNavItem');
    }

    const binding = useBindableValue(props, 'value', ctx);
    const initialValue = String(binding.initialValue ?? items[0].value);
    const [localValue, setLocalValue] = useState(initialValue);
    const value = binding.bound ? String(binding.currentValue ?? items[0].value) : localValue;
    const label = resolveXmlString(props, 'label', ctx, 'Navigation');
    const activeItem = items.find((item) => item.value === value);

    /** Writes side navigation selection to bound or local state. */
    function setValue(nextValue: string) {
        if (binding.bound) binding.setValue(nextValue);
        else setLocalValue(nextValue);
    }

    return (
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <AstryxSideNav style={{ height: 'auto', width: '100%' }}>
                <SideNavSection title={label} isHeaderHidden>
                    {items.map((item) => (
                        <AstryxSideNavItem
                            icon={item.icon}
                            isSelected={item.value === value}
                            key={item.value}
                            label={item.label}
                            onClick={() => setValue(item.value)}
                        />
                    ))}
                </SideNavSection>
            </AstryxSideNav>
            <div className="min-w-0">{activeItem ? renderNode(activeItem.nodes, ctx) : null}</div>
        </div>
    );
}

/** Marks one side navigation definition consumed by its nearest SideNav. */
export function SideNavItem(): never {
    throw new Error('SideNavItem must be used inside SideNav');
}

/** Resolves a serializable XML side navigation definition. */
function resolveSideNavItem(node: ASTNode, ctx: ExecutionContext): ResolvedSideNavItem {
    const props = node.params ?? {};
    const value = requireXmlString(props, 'value', ctx, 'SideNavItem');
    const label = resolveXmlLabel(props, ctx, 'SideNavItem');
    const icon = resolveXmlString(props, 'icon', ctx) || undefined;

    return { icon, label, nodes: node.children ?? [], value };
}

/** Evaluates conditional rendering for an adapter-consumed side navigation item. */
function isVisibleNode(node: ASTNode, ctx: ExecutionContext): boolean {
    if (node.params?.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}
