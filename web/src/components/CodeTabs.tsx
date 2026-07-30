import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useState } from 'react';
import { CodeBlock } from '@/components/CodeBlock';

type CodeTabItem = {
    code: string;
    label: string;
    value: string;
};

/** Renders connected tabs for switching between equivalent code snippets. */
export function CodeTabs({ items }: { items: [CodeTabItem, ...CodeTabItem[]] }) {
    const [value, setValue] = useState(items[0].value);
    const selectedItem = items.find((item) => item.value === value) ?? items[0];

    return (
        <Stack gap={2} width="100%">
            <TabList aria-label="Code examples" value={selectedItem.value} onChange={setValue}>
                {items.map((item) => (
                    <Tab key={item.value} label={item.label} value={item.value} />
                ))}
            </TabList>
            <CodeBlock language="bash">{selectedItem.code}</CodeBlock>
        </Stack>
    );
}
