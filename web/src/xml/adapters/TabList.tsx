import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Tab as SolutionTab, Tabs as SolutionTabs } from '@/components/ui/Tabs';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';

const tabsPropsSchema = z.object({ gap: xmlSpacingSchema.optional() });
const tabPropsSchema = z.object({ label: xmlNonblankStringSchema, value: xmlNonblankStringSchema });

export function Tabs({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const { label, value } = resolveXmlProps(node.params, ctx, { label: 'raw', value: 'raw' }, tabPropsSchema);

            return { label, nodes: node.children, value };
        });

    // Tab navigation without options is not meaningful or accessible.
    if (tabs.length === 0) {
        throw new Error('Tabs requires at least one Tab');
    }

    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? tabs[0].value));
    const { gap } = resolveXmlProps(props, ctx, { gap: 'scalar' }, tabsPropsSchema);

    return (
        <SolutionTabs gap={gap} onChange={binding.setValue} value={binding.value}>
            {tabs.map((tab) => (
                <SolutionTab key={tab.value} label={tab.label} value={tab.value}>
                    {renderNode(tab.nodes, ctx)}
                </SolutionTab>
            ))}
        </SolutionTabs>
    );
}
