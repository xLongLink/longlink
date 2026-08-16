import { Stack } from '@astryxdesign/core/Stack';
import { Tab as AstryxTab, TabList as AstryxTabList } from '@astryxdesign/core/TabList';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveNavigationUrl } from '../core/url';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';

export function TabList({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const to = resolveXml(node.params, 'to', ctx);

            return {
                href: resolveNavigationUrl(services.navigationBaseUrl, typeof to === 'string' ? to : '') || undefined,
                label: requireXmlString(node.params, 'label', ctx, 'Tab'),
                nodes: node.children,
                value: requireXmlString(node.params, 'value', ctx, 'Tab'),
            };
        });

    // Tab navigation without options is not meaningful or accessible.
    if (tabs.length === 0) {
        throw new Error('TabList requires at least one Tab');
    }

    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? tabs[0].value));
    const label = resolveXml(props, 'label', ctx);
    const activeTab = tabs.find((tab) => tab.value === binding.value);

    return (
        <Stack gap={4}>
            <AstryxTabList
                aria-label={typeof label === 'string' ? label : 'Tabs'}
                onChange={binding.setValue}
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
