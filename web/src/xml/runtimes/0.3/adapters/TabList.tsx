import { Stack } from '@astryxdesign/core-0-3/Stack';
import { Tab as AstryxTab, TabList as AstryxTabList } from '@astryxdesign/core-0-3/TabList';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlBoolean, isXmlEnum, isXmlString, isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';
import { resolveNavigationUrl } from '../core/url';
import type { Props } from '../types';

/** Renders controlled Astryx tab navigation and its selected XML panel. */
export function TabList({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => ({
            href: (() => { const value = resolveXml(node.params, 'to', ctx); return resolveNavigationUrl(services.navigationBaseUrl, isXmlString(value) ? value : '') || undefined; })(),
            label: requireXmlString(node.params, 'label', ctx, 'Tab'),
            nodes: node.children,
            value: requireXmlString(node.params, 'value', ctx, 'Tab'),
        }));

    // Tab navigation without options is not meaningful or accessible.
    if (tabs.length === 0) {
        throw new Error('TabList requires at least one Tab');
    }

    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? tabs[0].value));
    const sizeValue = resolveXml(props, 'size', ctx);
    const layoutValue = resolveXml(props, 'layout', ctx);
    const size = isXmlEnum(sizeValue, ['sm', 'md', 'lg']) ? sizeValue : 'md';
    const layout = isXmlEnum(layoutValue, ['hug', 'fill']) ? layoutValue : 'hug';
    const labelValue = resolveXml(props, 'label', ctx);
    const label = isXmlString(labelValue) ? labelValue : 'Tabs';
    const activeTab = tabs.find((tab) => tab.value === binding.value);

    return (
        <Stack gap={4}>
            <AstryxTabList
                aria-label={label}
                hasDivider={(() => { const value = resolveXml(props, 'hasDivider', ctx); return isXmlBoolean(value) ? value : undefined; })()}
                layout={layout}
                onChange={binding.setValue}
                size={size}
                value={binding.value}
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
