import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { useBindableValue } from '../core/binding';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';

const tabsPropsSchema = z.object({ gap: xmlSpacingSchema.default(3) });
const tabPropsSchema = z.object({ label: xmlNonblankStringSchema, value: xmlNonblankStringSchema });

/** Renders controlled XML tabs and prepares all visible panels before selection. */
export function Tabs({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const tabs = nodes
        .filter((node) => node.name === 'Tab' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const { label, value } = resolveXmlProps(node.params, ctx, tabPropsSchema, ['label', 'value']);

            return { label, nodes: node.children, value };
        });

    // Tab navigation without options is not meaningful or accessible.
    if (tabs.length === 0) {
        throw new Error('Tabs requires at least one Tab');
    }

    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? tabs[0].value));
    const { gap } = resolveXmlProps(props, ctx, tabsPropsSchema);

    // Prepare every visible panel so errors in unselected content still surface.
    const panels = tabs.map((tab) => ({ ...tab, content: renderNode(tab.nodes, ctx) }));
    const activeTab = panels.find((tab) => tab.value === binding.value) ?? panels[0];

    return (
        <Stack gap={gap}>
            <TabList onChange={binding.setValue} value={activeTab.value}>
                {tabs.map((tab) => (
                    <Tab key={tab.label} label={tab.label} value={tab.value} />
                ))}
            </TabList>
            <Stack gap={gap}>{activeTab.content}</Stack>
        </Stack>
    );
}
