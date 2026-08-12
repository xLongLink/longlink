import { Stack } from '@astryxdesign/core-0-3/Stack';
import { Tab as AstryxTab, TabList as AstryxTabList } from '@astryxdesign/core-0-3/TabList';
import { useState } from 'react';
import { setXmlBinding, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    isVisibleXmlNode,
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlString,
} from '../core/props';
import { resolveNavigationUrl } from '../core/url';
import type { ASTNode, Props, RuntimeServices, Scope } from '../types';

/** Renders controlled Astryx tab navigation and its selected XML panel. */
export function TabList({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => resolveTab(node, ctx, services));

    // Tab navigation without options is not meaningful or accessible.
    if (tabs.length === 0) {
        throw new Error('TabList requires at least one Tab');
    }

    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState(String(binding.initialValue ?? tabs[0].value));
    const value = binding.bound ? String(binding.currentValue ?? tabs[0].value) : localValue;
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'TabList');
    const layout = resolveXmlEnum(props, 'layout', ctx, ['hug', 'fill'], 'hug', 'TabList');
    const label = resolveXmlString(props, 'label', ctx, 'Tabs');
    const activeTab = tabs.find((tab) => tab.value === value);

    return (
        <Stack gap={4}>
            <AstryxTabList
                aria-label={label}
                hasDivider={resolveXmlBoolean(props, 'hasDivider', ctx, false)}
                layout={layout}
                onChange={(nextValue) => {
                    setXmlBinding(binding, setLocalValue, nextValue);
                }}
                size={size}
                value={value}
            >
                {tabs.map((tab) => (
                    <AstryxTab href={tab.href} key={tab.value} label={tab.label} value={tab.value} />
                ))}
            </AstryxTabList>
            {activeTab && renderNode(activeTab.nodes, ctx)}
        </Stack>
    );
}

/** Marks one tab definition consumed by its nearest TabList. */
export function Tab(): never {
    throw new Error('Tab must be used inside TabList');
}

/** Resolves a serializable XML tab definition. */
function resolveTab(node: ASTNode, ctx: Scope, services: RuntimeServices) {
    const props = node.params ?? {};
    const value = requireXmlString(props, 'value', ctx, 'Tab');
    const label = resolveXmlLabel(props, ctx, services, 'Tab');
    const href = resolveNavigationUrl(services.navigationBaseUrl, resolveXmlString(props, 'to', ctx)) || undefined;

    return { href, label, nodes: node.children, value };
}
