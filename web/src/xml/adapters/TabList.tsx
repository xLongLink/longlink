import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';
import { Tab as ApplicationTab, Tabs as ApplicationTabs } from '@/components/ui/Tabs';

export function Tabs({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => ({
            label: requireXmlString(node.params, 'label', ctx, 'Tab'),
            nodes: node.children,
            value: requireXmlString(node.params, 'value', ctx, 'Tab'),
        }));

    // Tab navigation without options is not meaningful or accessible.
    if (tabs.length === 0) {
        throw new Error('Tabs requires at least one Tab');
    }

    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? tabs[0].value));

    return (
        <ApplicationTabs onChange={binding.setValue} value={binding.value}>
            {tabs.map((tab) => (
                <ApplicationTab key={tab.value} label={tab.label} value={tab.value}>
                    {renderNode(tab.nodes, ctx)}
                </ApplicationTab>
            ))}
        </ApplicationTabs>
    );
}
