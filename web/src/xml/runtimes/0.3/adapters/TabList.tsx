import { Stack } from '@astryxdesign/core-0-3/Stack';
import { Tab as AstryxTab, TabList as AstryxTabList } from '@astryxdesign/core-0-3/TabList';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { SIZES, TAB_LAYOUTS } from '../constants';
import { useBindableValue } from '../core/binding';
import { resolveNavigationUrl } from '../core/url';
import { isVisibleXmlNode, isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/** Renders controlled Astryx tab navigation and its selected XML panel. */
export function TabList({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => ({
            href: (() => {
                const value = resolveXml(node.params, 'to', ctx);
                return (
                    resolveNavigationUrl(services.navigationBaseUrl, typeof value === 'string' ? value : '') ||
                    undefined
                );
            })(),
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
    const size = isXmlEnum(sizeValue, SIZES) ? sizeValue : 'md';
    const layout = isXmlEnum(layoutValue, TAB_LAYOUTS) ? layoutValue : 'hug';
    const labelValue = resolveXml(props, 'label', ctx);
    const label = typeof labelValue === 'string' ? labelValue : 'Tabs';
    const activeTab = tabs.find((tab) => tab.value === binding.value);

    return (
        <Stack gap={4}>
            <AstryxTabList
                aria-label={label}
                hasDivider={(() => {
                    const value = resolveXml(props, 'hasDivider', ctx);
                    return typeof value === 'boolean' ? value : undefined;
                })()}
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
